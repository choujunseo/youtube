-- In-app notification inbox (mirrors Toss smart messages user received)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  payout_log_id   UUID UNIQUE REFERENCES public.payout_logs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications(user_id, created_at DESC);

COMMENT ON TABLE public.user_notifications IS
  '사용자 앱 내 알림함; 외부 메신저 발송 성공 시 워커가 적재';

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notifications: self read"
  ON public.user_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_notifications: self update read"
  ON public.user_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
