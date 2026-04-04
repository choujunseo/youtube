-- 비로그인 신고: reporter_user_id NULL 허용 + anon INSERT (RLS는 프로젝트에 맞게 조정)
DO $$
BEGIN
  IF to_regclass('public.reports') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.reports
    ALTER COLUMN reporter_user_id DROP NOT NULL;

  COMMENT ON COLUMN public.reports.reporter_user_id IS 'NULL = 비로그인(익명) 신고';

  -- 기존 정책과 충돌하면 대시보드에서 병합하세요.
  DROP POLICY IF EXISTS reports_insert_anon ON public.reports;
  CREATE POLICY reports_insert_anon ON public.reports
    FOR INSERT TO anon
    WITH CHECK (true);
END
$$;
