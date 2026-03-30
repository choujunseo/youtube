-- ============================================================
-- Migration 023: 공유 리워드(contactsViral) 완료 시 투표권 1장 (앱 측 지급)
-- KST 기준 동일 일 1회만 지급 (남용 방지)
-- ============================================================

ALTER TABLE public.ad_logs DROP CONSTRAINT IF EXISTS ad_logs_ad_type_check;
ALTER TABLE public.ad_logs
  ADD CONSTRAINT ad_logs_ad_type_check CHECK (
    ad_type IN ('ticket_recharge', 'boost', 'upload_bonus', 'share_viral')
  );

CREATE TABLE IF NOT EXISTS public.share_viral_daily_grants (
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  grant_day  date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, grant_day)
);

ALTER TABLE public.share_viral_daily_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reward_share_viral_ticket(
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day     date;
  v_row_n   int;
  v_next_ad int;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NULL_USER_ID');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_user_id
      AND (u.id = auth.uid() OR u.auth_user_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  v_day := ((NOW() AT TIME ZONE 'Asia/Seoul'))::date;

  INSERT INTO public.share_viral_daily_grants (user_id, grant_day)
  VALUES (p_user_id, v_day)
  ON CONFLICT (user_id, grant_day) DO NOTHING;

  GET DIAGNOSTICS v_row_n = ROW_COUNT;
  IF v_row_n = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_GRANTED_TODAY',
      'grantDay', v_day
    );
  END IF;

  UPDATE public.users
    SET ad_tickets = ad_tickets + 1,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING ad_tickets INTO v_next_ad;

  INSERT INTO public.ad_logs (user_id, ad_type, ad_group_id, reward_amount)
  VALUES (p_user_id, 'share_viral', 'contacts_viral', 1);

  RETURN jsonb_build_object(
    'success', true,
    'rewardAmount', 1,
    'adTickets', v_next_ad,
    'grantDay', v_day
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reward_share_viral_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reward_share_viral_ticket(uuid) TO authenticated;

COMMENT ON FUNCTION public.reward_share_viral_ticket IS
  '공유 리워드(sendViral) 완료 후 앱 티켓 1장 지급. KST 동일 일 1회';
