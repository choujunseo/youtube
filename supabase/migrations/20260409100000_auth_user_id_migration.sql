-- Toss 연동 영구 PK(users.id)와 Supabase 세션(auth.uid) 분리.
-- 기존: auth_user_id 백필 = id → 동작 동일. 재연결 시 auth_user_id만 갱신.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_user_id uuid;

UPDATE public.users
SET
  auth_user_id = id
WHERE
  auth_user_id IS NULL;

ALTER TABLE public.users
ALTER COLUMN auth_user_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_key ON public.users (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);

CREATE OR REPLACE FUNCTION public.current_user_id ()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    id
  FROM
    public.users
  WHERE
    auth_user_id = auth.uid()
    AND NOT is_deleted
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_id () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_id () TO authenticated, anon;

-- RLS: 세션은 auth_user_id로 매핑된 users.id 기준
DROP POLICY IF EXISTS users_select_own ON public.users;

DROP POLICY IF EXISTS users_update_own ON public.users;

CREATE POLICY users_select_own ON public.users FOR SELECT USING (
  current_user_id () = id
  AND NOT is_deleted
);

CREATE POLICY users_update_own ON public.users FOR UPDATE USING (current_user_id () = id AND NOT is_deleted)
WITH CHECK (current_user_id () = id AND NOT is_deleted);

DROP POLICY IF EXISTS ideas_insert_own ON public.ideas;

DROP POLICY IF EXISTS ideas_update_own ON public.ideas;

DROP POLICY IF EXISTS ideas_delete_own ON public.ideas;

CREATE POLICY ideas_insert_own ON public.ideas FOR INSERT WITH CHECK (current_user_id () = user_id);

CREATE POLICY ideas_update_own ON public.ideas FOR UPDATE USING (current_user_id () = user_id)
WITH CHECK (current_user_id () = user_id);

CREATE POLICY ideas_delete_own ON public.ideas FOR DELETE USING (current_user_id () = user_id);

DROP POLICY IF EXISTS votes_select_own ON public.votes;

CREATE POLICY votes_select_own ON public.votes FOR SELECT USING (current_user_id () = user_id);

DROP POLICY IF EXISTS idea_impressions_all_own ON public.idea_impressions;

CREATE POLICY idea_impressions_all_own ON public.idea_impressions FOR ALL USING (current_user_id () = user_id)
WITH CHECK (current_user_id () = user_id);

DROP POLICY IF EXISTS ad_logs_select_own ON public.ad_logs;

DROP POLICY IF EXISTS ad_logs_insert_own ON public.ad_logs;

CREATE POLICY ad_logs_select_own ON public.ad_logs FOR SELECT USING (current_user_id () = user_id);

CREATE POLICY ad_logs_insert_own ON public.ad_logs FOR INSERT WITH CHECK (current_user_id () = user_id);

DROP POLICY IF EXISTS user_notifications_select_own ON public.user_notifications;

DROP POLICY IF EXISTS user_notifications_update_own ON public.user_notifications;

CREATE POLICY user_notifications_select_own ON public.user_notifications FOR SELECT USING ( current_user_id () = user_id);

CREATE POLICY user_notifications_update_own ON public.user_notifications FOR UPDATE USING (
  current_user_id () = user_id
)
WITH CHECK (current_user_id () = user_id);

-- 탈퇴: Edge가 넘기는 p_user_id는 Supabase JWT(auth.uid); auth_user_id로 역매핑
CREATE OR REPLACE FUNCTION public.complete_user_withdraw (p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_toss bigint;
  v_uid uuid;
BEGIN
  SELECT
    id,
    toss_user_key INTO v_uid,
    v_toss
  FROM
    public.users
  WHERE
    auth_user_id = p_user_id
    OR id = p_user_id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'USER_NOT_FOUND');
  END IF;

  UPDATE
    public.ideas
  SET
    creator_payout_forfeited = TRUE
  WHERE
    user_id = v_uid
    AND total_vote_count < 600;

  UPDATE
    public.payout_logs
  SET
    status = 'failed',
    processed_at = now()
  WHERE
    user_id = v_uid
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
    id = v_uid;

  IF v_toss IS NOT NULL THEN
    INSERT INTO public.toss_withdraw_cooldowns (toss_user_key, withdrawn_at)
      VALUES (v_toss, now())
      ON CONFLICT (toss_user_key)
        DO UPDATE SET
          withdrawn_at = excluded.withdrawn_at;
  END IF;

  RETURN jsonb_build_object('ok', TRUE);
END;
$body$;

