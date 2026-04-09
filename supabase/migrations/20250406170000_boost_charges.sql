-- 부스트 충전권: 광고로 `boost_charges` 적립 → 내 아이디어에서 1회 소모해 피드 부스트 적용

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS boost_charges integer NOT NULL DEFAULT 0;

ALTER TABLE public.ad_logs DROP CONSTRAINT IF EXISTS ad_logs_type;

ALTER TABLE public.ad_logs ADD CONSTRAINT ad_logs_type CHECK (
  ad_type IN (
    'ticket_recharge',
    'boost',
    'boost_charge_recharge',
    'hall_gate_interstitial',
    'upload_bonus',
    'share_viral'
  )
);

CREATE OR REPLACE FUNCTION public.reward_boost_recharge (
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
    boost_charges = boost_charges + add_amt,
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
    'boostCharges',
    v_user.boost_charges
  );
END;
$$;

-- 부스트 충전 1개 소모 + 본인 아이디어에 부스트 시간 적용 (기본 120분, 클라 VITE_BOOST_DURATION_MINUTES 와 맞출 것)
CREATE OR REPLACE FUNCTION public.apply_boost_charge_on_idea (p_idea_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_idea public.ideas%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_duration interval := interval '120 minutes';
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  SELECT
    * INTO v_idea
  FROM
    public.ideas
  WHERE
    id = p_idea_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'IDEA_NOT_FOUND');
  END IF;

  IF v_idea.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  IF v_idea.is_boosted
  AND (
    v_idea.boost_expires_at IS NULL
    OR v_idea.boost_expires_at > now()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_BOOSTED');
  END IF;

  UPDATE
    public.users
  SET
    boost_charges = boost_charges - 1,
    updated_at = now()
  WHERE
    id = v_uid
    AND NOT is_deleted
    AND boost_charges > 0
  RETURNING
    * INTO v_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_BOOST_CHARGES');
  END IF;

  UPDATE
    public.ideas
  SET
    is_boosted = true,
    boost_expires_at = now() + v_duration
  WHERE
    id = p_idea_id;

  RETURN jsonb_build_object('success', true, 'boostCharges', v_user.boost_charges);
END;
$$;
