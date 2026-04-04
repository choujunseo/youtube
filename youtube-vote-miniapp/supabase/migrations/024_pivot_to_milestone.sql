-- ============================================================
-- Migration 024: Pivot to 1,500-vote milestone settlement
-- - Introduce payout queue table (payout_logs)
-- - Exclude hall-of-fame ideas from feed RPC
-- - Update cast_vote_atomic to milestone-triggered payout enqueue
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payout_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  idea_id       UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  amount        INT NOT NULL CHECK (amount > 0),
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_logs_idea_user_reason
  ON public.payout_logs(idea_id, user_id, reason);

CREATE INDEX IF NOT EXISTS idx_payout_logs_status_created
  ON public.payout_logs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_payout_logs_user_created
  ON public.payout_logs(user_id, created_at DESC);

COMMENT ON TABLE public.payout_logs IS
  '외부 지급 API 호출 전, 1,500표 달성 보상 이벤트를 적재하는 정산 대기열';

COMMENT ON COLUMN public.payout_logs.reason IS
  'MILESTONE_FIRST_VOTE_PROMO_5 | MILESTONE_1500_CREATOR | MILESTONE_RANK_1 | MILESTONE_RANK_300 | MILESTONE_RANK_600 | MILESTONE_RANK_900 | MILESTONE_RANK_1200 | MILESTONE_RANK_1500 | MILESTONE_GENERAL_1W';

DROP FUNCTION IF EXISTS public.fetch_feed_ideas_page(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.fetch_feed_ideas_page(
  p_user_id UUID,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS SETOF public.ideas
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH unseen AS (
    SELECT i.*
    FROM public.ideas i
    LEFT JOIN public.idea_impressions im
      ON im.idea_id = i.id
     AND im.user_id = p_user_id
    WHERE i.total_vote_count < 1500
      AND i.creator_id <> p_user_id
      AND im.id IS NULL
  )
  SELECT *
  FROM unseen
  ORDER BY
    CASE
      WHEN is_boosted = true AND (boost_expires_at IS NULL OR boost_expires_at > NOW()) THEN 0
      ELSE 1
    END ASC,
    md5(id::text || ':' || p_user_id::text) ASC
  OFFSET GREATEST(p_offset, 0)
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.fetch_feed_ideas_page(uuid, integer, integer) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.cast_vote_atomic(
  p_user_id UUID,
  p_idea_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_week_id              UUID;
  v_creator_id           UUID;
  v_free_tickets         INT;
  v_ad_tickets           INT;
  v_day_weight           INT := 1;
  v_day_of_week          INT;
  v_existing_vote        UUID;
  v_new_total_votes      INT;
  v_new_weighted_total   NUMERIC;
  v_user_share           NUMERIC;
BEGIN
  SELECT id
    INTO v_existing_vote
    FROM public.votes
    WHERE user_id = p_user_id
      AND idea_id = p_idea_id;

  IF v_existing_vote IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_VOTED');
  END IF;

  SELECT id
    INTO v_week_id
    FROM public.weeks
    WHERE status IN ('active', 'fever')
    ORDER BY start_at DESC
    LIMIT 1;

  IF v_week_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_WEEK');
  END IF;

  SELECT i.creator_id
    INTO v_creator_id
    FROM public.ideas i
    WHERE i.id = p_idea_id
      AND i.week_id = v_week_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'IDEA_NOT_IN_CURRENT_WEEK');
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

  INSERT INTO public.votes (user_id, idea_id, week_id, day_of_week, weight, weighted_share)
  VALUES (p_user_id, p_idea_id, v_week_id, v_day_of_week, v_day_weight, v_day_weight);

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

  IF v_new_total_votes = 1500 THEN
    INSERT INTO public.payout_logs (user_id, idea_id, amount, reason, status)
    VALUES (v_creator_id, p_idea_id, 5000, 'MILESTONE_1500_CREATOR', 'pending')
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
      CASE
        WHEN ov.vote_rank = 1 THEN 2000
        WHEN ov.vote_rank = 300 THEN 300
        WHEN ov.vote_rank = 600 THEN 400
        WHEN ov.vote_rank = 900 THEN 500
        WHEN ov.vote_rank = 1200 THEN 800
        WHEN ov.vote_rank = 1500 THEN 1500
        ELSE 1
      END AS amount,
      CASE
        WHEN ov.vote_rank = 1 THEN 'MILESTONE_RANK_1'
        WHEN ov.vote_rank = 300 THEN 'MILESTONE_RANK_300'
        WHEN ov.vote_rank = 600 THEN 'MILESTONE_RANK_600'
        WHEN ov.vote_rank = 900 THEN 'MILESTONE_RANK_900'
        WHEN ov.vote_rank = 1200 THEN 'MILESTONE_RANK_1200'
        WHEN ov.vote_rank = 1500 THEN 'MILESTONE_RANK_1500'
        ELSE 'MILESTONE_GENERAL_1W'
      END AS reason,
      'pending'
    FROM ordered_votes ov
    WHERE ov.vote_rank BETWEEN 1 AND 1500
      AND (ov.vote_rank = 1
        OR ov.vote_rank = 300
        OR ov.vote_rank = 600
        OR ov.vote_rank = 900
        OR ov.vote_rank = 1200
        OR ov.vote_rank = 1500
        OR (ov.vote_rank BETWEEN 2 AND 1499
            AND ov.vote_rank NOT IN (300, 600, 900, 1200)))
    ON CONFLICT (idea_id, user_id, reason) DO NOTHING;
  END IF;

  v_user_share := v_day_weight;

  RETURN jsonb_build_object(
    'success', true,
    'probability', ROUND((v_user_share / NULLIF(v_new_weighted_total, 0)) * 100, 2),
    'weight', v_day_weight,
    'weekId', v_week_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
