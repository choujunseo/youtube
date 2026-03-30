-- ============================================================
-- Migration 004: cast_vote_atomic Postgres Function
-- 투표 원자적 처리 (티켓 차감 + 투표 삽입 + 카운터 업데이트)
-- Edge Function에서 service_role key로 RPC 호출
-- ============================================================

CREATE OR REPLACE FUNCTION cast_vote_atomic(
  p_user_id UUID,
  p_idea_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_week_id             UUID;
  v_free_tickets        INT;
  v_ad_tickets          INT;
  v_day_weight          INT;
  v_existing_vote       UUID;
  v_new_total           NUMERIC;
  v_user_share          NUMERIC;
BEGIN
  -- 1. 이미 투표했는지 확인 (UNIQUE 제약과 이중 방어)
  SELECT id INTO v_existing_vote
    FROM votes
    WHERE user_id = p_user_id AND idea_id = p_idea_id;

  IF v_existing_vote IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_VOTED');
  END IF;

  -- 2. 현재 활성 주차 조회
  SELECT id INTO v_week_id
    FROM weeks
    WHERE status IN ('active', 'fever')
    ORDER BY start_at DESC
    LIMIT 1;

  IF v_week_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_WEEK');
  END IF;

  -- 3. 해당 아이디어가 현재 주차 것인지 검증
  IF NOT EXISTS (SELECT 1 FROM ideas WHERE id = p_idea_id AND week_id = v_week_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'IDEA_NOT_IN_CURRENT_WEEK');
  END IF;

  -- 4. 티켓 확인 및 차감 (row lock으로 동시성 방어)
  SELECT free_tickets, ad_tickets
    INTO v_free_tickets, v_ad_tickets
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

  IF v_free_tickets <= 0 AND v_ad_tickets <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_TICKETS');
  END IF;

  -- 무료 티켓 우선 차감
  IF v_free_tickets > 0 THEN
    UPDATE users SET free_tickets = free_tickets - 1, updated_at = NOW()
      WHERE id = p_user_id;
  ELSE
    UPDATE users SET ad_tickets = ad_tickets - 1, updated_at = NOW()
      WHERE id = p_user_id;
  END IF;

  -- 5. 요일 가중치 계산 (KST 기준)
  v_day_weight := CASE EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Seoul')
    WHEN 1 THEN 3  -- 월
    WHEN 2 THEN 3  -- 화
    WHEN 3 THEN 3  -- 수
    WHEN 4 THEN 2  -- 목
    WHEN 5 THEN 2  -- 금
    WHEN 6 THEN 2  -- 토
    ELSE 1         -- 일
  END;

  -- 6. 투표 행 삽입
  INSERT INTO votes (user_id, idea_id, week_id, day_of_week, weight, weighted_share)
  VALUES (
    p_user_id,
    p_idea_id,
    v_week_id,
    EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Seoul')::INT,
    v_day_weight,
    v_day_weight
  );

  -- 7. ideas 비정규화 카운터 업데이트
  UPDATE ideas
    SET
      total_vote_count      = total_vote_count + 1,
      total_weighted_shares = total_weighted_shares + v_day_weight
    WHERE id = p_idea_id
  RETURNING total_weighted_shares INTO v_new_total;

  -- 8. 유저의 해당 아이디어 당첨 확률 반환
  v_user_share := v_day_weight;

  RETURN jsonb_build_object(
    'success',      true,
    'probability',  ROUND((v_user_share / v_new_total) * 100, 2),
    'weight',       v_day_weight,
    'weekId',       v_week_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
