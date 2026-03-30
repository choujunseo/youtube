-- 비로그인(anon) 피드 RPC · 라이브 랭킹 뷰 조회 허용
GRANT SELECT ON public.mv_live_ranking TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fetch_feed_ideas_page(uuid, uuid, integer, integer) TO anon, authenticated;
