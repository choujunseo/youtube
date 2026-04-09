CREATE OR REPLACE FUNCTION public.week_weight_total_for_idea (p_idea_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN NOT EXISTS (
      SELECT
        1
      FROM
        public.ideas x
      WHERE
        x.id = p_idea_id
    ) THEN
      0::numeric
    ELSE
      coalesce((
        SELECT
          sum(i.weighted_share)
        FROM
          public.ideas i
        WHERE
          i.week_id = (
            SELECT
              i2.week_id
            FROM
              public.ideas i2
            WHERE
              i2.id = p_idea_id
          )
      ), 0::numeric)
    END;
$$;
