-- ============================================================
-- Migration 012: 월요일 점검(00~06 KST) 동안 정산 시도 + 라이브 랭킹 MV 갱신
-- 앱 `MaintenancePage`와 동일 시간대. pg_cron / Edge `weekly-settlement`로 주기 호출.
-- ============================================================

CREATE OR REPLACE FUNCTION public.try_run_weekly_settlement_kst()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kst_now   TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Seoul');
  isodow    INT := EXTRACT(ISODOW FROM kst_now)::INT;
  hr        INT := EXTRACT(HOUR FROM kst_now)::INT;
  v_week_id uuid;
  settle_result jsonb;
BEGIN
  -- KST 월요일 00:00 <= 시각 < 06:00 (점검 창 = `try_weekly_user_reset_kst`와 동일)
  IF NOT (isodow = 1 AND hr >= 0 AND hr < 6) THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'OUTSIDE_SETTLEMENT_WINDOW',
      'kst_weekday', isodow,
      'kst_hour', hr
    );
  END IF;

  SELECT w.id
    INTO v_week_id
    FROM public.weeks w
   WHERE w.status IN ('fever', 'closed')
     AND NOT EXISTS (SELECT 1 FROM public.weekly_results wr WHERE wr.week_id = w.id)
   ORDER BY w.end_at ASC NULLS LAST
   LIMIT 1;

  IF v_week_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'NO_PENDING_WEEK');
  END IF;

  SELECT public.settle_week(v_week_id) INTO settle_result;

  BEGIN
    PERFORM public.refresh_live_ranking();
  EXCEPTION
    WHEN OTHERS THEN
      RETURN settle_result || jsonb_build_object(
        'refreshed_mv', false,
        'mv_error', SQLERRM
      );
  END;

  RETURN settle_result || jsonb_build_object('refreshed_mv', true);
END;
$$;

REVOKE ALL ON FUNCTION public.try_run_weekly_settlement_kst() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_run_weekly_settlement_kst() TO service_role;

COMMENT ON FUNCTION public.try_run_weekly_settlement_kst() IS
  'KST 월요일 00~6시: 가장 이른 미정산 fever|closed 주차에 settle_week 호출 후 refresh_live_ranking.';
