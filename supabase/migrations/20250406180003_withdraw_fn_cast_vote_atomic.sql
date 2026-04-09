-- 졸업 시 구버전 payout 2건 모델(다음 마이그레이션 06200001에서 전체 치환)
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
  first_voter uuid;
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
    SELECT
      v.user_id INTO first_voter
    FROM
      public.votes v
    WHERE
      v.idea_id = p_idea_id
    ORDER BY
      v.created_at ASC
    LIMIT 1;

    IF NOT v_idea.creator_payout_forfeited THEN
      INSERT INTO public.payout_logs (idea_id, user_id, reason, status, amount)
        VALUES (p_idea_id, v_idea.user_id, 'GRADUATION_600_CREATOR', 'pending', 0);
    END IF;

    IF first_voter IS NOT NULL THEN
      INSERT INTO public.payout_logs (idea_id, user_id, reason, status, amount)
        VALUES (p_idea_id, first_voter, 'GRADUATION_600_FIRST_VOTER', 'pending', 0);
    END IF;
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
