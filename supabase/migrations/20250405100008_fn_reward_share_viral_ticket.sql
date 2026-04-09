CREATE OR REPLACE FUNCTION public.reward_share_viral_ticket (p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  kst text := public.kst_today_key ();
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  SELECT
    * INTO v_user
  FROM
    public.users
  WHERE
    id = p_user_id
    AND NOT is_deleted;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  IF v_user.last_share_reward_kst = kst THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      'ALREADY_CLAIMED_TODAY',
      'adTickets',
      v_user.ad_tickets
    );
  END IF;

  UPDATE
    public.users
  SET
    last_share_reward_kst = kst,
    ad_tickets = ad_tickets + 1,
    updated_at = now()
  WHERE
    id = p_user_id
  RETURNING
    * INTO v_user;

  RETURN jsonb_build_object(
    'success',
    true,
    'rewardAmount',
    1,
    'adTickets',
    v_user.ad_tickets
  );
END;
$$;
