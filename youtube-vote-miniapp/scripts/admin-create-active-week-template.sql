-- 다음 진행 주 생성 템플릿 — 값만 바꾼 뒤 Supabase SQL Editor에서 실행
-- 전제: public.weeks 에 status IN ('active','fever') 인 행이 없을 것 (015 RPC 제약)
-- 문서: docs/weeks-operational-rules.md 섹션 8

-- (선택) 진행 주 잔존 여부
-- SELECT id, year, week_number, status FROM public.weeks WHERE status IN ('active', 'fever');

SELECT public.admin_create_active_week(
  p_year := 2026,
  p_week_number := 14,
  p_start_at := '2026-04-06T00:00:00+09:00'::timestamptz,
  p_end_at := '2026-04-12T23:59:59+09:00'::timestamptz,
  p_fever_start_at := '2026-04-12T23:30:00+09:00'::timestamptz,
  p_prize_pool := 1000000
);
