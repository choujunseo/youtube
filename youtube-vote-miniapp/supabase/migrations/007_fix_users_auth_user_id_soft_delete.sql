-- ============================================================
-- Fix: users 테이블에 auth_user_id 및 탈퇴(soft delete) 컬럼 추가
-- 기존 001 마이그레이션만 적용된 DB에서 위 setup.sql RLS 실행 시
-- ERROR: column "auth_user_id" does not exist 방지
-- ============================================================

-- Supabase Auth 사용자와 1:1 연결 (RLS에서 auth.uid()와 매칭)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 중복 가입 방지: NULL은 여러 행 허용, 값이 있으면 유일
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_auth_user_id_not_null
  ON public.users(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Edge Function 탈퇴/연결끊기 대응
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS unlink_referrer TEXT;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_unlink_referrer_check;
ALTER TABLE public.users ADD CONSTRAINT users_unlink_referrer_check
  CHECK (unlink_referrer IS NULL OR unlink_referrer IN ('UNLINK', 'WITHDRAWAL_TERMS', 'WITHDRAWAL_TOSS'));

-- toss_user_key: 탈퇴 시 NULL 허용 + 부분 유니크 (NULL은 복수 행 가능)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_toss_user_key_key;
ALTER TABLE public.users ALTER COLUMN toss_user_key DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_toss_user_key_not_null
  ON public.users(toss_user_key)
  WHERE toss_user_key IS NOT NULL;
