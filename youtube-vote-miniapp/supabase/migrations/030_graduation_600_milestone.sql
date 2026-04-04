-- ============================================================
-- Migration 030: 600표 졸업 마일스톤 (기존 1,500표 체계 대체)
-- - milestone_settlements: 1500 → 600
-- - cast_vote_atomic: 600표 시 창작자 5,000원 + 순위별 상금 + 일반 1원
-- - fetch_feed_ideas_page: 피드에서 total_vote_count >= 600 제외
-- 첫 투표 5원(MILESTONE_FIRST_VOTE_PROMO_5)은 유지
-- ============================================================

ALTER TABLE public.milestone_settlements
  DROP CONSTRAINT IF EXISTS milestone_settlements_milestone_check;

UPDATE public.milestone_settlements
SET milestone = 600
WHERE milestone = 1500;

ALTER TABLE public.milestone_settlements
  ALTER COLUMN milestone SET DEFAULT 600;

ALTER TABLE public.milestone_settlements
  ADD CONSTRAINT milestone_settlements_milestone_check CHECK (milestone = 600);

COMMENT ON TABLE public.milestone_settlements IS
  '아이디어별 600표 졸업 정산 이벤트 중복 방지 락(아이디어 1회 정산 보장)';

COMMENT ON COLUMN public.payout_logs.reason IS
  'MILESTONE_FIRST_VOTE_PROMO_5 | MILESTONE_600_CREATOR | MILESTONE_600_RANK_1 | MILESTONE_600_RANK_150 | MILESTONE_600_RANK_300 | MILESTONE_600_RANK_450 | MILESTONE_600_RANK_600 | MILESTONE_600_GENERAL_1';

COMMENT ON TABLE public.payout_logs IS
  '외부 지급 API 호출 전, 600표 졸업·첫 투표 프로모션 등 보상 이벤트를 적재하는 정산 대기열';

DROP FUNCTION IF EXISTS public.fetch_feed_ideas_page(uuid, integer, integer);

