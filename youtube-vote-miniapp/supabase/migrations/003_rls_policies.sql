-- ============================================================
-- Migration 003: Row Level Security Policies
-- ============================================================

-- RLS 활성화
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- users
-- ────────────────────────────────────────────────────────────
-- 자신의 프로필만 읽기 가능
CREATE POLICY "users: self read"
  ON users FOR SELECT
  USING (id = auth.uid());

-- 자신의 프로필만 업데이트 가능 (티켓 등)
CREATE POLICY "users: self update"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- 최초 가입 시 자신의 row INSERT 허용
CREATE POLICY "users: self insert"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- weeks
-- ────────────────────────────────────────────────────────────
-- 모든 유저가 주차 정보 읽기 가능
CREATE POLICY "weeks: public read"
  ON weeks FOR SELECT
  USING (true);

-- ────────────────────────────────────────────────────────────
-- ideas
-- ────────────────────────────────────────────────────────────
-- 모든 유저가 아이디어 읽기 가능
CREATE POLICY "ideas: public read"
  ON ideas FOR SELECT
  USING (true);

-- 본인만 아이디어 등록 가능
CREATE POLICY "ideas: creator insert"
  ON ideas FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- 본인 아이디어만 수정 가능
CREATE POLICY "ideas: creator update"
  ON ideas FOR UPDATE
  USING (creator_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- votes
-- ────────────────────────────────────────────────────────────
-- 투표는 INSERT 전용 (수정/삭제 불가 - 비철회 원칙)
CREATE POLICY "votes: user insert only"
  ON votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 자신의 투표 내역만 읽기 가능
CREATE POLICY "votes: self read"
  ON votes FOR SELECT
  USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- ad_logs
-- ────────────────────────────────────────────────────────────
-- 자신의 광고 로그만 읽기/쓰기 가능
CREATE POLICY "ad_logs: self read"
  ON ad_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ad_logs: self insert"
  ON ad_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- weekly_results
-- ────────────────────────────────────────────────────────────
-- 결산 결과는 모든 유저가 읽기 가능
CREATE POLICY "weekly_results: public read"
  ON weekly_results FOR SELECT
  USING (true);
