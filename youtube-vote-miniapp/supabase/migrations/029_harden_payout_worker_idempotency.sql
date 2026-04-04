-- ============================================================
-- Migration 029: Harden payout worker idempotency and locking
-- ============================================================

ALTER TABLE public.payout_logs
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_tx_key text,
  ADD COLUMN IF NOT EXISTS provider_response jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_logs_provider_tx_key
  ON public.payout_logs(provider_tx_key)
  WHERE provider_tx_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payout_logs_processing_started
  ON public.payout_logs(status, processing_started_at);

COMMENT ON COLUMN public.payout_logs.provider_tx_key IS
  '외부 프로모션 지급 API 호출 idempotency key';

COMMENT ON COLUMN public.payout_logs.attempts IS
  '지급 시도 횟수';

CREATE OR REPLACE FUNCTION public.claim_payout_logs_for_processing(
  p_batch_size int DEFAULT 20,
  p_stale_seconds int DEFAULT 300
) RETURNS SETOF public.payout_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
BEGIN
  v_limit := GREATEST(COALESCE(p_batch_size, 20), 1);

  RETURN QUERY
  WITH picked AS (
    SELECT pl.id
    FROM public.payout_logs pl
    WHERE
      pl.status = 'pending'
      OR (
        pl.status = 'processing'
        AND pl.processing_started_at < NOW() - make_interval(secs => GREATEST(COALESCE(p_stale_seconds, 300), 30))
      )
    ORDER BY pl.created_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.payout_logs pl
    SET
      status = 'processing',
      processing_started_at = NOW(),
      attempts = pl.attempts + 1
    WHERE pl.id IN (SELECT id FROM picked)
    RETURNING pl.*
  )
  SELECT *
  FROM updated
  ORDER BY created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_payout_logs_for_processing(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_payout_logs_for_processing(int, int) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_payout_log_paid(
  p_payout_log_id uuid,
  p_provider_tx_key text,
  p_provider_response jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_count int;
BEGIN
  IF p_payout_log_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NULL_PAYOUT_LOG_ID');
  END IF;

  IF p_provider_tx_key IS NULL OR btrim(p_provider_tx_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_PROVIDER_TX_KEY');
  END IF;

  UPDATE public.payout_logs pl
  SET
    status = 'paid',
    provider_tx_key = btrim(p_provider_tx_key),
    provider_response = COALESCE(p_provider_response, '{}'::jsonb),
    processed_at = NOW()
  WHERE
    pl.id = p_payout_log_id
    AND pl.status = 'processing';

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_IN_PROCESSING');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_PROVIDER_TX_KEY');
END;
$$;

REVOKE ALL ON FUNCTION public.mark_payout_log_paid(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_payout_log_paid(uuid, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_payout_log_failed(
  p_payout_log_id uuid,
  p_error text,
  p_provider_response jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_count int;
BEGIN
  IF p_payout_log_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NULL_PAYOUT_LOG_ID');
  END IF;

  UPDATE public.payout_logs pl
  SET
    status = 'failed',
    provider_response = jsonb_build_object(
      'error', COALESCE(NULLIF(btrim(COALESCE(p_error, '')), ''), 'UNKNOWN_ERROR'),
      'provider', COALESCE(p_provider_response, '{}'::jsonb)
    ),
    processed_at = NOW()
  WHERE
    pl.id = p_payout_log_id
    AND pl.status = 'processing';

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_IN_PROCESSING');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_payout_log_failed(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_payout_log_failed(uuid, text, jsonb) TO service_role;