CREATE FUNCTION public.fetch_feed_ideas_page(
  p_user_id UUID,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT,
  total_vote_count INT,
  total_weighted_shares NUMERIC,
  is_boosted BOOLEAN,
  boost_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  category_tags TEXT[],
  creator_display_name TEXT
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH unseen AS (
    SELECT
      i.id,
      i.creator_id,
      i.title,
      i.description,
      i.thumbnail_url,
      i.category,
      i.total_vote_count,
      i.total_weighted_shares,
      i.is_boosted,
      i.boost_expires_at,
      i.created_at,
      i.category_tags,
      COALESCE(u.display_name, '') AS creator_display_name
    FROM public.ideas i
    LEFT JOIN public.users u ON u.id = i.creator_id
    LEFT JOIN public.idea_impressions im
      ON im.idea_id = i.id
     AND im.user_id = p_user_id
    WHERE i.total_vote_count < 600
      AND i.creator_id <> p_user_id
      AND im.id IS NULL
  )
  SELECT
    unseen.id,
    unseen.creator_id,
    unseen.title,
    unseen.description,
    unseen.thumbnail_url,
    unseen.category,
    unseen.total_vote_count,
    unseen.total_weighted_shares,
    unseen.is_boosted,
    unseen.boost_expires_at,
    unseen.created_at,
    unseen.category_tags,
    unseen.creator_display_name
  FROM unseen
  ORDER BY
    CASE
      WHEN unseen.is_boosted = true
        AND (unseen.boost_expires_at IS NULL OR unseen.boost_expires_at > NOW())
      THEN 0
      ELSE 1
    END ASC,
    md5(unseen.id::text || ':' || p_user_id::text) ASC
  OFFSET GREATEST(p_offset, 0)
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.fetch_feed_ideas_page(uuid, integer, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cast_vote_atomic(
  p_user_id UUID,
  p_idea_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_creator_id           UUID;
  v_free_tickets         INT;
  v_ad_tickets           INT;
  v_day_weight           INT := 1;
  v_day_of_week          INT;
  v_existing_vote        UUID;
  v_new_total_votes      INT;
  v_new_weighted_total   NUMERIC;
  v_user_share           NUMERIC;
  v_settlement_locked_id UUID;
BEGIN
  SELECT id
    INTO v_existing_vote
    FROM public.votes
    WHERE user_id = p_user_id
      AND idea_id = p_idea_id;

  IF v_existing_vote IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_VOTED');
  END IF;

  SELECT i.creator_id
    INTO v_creator_id
    FROM public.ideas i
    WHERE i.id = p_idea_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'IDEA_NOT_FOUND');
  END IF;

  SELECT free_tickets, ad_tickets
    INTO v_free_tickets, v_ad_tickets
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

  IF v_free_tickets <= 0 AND v_ad_tickets <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_TICKETS');
  END IF;

  IF v_free_tickets > 0 THEN
    UPDATE public.users
      SET free_tickets = free_tickets - 1,
          updated_at = NOW()
      WHERE id = p_user_id;
  ELSE
    UPDATE public.users
      SET ad_tickets = ad_tickets - 1,
          updated_at = NOW()
      WHERE id = p_user_id;
  END IF;

  v_day_of_week := EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Seoul')::INT;

  INSERT INTO public.votes (user_id, idea_id, day_of_week, weight, weighted_share)
  VALUES (p_user_id, p_idea_id, v_day_of_week, v_day_weight, v_day_weight);

  UPDATE public.ideas
    SET total_vote_count = total_vote_count + 1,
        total_weighted_shares = total_weighted_shares + v_day_weight
    WHERE id = p_idea_id
  RETURNING total_vote_count, total_weighted_shares
    INTO v_new_total_votes, v_new_weighted_total;

  IF v_new_total_votes = 1 THEN
    INSERT INTO public.payout_logs (user_id, idea_id, amount, reason, status)
    VALUES (p_user_id, p_idea_id, 5, 'MILESTONE_FIRST_VOTE_PROMO_5', 'pending')
    ON CONFLICT (idea_id, user_id, reason) DO NOTHING;
  END IF;

  IF v_new_total_votes = 600 THEN
    INSERT INTO public.milestone_settlements (idea_id, milestone)
    VALUES (p_idea_id, 600)
    ON CONFLICT (idea_id) DO NOTHING
    RETURNING idea_id INTO v_settlement_locked_id;

    IF v_settlement_locked_id IS NOT NULL THEN
      INSERT INTO public.payout_logs (user_id, idea_id, amount, reason, status)
      VALUES (v_creator_id, p_idea_id, 5000, 'MILESTONE_600_CREATOR', 'pending')
      ON CONFLICT (idea_id, user_id, reason) DO NOTHING;

      WITH ordered_votes AS (
        SELECT
          v.user_id,
          ROW_NUMBER() OVER (ORDER BY v.created_at ASC, v.id ASC) AS vote_rank
        FROM public.votes v
        WHERE v.idea_id = p_idea_id
      )
      INSERT INTO public.payout_logs (user_id, idea_id, amount, reason, status)
      SELECT
        ov.user_id,
        p_idea_id,
        CASE ov.vote_rank
          WHEN 1 THEN 1000
          WHEN 150 THEN 300
          WHEN 300 THEN 400
          WHEN 450 THEN 500
          WHEN 600 THEN 1000
          ELSE 1
        END AS amount,
        CASE ov.vote_rank
          WHEN 1 THEN 'MILESTONE_600_RANK_1'
          WHEN 150 THEN 'MILESTONE_600_RANK_150'
          WHEN 300 THEN 'MILESTONE_600_RANK_300'
          WHEN 450 THEN 'MILESTONE_600_RANK_450'
          WHEN 600 THEN 'MILESTONE_600_RANK_600'
          ELSE 'MILESTONE_600_GENERAL_1'
        END AS reason,
        'pending'
      FROM ordered_votes ov
      WHERE ov.vote_rank BETWEEN 1 AND 600
      ON CONFLICT (idea_id, user_id, reason) DO NOTHING;
    END IF;
  END IF;

  v_user_share := v_day_weight;

  RETURN jsonb_build_object(
    'success', true,
    'probability', ROUND((v_user_share / NULLIF(v_new_weighted_total, 0)) * 100, 2),
    'weight', v_day_weight,
    'weekId', NULL
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
