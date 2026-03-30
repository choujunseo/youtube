-- ============================================================
-- Migration 022: 정산 직후 자동 실지급 파이프라인
-- - prize_payouts: 실지급 큐/상태 저장
-- - enqueue_weekly_prize_payouts(week_id): weekly_results 기준 지급 대상을 idempotent 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prize_payouts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_result_id uuid NOT NULL REFERENCES public.weekly_results(id) ON DELETE CASCADE,
  week_id          uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payout_role      text NOT NULL CHECK (payout_role IN ('creator', 'voter_1', 'voter_2')),
  amount           bigint NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  provider         text NOT NULL DEFAULT 'toss-promotion',
  provider_ref     text,
  idempotency_key  text NOT NULL UNIQUE,
  error_message    text,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prize_payouts_weekly_result_role_unique
  ON public.prize_payouts(weekly_result_id, payout_role);

CREATE INDEX IF NOT EXISTS idx_prize_payouts_status_requested_at
  ON public.prize_payouts(status, requested_at);

ALTER TABLE public.prize_payouts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enqueue_weekly_prize_payouts(p_week_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wr record;
  v_inserted int := 0;
  v_rowcount int := 0;
BEGIN
  IF p_week_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'NULL_WEEK_ID');
  END IF;

  SELECT *
    INTO v_wr
    FROM public.weekly_results wr
   WHERE wr.week_id = p_week_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'WEEKLY_RESULT_NOT_FOUND', 'week_id', p_week_id);
  END IF;

  INSERT INTO public.prize_payouts (
    weekly_result_id, week_id, user_id, payout_role, amount, idempotency_key
  )
  VALUES (
    v_wr.id,
    v_wr.week_id,
    v_wr.creator_id,
    'creator',
    COALESCE(v_wr.creator_prize, 0),
    format('week:%s:creator:%s', v_wr.week_id::text, v_wr.creator_id::text)
  )
  ON CONFLICT (weekly_result_id, payout_role) DO NOTHING;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  v_inserted := v_inserted + v_rowcount;

  IF v_wr.voter_winner_1_id IS NOT NULL THEN
    INSERT INTO public.prize_payouts (
      weekly_result_id, week_id, user_id, payout_role, amount, idempotency_key
    )
    VALUES (
      v_wr.id,
      v_wr.week_id,
      v_wr.voter_winner_1_id,
      'voter_1',
      COALESCE(v_wr.voter_prize_each, 0),
      format('week:%s:voter1:%s', v_wr.week_id::text, v_wr.voter_winner_1_id::text)
    )
    ON CONFLICT (weekly_result_id, payout_role) DO NOTHING;

    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_inserted := v_inserted + v_rowcount;
  END IF;

  IF v_wr.voter_winner_2_id IS NOT NULL THEN
    INSERT INTO public.prize_payouts (
      weekly_result_id, week_id, user_id, payout_role, amount, idempotency_key
    )
    VALUES (
      v_wr.id,
      v_wr.week_id,
      v_wr.voter_winner_2_id,
      'voter_2',
      COALESCE(v_wr.voter_prize_each, 0),
      format('week:%s:voter2:%s', v_wr.week_id::text, v_wr.voter_winner_2_id::text)
    )
    ON CONFLICT (weekly_result_id, payout_role) DO NOTHING;

    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_inserted := v_inserted + v_rowcount;
  END IF;

  RETURN jsonb_build_object(
    'applied', true,
    'week_id', p_week_id,
    'inserted', v_inserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_weekly_prize_payouts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_weekly_prize_payouts(uuid) TO service_role;

COMMENT ON FUNCTION public.enqueue_weekly_prize_payouts IS
  'weekly_results 기준으로 creator/voter 당첨 지급 대상을 prize_payouts에 idempotent 생성';
