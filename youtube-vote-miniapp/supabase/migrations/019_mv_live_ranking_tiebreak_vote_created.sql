-- 실시간 랭킹: 가중 점수 동률 시 투표 수, 그다음 먼저 등록한 아이디어가 위로 (settle_week와 동일 규칙)

DROP MATERIALIZED VIEW IF EXISTS public.mv_live_ranking;

CREATE MATERIALIZED VIEW public.mv_live_ranking AS
SELECT
  i.id                      AS idea_id,
  i.week_id,
  i.title,
  i.description,
  i.creator_id,
  u.display_name            AS creator_name,
  i.category                AS category,
  i.category_tags           AS category_tags,
  i.total_weighted_shares,
  i.total_vote_count,
  i.is_boosted,
  i.boost_expires_at,
  RANK() OVER (
    ORDER BY
      i.total_weighted_shares DESC,
      i.total_vote_count DESC,
      i.created_at ASC
  )                         AS rank
FROM public.ideas i
INNER JOIN public.users u ON u.id = i.creator_id
WHERE i.week_id = (
  SELECT w.id
  FROM public.weeks w
  WHERE w.status IN ('active', 'fever')
  ORDER BY w.start_at DESC
  LIMIT 1
)
ORDER BY
  i.total_weighted_shares DESC,
  i.total_vote_count DESC,
  i.created_at ASC
LIMIT 10;

CREATE UNIQUE INDEX idx_mv_live_ranking_idea_id
  ON public.mv_live_ranking(idea_id);

GRANT SELECT ON public.mv_live_ranking TO anon, authenticated;

REFRESH MATERIALIZED VIEW public.mv_live_ranking;
