-- ============================================================
-- Migration 025: Attendance ticket policy
-- - Welcome bonus (once): +3 free tickets
-- - Daily attendance (KST): +1 free ticket per day
-- ============================================================

ALTER TABLE public.users
  ALTER COLUMN free_tickets SET DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS welcome_bonus_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attendance_day date;

CREATE OR REPLACE FUNCTION public.claim_attendance_ticket(
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kst_day        date;
  v_grant_amount   int := 0;
  v_grant_type     text := 'none';
  v_free_tickets   int;
  v_ad_tickets     int;
  v_welcome_at     timestamptz;
  v_last_day       date;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NULL_USER_ID');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_user_id
      AND (u.id = auth.uid() OR u.auth_user_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  v_kst_day := (NOW() AT TIME ZONE 'Asia/Seoul')::date;

  SELECT u.free_tickets, u.ad_tickets, u.welcome_bonus_granted_at, u.last_attendance_day
    INTO v_free_tickets, v_ad_tickets, v_welcome_at, v_last_day
    FROM public.users u
    WHERE u.id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  IF v_welcome_at IS NULL THEN
    v_grant_amount := 3;
    v_grant_type := 'welcome';
    UPDATE public.users
      SET free_tickets = free_tickets + v_grant_amount,
          welcome_bonus_granted_at = NOW(),
          last_attendance_day = v_kst_day,
          updated_at = NOW()
      WHERE id = p_user_id
      RETURNING free_tickets, ad_tickets INTO v_free_tickets, v_ad_tickets;
  ELSIF v_last_day IS DISTINCT FROM v_kst_day THEN
    v_grant_amount := 1;
    v_grant_type := 'daily';
    UPDATE public.users
      SET free_tickets = free_tickets + v_grant_amount,
          last_attendance_day = v_kst_day,
          updated_at = NOW()
      WHERE id = p_user_id
      RETURNING free_tickets, ad_tickets INTO v_free_tickets, v_ad_tickets;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'granted', (v_grant_amount > 0),
    'grantType', v_grant_type,
    'grantAmount', v_grant_amount,
    'attendanceDay', v_kst_day,
    'freeTickets', v_free_tickets,
    'adTickets', v_ad_tickets
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_attendance_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_attendance_ticket(uuid) TO authenticated;

COMMENT ON FUNCTION public.claim_attendance_ticket(uuid) IS
  '가입 직후 1회 3장, 이후 KST 기준 일 1회 1장 출석 보너스 지급';
