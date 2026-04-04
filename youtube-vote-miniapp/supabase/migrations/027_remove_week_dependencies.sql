-- ============================================================
-- Migration 027: Remove week-based DB dependencies
-- ============================================================

-- Legacy weekly settlement artifacts are no longer used.
DROP FUNCTION IF EXISTS public.try_run_weekly_settlement_kst() CASCADE;
DROP FUNCTION IF EXISTS public.try_weekly_user_reset_kst() CASCADE;
DROP FUNCTION IF EXISTS public.settle_week(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.enqueue_weekly_prize_payouts(uuid) CASCADE;
DROP FUNCTION IF EXISTS public._weighted_pick_voter_for_week_ranked(uuid, uuid, numeric) CASCADE;

DROP MATERIALIZED VIEW IF EXISTS public.mv_live_ranking CASCADE;

DROP TABLE IF EXISTS public.weekly_payout_queue CASCADE;
DROP TABLE IF EXISTS public.weekly_results CASCADE;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS last_weekly_reset_monday;

ALTER TABLE public.idea_impressions
  DROP CONSTRAINT IF EXISTS idea_impressions_week_id_fkey;

DROP INDEX IF EXISTS public.idx_idea_impressions_user_week_created;
DROP INDEX IF EXISTS public.idx_idea_impressions_week_idea;

ALTER TABLE public.idea_impressions
  DROP COLUMN IF EXISTS week_id;

ALTER TABLE public.ideas
  DROP CONSTRAINT IF EXISTS ideas_week_id_fkey;

DROP INDEX IF EXISTS public.idx_ideas_week_created;
DROP INDEX IF EXISTS public.idx_ideas_week_boost;
DROP INDEX IF EXISTS public.idx_ideas_week_weighted;

ALTER TABLE public.ideas
  DROP COLUMN IF EXISTS week_id;

ALTER TABLE public.votes
  DROP CONSTRAINT IF EXISTS votes_week_id_fkey;

DROP INDEX IF EXISTS public.idx_votes_user_week;

ALTER TABLE public.votes
  DROP COLUMN IF EXISTS week_id;

DROP TABLE IF EXISTS public.weeks CASCADE;

CREATE TABLE IF NOT EXISTS public.milestone_settlements (
  idea_id      uuid PRIMARY KEY REFERENCES public.ideas(id) ON DELETE CASCADE,
  milestone    int NOT NULL DEFAULT 1500 CHECK (milestone = 1500),
  settled_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.milestone_settlements IS
  '아이디어별 마일스톤 정산 이벤트 중복 방지 락(아이디어 1회 정산 보장)';

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

  IF v_new_total_votes = 1500 THEN
    INSERT INTO public.milestone_settlements (idea_id, milestone)
    VALUES (p_idea_id, 1500)
    ON CONFLICT (idea_id) DO NOTHING
    RETURNING idea_id INTO v_settlement_locked_id;

    IF v_settlement_locked_id IS NOT NULL THEN
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
