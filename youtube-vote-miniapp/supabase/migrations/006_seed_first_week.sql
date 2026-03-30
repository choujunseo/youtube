-- ============================================================
-- Migration 006: Seed Current Week
-- Supabase 프로젝트 생성 직후 최초 1회 실행
-- ============================================================

INSERT INTO weeks (year, week_number, start_at, end_at, fever_start_at, status, prize_pool)
VALUES (
  EXTRACT(YEAR FROM NOW())::INT,
  EXTRACT(WEEK FROM NOW())::INT,
  -- 이번 주 월요일 00:00 KST
  DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul',
  -- 이번 주 일요일 24:00 KST
  DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' + INTERVAL '7 days',
  -- 일요일 23:30 KST
  DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' + INTERVAL '6 days 23 hours 30 minutes',
  'active',
  10000
)
ON CONFLICT (year, week_number) DO NOTHING;
