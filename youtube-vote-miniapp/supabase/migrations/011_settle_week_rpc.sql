-- ============================================================
-- Migration 011: 주간 정산 RPC (weekly_results + weeks.status = settled)
-- 상금 비율: 창작자 60%, 투표 당첨 2인 각 20% (prize_pool 기준, 내림)
-- 토스 프로모션 실지급은 이 RPC 밖(Edge 등)에서 처리.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_results_week_id_unique
  ON public.weekly_results(week_id);

-- 가중치 추첨 1명 (동일 idea에 대한 투표는 user_id 기준 합산)
CREATE OR REPLACE FUNCTION public._weighted_pick_voter_for_idea(
  p_idea_id uuid,
  p_exclude uuid
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
  SELECT COALESCE(SUM(ws), 0)
    INTO v_total
    FROM (
      SELECT SUM(v.weighted_share)::numeric AS ws
        FROM public.votes v
       WHERE v.idea_id = p_idea_id
         AND (p_exclude IS NULL OR v.user_id <> p_exclude)
       GROUP BY v.user_id
    ) s;

  IF v_total IS NULL OR v_total <= 0 THEN
    RETURN NULL;
  END IF;

  v_r := random() * v_total;

  FOR rec IN
    SELECT user_id, SUM(weight)::numeric AS w
      FROM (
        SELECT v.user_id, v.weighted_share::numeric AS weight
          FROM public.votes v
         WHERE v.idea_id = p_idea_id
           AND (p_exclude IS NULL OR v.user_id <> p_exclude)
      ) x
     GROUP BY user_id
     ORDER BY user_id
  LOOP
    v_cum := v_cum + rec.w;
    IF v_cum >= v_r THEN
      RETURN rec.user_id;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._weighted_pick_voter_for_idea(uuid, uuid) FROM PUBLIC;

COMMENT ON FUNCTION public._weighted_pick_voter_for_idea IS '내부용: 우승 아이디어 투표자 가중 추첨';

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

  v_v1 := public._weighted_pick_voter_for_idea(v_winner.id, NULL);
  v_v2 := public._weighted_pick_voter_for_idea(v_winner.id, v_v1);

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
    'voter_winner_2_id', v_v2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.settle_week(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_week(uuid) TO service_role;

COMMENT ON FUNCTION public.settle_week IS
  '주간 정산: 1위 아이디어·상금(60/20/20)·가중 투표자 2명·full_ranking JSON. weeks.status → settled. '
  '대상 주차는 fever 또는 closed. 토스 지급은 별도 Edge에서 실행 권장.';
