CREATE OR REPLACE FUNCTION public.complete_user_withdraw (p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_toss bigint;
BEGIN
  SELECT
    toss_user_key INTO v_toss
  FROM
    public.users
  WHERE
    id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND');
  END IF;

  UPDATE
    public.ideas
  SET
    creator_payout_forfeited = TRUE
  WHERE
    user_id = p_user_id
    AND total_vote_count < 600;

  UPDATE
    public.payout_logs
  SET
    status = 'failed',
    processed_at = now()
  WHERE
    user_id = p_user_id
    AND status = 'pending';

  UPDATE
    public.users
  SET
    is_deleted = TRUE,
    display_name = '',
    toss_user_key = NULL,
    free_tickets = 0,
    ad_tickets = 0,
    boost_charges = 0,
    updated_at = now()
  WHERE
    id = p_user_id;

  IF v_toss IS NOT NULL THEN
    INSERT INTO public.toss_withdraw_cooldowns (toss_user_key, withdrawn_at)
      VALUES (v_toss, now())
    ON CONFLICT (toss_user_key)
      DO UPDATE SET
        withdrawn_at = excluded.withdrawn_at;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$body$;
