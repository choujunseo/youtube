-- ============================================================
-- Migration 010: 월요일 00:00~06:00 (KST) 점검 구간 주간 초기화
-- 1) weekly_upload_count = 0
-- 2) free_tickets = free_tickets + 10
-- 같은 KST 월요일에는 1회만 적용 (last_weekly_reset_monday)
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_weekly_reset_monday DATE;

CREATE INDEX IF NOT EXISTS idx_users_last_weekly_reset_monday
  ON public.users(last_weekly_reset_monday);

CREATE OR REPLACE FUNCTION public.try_weekly_user_reset_kst()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kst_now   TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Seoul');
  isodow    INT := EXTRACT(ISODOW FROM kst_now)::INT;
  hr        INT := EXTRACT(HOUR FROM kst_now)::INT;
  kst_date  DATE := kst_now::DATE;
  this_monday DATE := kst_date - (isodow - 1);
  affected  INT := 0;
BEGIN
  -- 월요일만, 00:00 <= 시각 < 06:00 (KST)
  IF NOT (isodow = 1 AND hr >= 0 AND hr < 6) THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'OUTSIDE_MAINTENANCE_WINDOW',
      'kst_now', kst_now
    );
  END IF;

  UPDATE public.users u
     SET weekly_upload_count   = 0,
         free_tickets          = u.free_tickets + 10,
         ticket_reset_at       = NOW(),
         updated_at            = NOW(),
         last_weekly_reset_monday = this_monday
   WHERE COALESCE(u.is_deleted, FALSE) = FALSE
     AND (u.last_weekly_reset_monday IS DISTINCT FROM this_monday);

  GET DIAGNOSTICS affected = ROW_COUNT;

  RETURN jsonb_build_object(
    'applied', true,
    'updated_rows', affected,
    'this_monday_kst', this_monday,
    'kst_hour', hr
  );
END;
$$;

REVOKE ALL ON FUNCTION public.try_weekly_user_reset_kst() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_weekly_user_reset_kst() TO service_role;

COMMENT ON FUNCTION public.try_weekly_user_reset_kst() IS
'월요일 00~6시 KST만 반영. weekly_upload_count=0, free_tickets+10. 같은 KST 월요일 1회. pg_cron 등으로 점검 시간대 주기 호출.';
