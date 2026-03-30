-- ============================================================
-- Migration 015: 주차 운영용 관리 RPC (service_role / SQL Editor)
-- settled 는 settle_week 파이프라인으로만 두는 것을 권장.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_week_status(
  p_week_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  IF p_week_id IS NULL OR p_status IS NULL OR btrim(p_status) = '' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'INVALID_ARGS');
  END IF;

  IF p_status = 'settled' THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'USE_SETTLE_WEEK',
      'hint', 'settled 는 settle_week / try_run_weekly_settlement_kst 로만 설정하세요.'
    );
  END IF;

  IF p_status NOT IN ('active', 'fever', 'closed') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'INVALID_STATUS', 'status', p_status);
  END IF;

  UPDATE public.weeks w
     SET status = p_status
   WHERE w.id = p_week_id
  RETURNING w.id, w.status INTO v_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'WEEK_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('applied', true, 'week_id', v_row.id, 'status', v_row.status);
END;
$$;

REVOKE ALL ON FUNCTION public.set_week_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_week_status(uuid, text) TO service_role;

COMMENT ON FUNCTION public.set_week_status IS
  'active / fever / closed 만 허용. settled 는 정산 RPC 사용.';

CREATE OR REPLACE FUNCTION public.admin_create_active_week(
  p_year int,
  p_week_number int,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_fever_start_at timestamptz,
  p_prize_pool bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_year IS NULL OR p_week_number IS NULL
     OR p_start_at IS NULL OR p_end_at IS NULL OR p_fever_start_at IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'INVALID_ARGS');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.weeks w
     WHERE w.status IN ('active', 'fever')
  ) THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'ALREADY_HAS_ACTIVE_OR_FEVER',
      'hint', '기존 active/fever 주를 settled/closed 처리한 뒤 생성하세요.'
    );
  END IF;

  INSERT INTO public.weeks (
    year,
    week_number,
    start_at,
    end_at,
    fever_start_at,
    status,
    prize_pool
  ) VALUES (
    p_year,
    p_week_number,
    p_start_at,
    p_end_at,
    p_fever_start_at,
    'active',
    COALESCE(p_prize_pool, 0)
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'applied', true,
    'week_id', v_id,
    'year', p_year,
    'week_number', p_week_number
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'DUPLICATE_YEAR_WEEK',
      'year', p_year,
      'week_number', p_week_number
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_active_week(int, int, timestamptz, timestamptz, timestamptz, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_active_week(int, int, timestamptz, timestamptz, timestamptz, bigint) TO service_role;

COMMENT ON FUNCTION public.admin_create_active_week IS
  '새 진행 주 1건 active 삽입. active/fever 가 이미 있으면 거절. (year, week_number) 유니크.';
