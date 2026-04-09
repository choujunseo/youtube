-- Toss 연결 끊기 후 동일 userKey로 다른 계정이 재연동할 수 있도록 NULL 허용 (PG UNIQUE는 NULL 다중 허용)
ALTER TABLE public.users
ALTER COLUMN toss_user_key DROP NOT NULL;