CREATE OR REPLACE FUNCTION public.claim_attendance_ticket (p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  kst text := public.kst_today_key ();
BEGIN
  IF p_user_id IS DISTINCT FROM public.current_user_id () THEN
    RETURN jsonb_build_object(
      'success',
      FALSE,
      'granted',
      FALSE,
      'grantType',
      'none',
      'grantAmount',
      0,
      'freeTickets',
      0,
      'adTickets',
      0,
      'error',
      'FORBIDDEN'
    );
  END IF;

  SELECT
    * INTO v_user
  FROM
    public.users
  WHERE
    id = p_user_id
    AND NOT is_deleted;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success',
      FALSE,
      'granted',
      FALSE,
      'grantType',
      'none',
      'grantAmount',
      0,
      'freeTickets',
      0,
      'adTickets',
      0,
      'error',
      'USER_NOT_FOUND'
    );
  END IF;

  IF v_user.last_daily_ticket_kst IS DISTINCT FROM kst THEN
    UPDATE
      public.users
    SET
      last_daily_ticket_kst = kst,
      free_tickets = free_tickets + 1,
      updated_at = now()
    WHERE
      id = p_user_id;

    SELECT
      * INTO v_user
    FROM
      public.users
    WHERE
      id = p_user_id;

    RETURN jsonb_build_object(
      'success',
      TRUE,
      'granted',
      TRUE,
      'grantType',
      'daily',
      'grantAmount',
      1,
      'freeTickets',
      v_user.free_tickets,
      'adTickets',
      v_user.ad_tickets,
      'attendanceDay',
      kst
    );
  END IF;

  RETURN jsonb_build_object(
    'success',
    TRUE,
    'granted',
    FALSE,
    'grantType',
    'none',
    'grantAmount',
    0,
    'freeTickets',
    v_user.free_tickets,
    'adTickets',
    v_user.ad_tickets,
    'attendanceDay',
    kst
  );
END;
$$;

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
  IF p_user_id IS DISTINCT FROM public.current_user_id () THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
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
    RETURN jsonb_build_object('success', FALSE, 'error', 'USER_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'success',
    TRUE,
    'rewardAmount',
    add_amt,
    'adTickets',
    v_user.ad_tickets
  );
END;
$$;

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
  IF p_user_id IS DISTINCT FROM public.current_user_id () THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
  END IF;

  SELECT
    * INTO v_user
  FROM
    public.users
  WHERE
    id = p_user_id
    AND NOT is_deleted;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'USER_NOT_FOUND');
  END IF;

  IF v_user.last_share_reward_kst = kst THEN
    RETURN jsonb_build_object(
      'success',
      FALSE,
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
    TRUE,
    'rewardAmount',
    1,
    'adTickets',
    v_user.ad_tickets
  );
