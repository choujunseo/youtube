CREATE OR REPLACE FUNCTION public.fetch_feed_ideas_page (
  p_user_id uuid,
  p_limit integer,
  p_offset integer
)
RETURNS TABLE (
  id uuid,
  creator_id uuid,
  creator_display_name text,
  title text,
  description text,
  thumbnail_url text,
  category text,
  category_tags text[],
  total_vote_count integer,
  total_weighted_shares numeric,
  is_boosted boolean,
  boost_expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  w text := public.current_week_id_kst ();
  week_total numeric;
BEGIN
  SELECT
    coalesce(sum(i.weighted_share), 0) INTO week_total
  FROM
    public.ideas i
  WHERE
    i.week_id = w;

  RETURN QUERY
  SELECT
    i.id,
    i.user_id AS creator_id,
    CASE
      WHEN u.id IS NULL THEN '알 수 없음'
      WHEN u.is_deleted THEN '알 수 없음'
      WHEN nullif(trim(u.display_name), '') IS NULL THEN '알 수 없음'
      ELSE trim(u.display_name)
    END AS creator_display_name,
    i.title,
    i.description,
    i.thumbnail_url,
    i.category,
    i.category_tags,
    i.total_vote_count,
    week_total AS total_weighted_shares,
    i.is_boosted,
    i.boost_expires_at,
    i.created_at
  FROM
    public.ideas i
    LEFT JOIN public.users u ON u.id = i.user_id
  WHERE
    i.week_id = w
    AND i.total_vote_count < 600
    AND i.user_id IS DISTINCT FROM p_user_id
    AND NOT EXISTS (
      SELECT
        1
      FROM
        public.votes v
      WHERE
        v.idea_id = i.id
        AND v.user_id = p_user_id
    )
  ORDER BY
    i.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$body$;
