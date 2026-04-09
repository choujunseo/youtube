-- 피드에서 p_user_id 가 이미 투표한 아이디어는 제외 (본인 작성 제외와 함께).
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
AS $$
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
    coalesce(u.display_name, '') AS creator_display_name,
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
      AND NOT u.is_deleted
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
$$;
