-- ============================================================
-- Migration 005: Materialized View for Live Ranking
-- Fever Time (일요일 23:30~00:00 KST) 동안 5초마다 갱신
-- ============================================================

-- 라이브 랭킹 머테리얼라이즈드 뷰
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_live_ranking AS
  SELECT
    i.id                      AS idea_id,
    i.title,
    i.creator_id,
    u.display_name            AS creator_name,
    i.total_weighted_shares,
    i.total_vote_count,
    i.is_boosted,
    RANK() OVER (
      ORDER BY i.total_weighted_shares DESC
    )                         AS rank
  FROM ideas i
  JOIN users u ON u.id = i.creator_id
  WHERE i.week_id = (
    SELECT id FROM weeks
    WHERE status IN ('active', 'fever')
    ORDER BY start_at DESC
    LIMIT 1
  )
  ORDER BY total_weighted_shares DESC
  LIMIT 10;

-- 동시 갱신을 위한 UNIQUE 인덱스 (CONCURRENTLY 갱신 조건)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_live_ranking_idea_id
  ON mv_live_ranking(idea_id);

-- ────────────────────────────────────────────────────────────
-- pg_cron 등록 (Supabase Dashboard > Extensions에서 pg_cron 활성화 후 실행)
-- Fever Time 구간에서만 실행하고 싶다면 Edge Function에서 트리거 권장
-- ────────────────────────────────────────────────────────────
-- SELECT cron.schedule(
--   'refresh_live_ranking',
--   '*/1 * * * *',
--   $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_live_ranking$$
-- );

-- ────────────────────────────────────────────────────────────
-- 수동 갱신 함수 (Edge Function에서 호출)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_live_ranking()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_live_ranking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
