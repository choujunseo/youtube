-- ============================================================
-- Migration 002: Create Indexes
-- ============================================================

-- votes: 중복 투표 방지 (user당 idea 1회)
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_user_idea
  ON votes(user_id, idea_id);

-- votes: 확률 계산용 (idea별 weighted_share 합산)
CREATE INDEX IF NOT EXISTS idx_votes_idea_weight
  ON votes(idea_id) INCLUDE (weighted_share);

-- ideas: 피드 쿼리 (주차별 최신순, 부스트 우선)
CREATE INDEX IF NOT EXISTS idx_ideas_week_created
  ON ideas(week_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ideas_week_boosted
  ON ideas(week_id, is_boosted, boost_expires_at);

-- ideas: 랭킹 쿼리 (주차별 weighted_shares 내림차순)
CREATE INDEX IF NOT EXISTS idx_ideas_week_ranking
  ON ideas(week_id, total_weighted_shares DESC);

-- votes: 유저의 주차별 투표 조회
CREATE INDEX IF NOT EXISTS idx_votes_user_week
  ON votes(user_id, week_id);

-- users: 주간 티켓 리셋 대상 조회
CREATE INDEX IF NOT EXISTS idx_users_ticket_reset
  ON users(ticket_reset_at);
