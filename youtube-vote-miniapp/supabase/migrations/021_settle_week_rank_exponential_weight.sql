-- ============================================================
-- Migration 021: 정산 투표자 추첨 가중치에 "순위 지수 감쇠" 반영
--
-- 목표:
-- - 순위가 높을수록 당첨 확률이 높고,
-- - 순위가 낮아질수록 가중치가 기하급수적으로 감소하도록 적용.
--
-- 방식:
-- - 주차 내 아이디어를 기존 tie-break 규칙으로 랭킹화
-- - 각 투표의 유효 가중치 = weighted_share * POWER(decay_base, rank-1)
-- - decay_base 기본값: 0.5 (1위 1.0, 2위 0.5, 3위 0.25, ...)
-- ============================================================

CREATE OR REPLACE FUNCTION public._weighted_pick_voter_for_week_ranked(
  p_week_id uuid,
  p_exclude uuid,
  p_decay_base numeric DEFAULT 0.5
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_total numeric;
  v_r     numeric;
  v_cum   numeric := 0;
  rec     RECORD;
BEGIN
  IF p_week_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_decay_base IS NULL OR p_decay_base <= 0 OR p_decay_base > 1 THEN
    p_decay_base := 0.5;
  END IF;

  WITH ranked AS (
    SELECT
      i.id AS idea_id,
      ROW_NUMBER() OVER (
        ORDER BY i.total_weighted_shares DESC,
                 i.total_vote_count DESC,
                 i.created_at ASC
      ) AS rnk
    FROM public.ideas i
    WHERE i.week_id = p_week_id
  ),
  user_weights AS (
    SELECT
      v.user_id,
      SUM(v.weighted_share::numeric * POWER(p_decay_base, (r.rnk - 1)::numeric)) AS w
    FROM public.votes v
    JOIN ranked r ON r.idea_id = v.idea_id
    WHERE (p_exclude IS NULL OR v.user_id <> p_exclude)
    GROUP BY v.user_id
  )
  SELECT COALESCE(SUM(uw.w), 0)
    INTO v_total
  FROM user_weights uw;

  IF v_total IS NULL OR v_total <= 0 THEN
    RETURN NULL;
  END IF;

  v_r := random() * v_total;

  FOR rec IN
    WITH ranked AS (
      SELECT
        i.id AS idea_id,
        ROW_NUMBER() OVER (
          ORDER BY i.total_weighted_shares DESC,
                   i.total_vote_count DESC,
                   i.created_at ASC
        ) AS rnk
      FROM public.ideas i
      WHERE i.week_id = p_week_id
    )
    SELECT
      v.user_id,
      SUM(v.weighted_share::numeric * POWER(p_decay_base, (r.rnk - 1)::numeric)) AS w
    FROM public.votes v
    JOIN ranked r ON r.idea_id = v.idea_id
    WHERE (p_exclude IS NULL OR v.user_id <> p_exclude)
    GROUP BY v.user_id
    ORDER BY v.user_id
  LOOP
    v_cum := v_cum + rec.w;
    IF v_cum >= v_r THEN
      RETURN rec.user_id;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._weighted_pick_voter_for_week_ranked(uuid, uuid, numeric) FROM PUBLIC;

COMMENT ON FUNCTION public._weighted_pick_voter_for_week_ranked IS
  '내부용: 주차 전체 투표자를 아이디어 순위 지수 감쇠(기본 0.5^(rank-1))로 가중 추첨';

CREATE OR REPLACE FUNCTION public.settle_week(p_week_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week          RECORD;
  v_winner        RECORD;
  v_exists        boolean;
  v_pool          bigint;
  v_creator       bigint;
  v_voter_each    bigint;
  v_v1            uuid;
  v_v2            uuid;
  v_ranking       jsonb;
  v_result_id     uuid;
BEGIN
  IF p_week_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'NULL_WEEK_ID');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.weekly_results wr WHERE wr.week_id = p_week_id
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'ALREADY_SETTLED', 'week_id', p_week_id);
  END IF;

  SELECT * INTO v_week
    FROM public.weeks w
   WHERE w.id = p_week_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'WEEK_NOT_FOUND');
  END IF;

  IF v_week.status NOT IN ('fever', 'closed') THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'INVALID_WEEK_STATUS',
      'status', v_week.status
    );
  END IF;

  SELECT
    i.id,
    i.creator_id,
    i.title,
    i.total_weighted_shares,
    i.total_vote_count
    INTO v_winner
    FROM public.ideas i
   WHERE i.week_id = p_week_id
   ORDER BY i.total_weighted_shares DESC,
            i.total_vote_count DESC,
            i.created_at ASC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'NO_IDEAS_IN_WEEK');
  END IF;

  v_pool := COALESCE(v_week.prize_pool, 0);
  v_creator := FLOOR(v_pool * 0.6)::bigint;
  v_voter_each := FLOOR(v_pool * 0.2)::bigint;

  -- 주차 전체 투표자 대상: 아이디어 순위가 높을수록 확률 우대, 하위로 갈수록 지수 감쇠
  v_v1 := public._weighted_pick_voter_for_week_ranked(p_week_id, NULL, 0.5);
  v_v2 := public._weighted_pick_voter_for_week_ranked(p_week_id, v_v1, 0.5);

  WITH ranked AS (
    SELECT ROW_NUMBER() OVER (
             ORDER BY i.total_weighted_shares DESC,
                      i.total_vote_count DESC,
                      i.created_at ASC
           ) AS rnk,
           i.id AS idea_id,
           i.title,
           i.total_weighted_shares,
           i.total_vote_count
      FROM public.ideas i
     WHERE i.week_id = p_week_id
  )
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'rank', ranked.rnk,
               'idea_id', ranked.idea_id,
               'title', ranked.title,
               'total_weighted_shares', ranked.total_weighted_shares,
               'total_vote_count', ranked.total_vote_count
             )
             ORDER BY ranked.rnk
           ),
           '[]'::jsonb
         )
    INTO v_ranking
    FROM ranked
   WHERE ranked.rnk <= 10;

  INSERT INTO public.weekly_results (
    week_id,
    winner_idea_id,
    creator_id,
    creator_prize,
    voter_winner_1_id,
    voter_winner_2_id,
    voter_prize_each,
    full_ranking,
    settled_at
  ) VALUES (
    p_week_id,
    v_winner.id,
    v_winner.creator_id,
    v_creator,
    v_v1,
    v_v2,
    v_voter_each,
    v_ranking,
    NOW()
  )
  RETURNING id INTO v_result_id;

  UPDATE public.weeks
     SET status = 'settled'
   WHERE id = p_week_id;

  RETURN jsonb_build_object(
    'applied', true,
    'week_id', p_week_id,
    'weekly_result_id', v_result_id,
    'winner_idea_id', v_winner.id,
    'creator_prize', v_creator,
    'voter_prize_each', v_voter_each,
    'voter_winner_1_id', v_v1,
    'voter_winner_2_id', v_v2,
    'voter_rank_decay_base', 0.5
  );
END;
$$;

COMMENT ON FUNCTION public.settle_week IS
  '주간 정산: 1위 아이디어·상금(60/20/20)·투표자 2명 추첨(주차 랭킹 지수 감쇠 가중)·full_ranking JSON. '
  'weeks.status → settled. 토스 실지급은 별도 Edge에서 실행 권장.';
