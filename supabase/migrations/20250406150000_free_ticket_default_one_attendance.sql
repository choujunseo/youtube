-- 기본·주간 리셋 무료 투표권 1장. 출석(웰컴) 당일 일일 중복 지급 방지: welcome 수령 시 last_daily_ticket_kst 도 갱신.
ALTER TABLE public.users
  ALTER COLUMN free_tickets SET DEFAULT 1;

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

  IF v_user.ticket_reset_at IS NULL OR (
    to_char(timezone('Asia/Seoul', v_user.ticket_reset_at), 'IYYY') || '-W' || lpad(
      to_char(timezone('Asia/Seoul', v_user.ticket_reset_at), 'IW'),
      2,
      '0'
    )
  ) IS DISTINCT FROM public.current_week_id_kst () THEN
    UPDATE
      public.users
    SET
      free_tickets = 1,
      ticket_reset_at = now(),
      updated_at = now()
    WHERE
      id = p_user_id;
  END IF;

  SELECT
    * INTO v_user
  FROM
    public.users
  WHERE
    id = p_user_id;

  IF NOT v_user.welcome_ticket_claimed THEN
    UPDATE
      public.users
    SET
      welcome_ticket_claimed = true,
      free_tickets = free_tickets + 1,
      last_daily_ticket_kst = kst,
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
      'welcome',
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
