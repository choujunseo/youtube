-- 졸업(idea_id)당 창작자·투표자 지급 행은 1회만 (동일 유저는 다른 아이디어 졸업에서는 또 받을 수 있음)

CREATE UNIQUE INDEX uniq_payout_graduation_creator_per_idea ON public.payout_logs (idea_id)
WHERE
  reason IN (
    'GRADUATION_CREATOR',
    'GRADUATION_600_CREATOR'
  );

CREATE UNIQUE INDEX uniq_payout_graduation_voter_per_idea_user ON public.payout_logs (idea_id, user_id)
WHERE
  reason = 'GRADUATION_VOTER';

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
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
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
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
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

  IF v_idea.week_id IS DISTINCT FROM w THEN
    RETURN jsonb_build_object('success', false, 'error', 'IDEA_NOT_IN_CURRENT_WEEK');
  END IF;

  IF v_idea.total_vote_count >= 600 THEN
    RETURN jsonb_build_object('success', false, 'error', 'IDEA_GRADUATED');
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
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_VOTED');
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
    RETURN jsonb_build_object('success', false, 'error', 'NO_TICKETS');
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
  END IF;

  RETURN jsonb_build_object(
    'success',
    true,
    'probability',
    prob::double precision,
    'weight',
    v_weight::integer,
    'weekId',
    w
  );
END;
$body$;
