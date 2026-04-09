-- 주간 무료 티켓 리셋 제거. 신규 가입은 users.free_tickets 기본값(1)만 사용.
-- 출석은 일 1회 +1 (last_daily_ticket_kst). 웰컴 별도 +1 없음.
CREATE OR REPLACE FUNCTION public.claim_attendance_ticket (p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  kst text := public.kst_today_key ();
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'granted',
      false,
      'grantType',
      'none',
      'grantAmount',
      0,
      'freeTickets',
      0,
      'adTickets',
      0,
      'error',
      'FORBIDDEN'
    );
  END IF;

  SELECT
    * INTO v_user
  FROM
    public.users
  WHERE
    id = p_user_id
    AND NOT is_deleted;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'granted',
      false,
      'grantType',
      'none',
      'grantAmount',
      0,
      'freeTickets',
      0,
      'adTickets',
      0,
      'error',
      'USER_NOT_FOUND'
    );
  END IF;

  IF v_user.last_daily_ticket_kst IS DISTINCT FROM kst THEN
    UPDATE
      public.users
    SET
      last_daily_ticket_kst = kst,
      free_tickets = free_tickets + 1,
      updated_at = now()
    WHERE
      id = p_user_id;

    SELECT
      * INTO v_user
    FROM
      public.users
    WHERE
      id = p_user_id;

    RETURN jsonb_build_object(
      'success',
      true,
      'granted',
      true,
      'grantType',
      'daily',
      'grantAmount',
      1,
      'freeTickets',
      v_user.free_tickets,
      'adTickets',
      v_user.ad_tickets,
      'attendanceDay',
      kst
    );
  END IF;

  RETURN jsonb_build_object(
    'success',
    true,
    'granted',
    false,
    'grantType',
    'none',
    'grantAmount',
    0,
    'freeTickets',
    v_user.free_tickets,
    'adTickets',
    v_user.ad_tickets,
    'attendanceDay',
    kst
  );
END;
$$;
