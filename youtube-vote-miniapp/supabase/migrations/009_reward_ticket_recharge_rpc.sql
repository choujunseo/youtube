-- ============================================================
-- Migration 009: rewarded ad -> ticket recharge RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.reward_ticket_recharge(
  p_user_id UUID,
  p_ad_group_id TEXT DEFAULT 'feed_vote_no_ticket',
  p_reward_amount INT DEFAULT 1
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_ad_tickets INT;
BEGIN
  IF p_reward_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_REWARD_AMOUNT');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_user_id
      AND (u.id = auth.uid() OR u.auth_user_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  UPDATE public.users
    SET ad_tickets = ad_tickets + p_reward_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING ad_tickets INTO v_next_ad_tickets;

  INSERT INTO public.ad_logs (user_id, ad_type, ad_group_id, reward_amount)
  VALUES (p_user_id, 'ticket_recharge', p_ad_group_id, p_reward_amount);

  RETURN jsonb_build_object(
    'success', true,
    'rewardAmount', p_reward_amount,
    'adTickets', v_next_ad_tickets
  );
END;
$$;
