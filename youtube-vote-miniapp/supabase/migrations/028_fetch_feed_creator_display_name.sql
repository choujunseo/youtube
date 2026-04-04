-- 피드 RPC에 작성자 닉네임(users.display_name) 포함
-- RETURNS SETOF ideas → 컬럼 추가를 위해 TABLE 반환으로 변경 (반환 타입 변경이므로 DROP 후 CREATE)

DROP FUNCTION IF EXISTS public.fetch_feed_ideas_page(uuid, integer, integer);

CREATE FUNCTION public.fetch_feed_ideas_page(
  p_user_id UUID,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT,
  total_vote_count INT,
  total_weighted_shares NUMERIC,
  is_boosted BOOLEAN,
  boost_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  category_tags TEXT[],
  creator_display_name TEXT
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH unseen AS (
    SELECT
      i.id,
      i.creator_id,
      i.title,
      i.description,
      i.thumbnail_url,
      i.category,
      i.total_vote_count,
      i.total_weighted_shares,
      i.is_boosted,
      i.boost_expires_at,
      i.created_at,
      i.category_tags,
      COALESCE(u.display_name, '') AS creator_display_name
    FROM public.ideas i
    LEFT JOIN public.users u ON u.id = i.creator_id
    LEFT JOIN public.idea_impressions im
      ON im.idea_id = i.id
     AND im.user_id = p_user_id
    WHERE i.total_vote_count < 1500
      AND i.creator_id <> p_user_id
      AND im.id IS NULL
  )
  SELECT
    unseen.id,
    unseen.creator_id,
    unseen.title,
    unseen.description,
    unseen.thumbnail_url,
    unseen.category,
    unseen.total_vote_count,
    unseen.total_weighted_shares,
    unseen.is_boosted,
    unseen.boost_expires_at,
    unseen.created_at,
    unseen.category_tags,
    unseen.creator_display_name
  FROM unseen
  ORDER BY
    CASE
      WHEN unseen.is_boosted = true
        AND (unseen.boost_expires_at IS NULL OR unseen.boost_expires_at > NOW())
      THEN 0
      ELSE 1
    END ASC,
    md5(unseen.id::text || ':' || p_user_id::text) ASC
  OFFSET GREATEST(p_offset, 0)
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.fetch_feed_ideas_page(uuid, integer, integer) TO anon, authenticated;
