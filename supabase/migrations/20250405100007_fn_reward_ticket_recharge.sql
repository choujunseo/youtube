CREATE OR REPLACE FUNCTION public.reward_ticket_recharge (
  p_user_id uuid,
  p_ad_group_id text,
  p_reward_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  add_amt integer := greatest(coalesce(p_reward_amount, 1), 1);
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  UPDATE
    public.users
  SET
    ad_tickets = ad_tickets + add_amt,
    updated_at = now()
  WHERE
    id = p_user_id
    AND NOT is_deleted
  RETURNING
    * INTO v_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'success',
    true,
    'rewardAmount',
    add_amt,
    'adTickets',
    v_user.ad_tickets
  );
END;
$$;