END;
$$;

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
  IF p_user_id IS DISTINCT FROM public.current_user_id () THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
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
    RETURN jsonb_build_object('success', FALSE, 'error', 'USER_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'success',
    TRUE,
    'rewardAmount',
    add_amt,
    'boostCharges',
    v_user.boost_charges
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_boost_charge_on_idea (p_idea_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := public.current_user_id ();
  v_idea public.ideas%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_duration interval := interval '120 minutes';
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
  END IF;

  SELECT
    * INTO v_idea
  FROM
    public.ideas
  WHERE
    id = p_idea_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'IDEA_NOT_FOUND');
  END IF;

  IF v_idea.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
  END IF;

  IF v_idea.is_boosted
  AND (
    v_idea.boost_expires_at IS NULL
    OR v_idea.boost_expires_at > now()
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'ALREADY_BOOSTED');
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
    RETURN jsonb_build_object('success', FALSE, 'error', 'NO_BOOST_CHARGES');
  END IF;

  UPDATE
    public.ideas
  SET
    is_boosted = TRUE,
    boost_expires_at = now() + v_duration
  WHERE
    id = p_idea_id;

  RETURN jsonb_build_object('success', TRUE, 'boostCharges', v_user.boost_charges);
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_vote_atomic (p_user_id uuid, p_idea_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  w text := public.current_week_id_kst ();
  v_user public.users%ROWTYPE;
  v_idea public.ideas%ROWTYPE;
  v_weight smallint := public.vote_weight_kst ();
  v_dow smallint;
  week_total numeric;
  prob numeric;
  v_user_vote_count integer;
  rec record;
BEGIN
  IF p_user_id IS DISTINCT FROM public.current_user_id () THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
  END IF;

  SELECT
    * INTO v_user
  FROM
    public.users
  WHERE
    id = p_user_id
    AND NOT is_deleted
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'USER_NOT_FOUND');
  END IF;

  SELECT
    * INTO v_idea
  FROM
    public.ideas
  WHERE
    id = p_idea_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'IDEA_NOT_FOUND');
  END IF;

  IF v_idea.week_id IS DISTINCT FROM w THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'IDEA_NOT_IN_CURRENT_WEEK');
  END IF;

  IF v_idea.total_vote_count >= 600 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'IDEA_GRADUATED');
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.votes v
    WHERE
      v.user_id = p_user_id
      AND v.idea_id = p_idea_id
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'ALREADY_VOTED');
  END IF;

  IF v_user.free_tickets > 0 THEN
    UPDATE
      public.users
    SET
      free_tickets = free_tickets - 1,
      updated_at = now()
    WHERE
      id = p_user_id;
  ELSIF v_user.ad_tickets > 0 THEN
    UPDATE
      public.users
    SET
      ad_tickets = ad_tickets - 1,
      updated_at = now()
    WHERE
      id = p_user_id;
  ELSE
    RETURN jsonb_build_object('success', FALSE, 'error', 'NO_TICKETS');
  END IF;

  v_dow := extract(
    dow
    FROM
      timezone('Asia/Seoul', now())
  )::smallint;

  INSERT INTO public.votes (user_id, idea_id, day_of_week, weight, weighted_share)
    VALUES (p_user_id, p_idea_id, v_dow, v_weight, v_weight::numeric);

  SELECT
    count(*)::integer INTO v_user_vote_count
  FROM
    public.votes v
  WHERE
    v.user_id = p_user_id;

  IF NOT v_user.first_vote_promo_claimed
  AND v_user_vote_count = 1 THEN
    UPDATE
      public.users
    SET
      first_vote_promo_claimed = TRUE,
      updated_at = now()
    WHERE
      id = p_user_id
      AND NOT first_vote_promo_claimed;

    IF FOUND THEN
      INSERT INTO public.payout_logs (idea_id, user_id, reason, status, amount, vote_sequence)
        VALUES (p_idea_id, p_user_id, 'FIRST_GLOBAL_VOTE_PROMO', 'pending', 5, NULL);
    END IF;
  END IF;

  UPDATE
    public.ideas
  SET
    total_vote_count = total_vote_count + 1,
    weighted_share = weighted_share + v_weight::numeric
  WHERE
    id = p_idea_id
  RETURNING
    * INTO v_idea;

  SELECT
    coalesce(sum(i.weighted_share), 0) INTO week_total
  FROM
    public.ideas i
  WHERE
    i.week_id = w;

  IF week_total > 0 THEN
    prob := round((v_idea.weighted_share::numeric / week_total) * 100::numeric, 4);
  ELSE
    prob := 0;
  END IF;

  IF v_idea.total_vote_count >= 600 THEN
    IF NOT v_idea.creator_payout_forfeited THEN
      INSERT INTO public.payout_logs (idea_id, user_id, reason, status, amount, vote_sequence)
        VALUES (p_idea_id, v_idea.user_id, 'GRADUATION_CREATOR', 'pending', 3000, NULL)
      ON CONFLICT (idea_id)
        WHERE (reason IN ('GRADUATION_CREATOR', 'GRADUATION_600_CREATOR'))
        DO NOTHING;
    END IF;

    FOR rec IN
    SELECT
      sq.user_id,
      sq.pos
    FROM (
      SELECT
        v.user_id,
        (ROW_NUMBER() OVER (ORDER BY v.created_at ASC))::integer AS pos
      FROM
        public.votes v
      WHERE
        v.idea_id = p_idea_id
    ) sq
    LOOP
      INSERT INTO public.payout_logs (idea_id, user_id, reason, status, amount, vote_sequence)
        VALUES (
          p_idea_id,
          rec.user_id,
          'GRADUATION_VOTER',
          'pending',
          CASE rec.pos
            WHEN 1 THEN 1000
            WHEN 150 THEN 500
            WHEN 300 THEN 800
            WHEN 450 THEN 1000
            WHEN 600 THEN 2000
            ELSE 1
          END,
          rec.pos
        )
      ON CONFLICT (idea_id, user_id)
        WHERE (reason = 'GRADUATION_VOTER')
        DO NOTHING;
    END LOOP;

    INSERT INTO public.idea_hall_vote_demographics (idea_id, gender, age_decade, vote_count, recorded_at)
    SELECT
      p_idea_id,
      COALESCE(NULLIF(u.gender, ''), 'unknown') AS gender,
      u.age_decade,
      count(*)::integer AS vote_count,
      now() AS recorded_at
    FROM
      public.votes v
      JOIN public.users u ON u.id = v.user_id
    WHERE
      v.idea_id = p_idea_id
    GROUP BY
      COALESCE(NULLIF(u.gender, ''), 'unknown'),
      u.age_decade
    ON CONFLICT (idea_id, gender, age_decade)
      DO UPDATE SET
        vote_count = EXCLUDED.vote_count,
        recorded_at = EXCLUDED.recorded_at;
  END IF;

  RETURN jsonb_build_object(
    'success',
    TRUE,
    'probability',
    prob::double precision,
    'weight',
    v_weight::integer,
    'weekId',
    w
  );
END;
$body$;
