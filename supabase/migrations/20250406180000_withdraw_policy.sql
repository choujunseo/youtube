-- 탈퇴 정책 DDL만 (함수는 20250406180001~ 분리 — db push 시 PL/pgSQL 본문 ; 분리 버그 회피)

CREATE TABLE public.toss_withdraw_cooldowns (
  toss_user_key bigint PRIMARY KEY,
  withdrawn_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_toss_withdraw_cooldowns_withdrawn_at ON public.toss_withdraw_cooldowns (withdrawn_at);

ALTER TABLE public.toss_withdraw_cooldowns ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.toss_withdraw_cooldowns FROM PUBLIC;
GRANT ALL ON public.toss_withdraw_cooldowns TO service_role;

ALTER TABLE public.ideas
ADD COLUMN IF NOT EXISTS creator_payout_forfeited boolean NOT NULL DEFAULT false;
