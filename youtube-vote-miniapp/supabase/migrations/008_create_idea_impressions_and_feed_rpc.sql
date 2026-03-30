-- ============================================================
-- Migration 008: idea_impressions + personalized feed RPC
-- ============================================================

-- 1) 유저별 아이디어 노출 이력
CREATE TABLE IF NOT EXISTS public.idea_impressions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  idea_id     UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  week_id     UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  action      TEXT NOT NULL DEFAULT 'view' CHECK (action IN ('view', 'pass', 'vote')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idea_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_impressions_user_week_created
  ON public.idea_impressions(user_id, week_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_idea_impressions_week_idea
  ON public.idea_impressions(week_id, idea_id);

ALTER TABLE public.idea_impressions ENABLE ROW LEVEL SECURITY;

-- auth.uid()가 users.id와 동일한 구성 + auth_user_id 매핑 구성 모두 대응
CREATE POLICY "idea_impressions: self read"
  ON public.idea_impressions FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "idea_impressions: self insert"
  ON public.idea_impressions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "idea_impressions: self update"
  ON public.idea_impressions FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_id
        AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_id
        AND u.auth_user_id = auth.uid()
    )
  );

-- 2) 유저별 미시청 + 부스트 우선 피드 조회
CREATE OR REPLACE FUNCTION public.fetch_feed_ideas_page(
  p_user_id UUID,
  p_week_id UUID,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS SETOF public.ideas
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH unseen AS (
    SELECT i.*
    FROM public.ideas i
    LEFT JOIN public.idea_impressions im
      ON im.idea_id = i.id
     AND im.user_id = p_user_id
    WHERE i.week_id = p_week_id
      AND im.id IS NULL
  )
  SELECT *
  FROM unseen
  ORDER BY
    CASE
      WHEN is_boosted = true AND (boost_expires_at IS NULL OR boost_expires_at > NOW()) THEN 0
      ELSE 1
    END ASC,
    md5(id::text || ':' || p_user_id::text) ASC
  OFFSET GREATEST(p_offset, 0)
  LIMIT GREATEST(p_limit, 1);
$$;
