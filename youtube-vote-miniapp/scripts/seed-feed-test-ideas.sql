-- 피드·명예의 전당 확인용 시드 (users 7명 + 아이디어 6건)
-- Supabase Dashboard → SQL Editor → postgres 로 실행
-- 주차(weeks) / week_id 미사용 — 마일스톤 스키마(027+) 기준
--
-- 피드: 작성자별 닉네임(display_name)이 달라 카드 상단 닉네임이 시드마다 다르게 보입니다.
-- 피드 시드 3: total_vote_count = 2 (극초기 배지 확인용)
-- 명예의 전당: total_vote_count >= 600 인 아이디어 1건 + 첫 표 수령자 payout_logs(MILESTONE_600_RANK_1)
--
-- 재실행 시 같은 제목 아이디어·관련 로그를 먼저 지우고 다시 넣습니다.

DO $$
DECLARE
  v_u1   uuid;
  v_u2   uuid;
  v_u3   uuid;
  v_u4   uuid;
  v_u5   uuid;
  v_hall_creator uuid;
  v_first_voter  uuid;
  v_hall_idea    uuid;
BEGIN
  -- ── 피드용 작성자 5명 (고정 toss_user_key, 닉네임 더미)
  INSERT INTO public.users (
    toss_user_key,
    display_name,
    free_tickets,
    ad_tickets
  )
  VALUES
    (910000000101, '시드닉네임·쇼츠', 10, 0),
    (910000000102, '시드닉네임·브이로그', 10, 0),
    (910000000103, '시드닉네임·교육', 10, 0),
    (910000000104, '시드닉네임·라이브', 10, 0),
    (910000000105, '시드닉네임·롱폼', 10, 0)
  ON CONFLICT (toss_user_key) WHERE (toss_user_key IS NOT NULL)
  DO UPDATE SET display_name = EXCLUDED.display_name;

  SELECT id INTO STRICT v_u1 FROM public.users WHERE toss_user_key = 910000000101;
  SELECT id INTO STRICT v_u2 FROM public.users WHERE toss_user_key = 910000000102;
  SELECT id INTO STRICT v_u3 FROM public.users WHERE toss_user_key = 910000000103;
  SELECT id INTO STRICT v_u4 FROM public.users WHERE toss_user_key = 910000000104;
  SELECT id INTO STRICT v_u5 FROM public.users WHERE toss_user_key = 910000000105;

  -- 명예의 전당: 크리에이터 + 첫 투표자(더미)
  INSERT INTO public.users (
    toss_user_key,
    display_name,
    free_tickets,
    ad_tickets
  )
  VALUES
    (910000000201, '명예더미·크리에이터', 10, 0),
    (910000000202, '명예더미·첫투표', 10, 0)
  ON CONFLICT (toss_user_key) WHERE (toss_user_key IS NOT NULL)
  DO UPDATE SET display_name = EXCLUDED.display_name;

  SELECT id INTO STRICT v_hall_creator FROM public.users WHERE toss_user_key = 910000000201;
  SELECT id INTO STRICT v_first_voter FROM public.users WHERE toss_user_key = 910000000202;

  -- 기존 시드/명예 더미 정리 (FK 순서)
  DELETE FROM public.idea_impressions
  WHERE idea_id IN (
    SELECT id FROM public.ideas
    WHERE title IN (
      '피드 시드 1 · 쇼츠 성장 실험',
      '피드 시드 2 · 브이로그 일상',
      '피드 시드 3 · 알고리즘 분석',
      '피드 시드 4 · 라이브 Q&A',
      '피드 시드 5 · 롱폼 시리즈',
      '명예의 전당 더미 · 600표 클럽'
    )
  );
  DELETE FROM public.votes
  WHERE idea_id IN (
    SELECT id FROM public.ideas
    WHERE title IN (
      '피드 시드 1 · 쇼츠 성장 실험',
      '피드 시드 2 · 브이로그 일상',
      '피드 시드 3 · 알고리즘 분석',
      '피드 시드 4 · 라이브 Q&A',
      '피드 시드 5 · 롱폼 시리즈',
      '명예의 전당 더미 · 600표 클럽'
    )
  );
  DELETE FROM public.payout_logs
  WHERE idea_id IN (
    SELECT id FROM public.ideas
    WHERE title IN (
      '피드 시드 1 · 쇼츠 성장 실험',
      '피드 시드 2 · 브이로그 일상',
      '피드 시드 3 · 알고리즘 분석',
      '피드 시드 4 · 라이브 Q&A',
      '피드 시드 5 · 롱폼 시리즈',
      '명예의 전당 더미 · 600표 클럽'
    )
  );
  DELETE FROM public.ideas
  WHERE title IN (
    '피드 시드 1 · 쇼츠 성장 실험',
    '피드 시드 2 · 브이로그 일상',
    '피드 시드 3 · 알고리즘 분석',
    '피드 시드 4 · 라이브 Q&A',
    '피드 시드 5 · 롱폼 시리즈',
    '명예의 전당 더미 · 600표 클럽'
  );

  INSERT INTO public.ideas (
    creator_id,
    title,
    description,
    category,
    category_tags,
    total_vote_count,
    total_weighted_shares
  )
  VALUES
    (
      v_u1,
      '피드 시드 1 · 쇼츠 성장 실험',
      '썸네일 A/B로 쇼츠 조회수 비교하는 2주 실험 기록이에요.',
      'etc',
      ARRAY['쇼츠', '실험']::text[],
      0,
      0
    ),
    (
      v_u2,
      '피드 시드 2 · 브이로그 일상',
      '출퇴근 루틴을 주 3회 올리며 구독자 반응 보는 기획이에요.',
      'etc',
      ARRAY['브이로그']::text[],
      0,
      0
    ),
    (
      v_u3,
      '피드 시드 3 · 알고리즘 분석',
      '추천 탭 노출 패턴을 스프레드시트로 정리하는 교육 콘텐츠예요.',
      'etc',
      ARRAY['교육', '분석']::text[],
      2,
      2
    ),
    (
      v_u4,
      '피드 시드 4 · 라이브 Q&A',
      '주 1회 라이브로 댓글 질문만 받아 답하는 커뮤니티형 기획이에요.',
      'etc',
      ARRAY['라이브', '소통']::text[],
      0,
      0
    ),
    (
      v_u5,
      '피드 시드 5 · 롱폼 시리즈',
      '한 주제 10편 시리즈로 채널 체류시간 늘리는 롱폼 전략이에요.',
      'etc',
      ARRAY['롱폼', '시리즈']::text[],
      0,
      0
    ),
    (
      v_hall_creator,
      '명예의 전당 더미 · 600표 클럽',
      '로컬/스테이징에서 명예의 전당 UI를 확인하기 위한 더미 아이디어입니다.',
      'etc',
      ARRAY['더미', '명예']::text[],
      600,
      600
    );

  SELECT id INTO STRICT v_hall_idea
  FROM public.ideas
  WHERE title = '명예의 전당 더미 · 600표 클럽';

  INSERT INTO public.payout_logs (user_id, idea_id, amount, reason, status)
  VALUES (v_first_voter, v_hall_idea, 1000, 'MILESTONE_600_RANK_1', 'pending');
END $$;

-- 피드가 비어 있을 때 (/ 메인 «지금은 보여 줄 아이디어가 없어요»)
-- 1) 후보 글이 DB에 있는지: total_vote_count < 600 이고 작성자가 users에 있어야 RPC에 잡힘 (028+)
--    SELECT COUNT(*) FROM public.ideas i
--    INNER JOIN public.users u ON u.id = i.creator_id
--    WHERE i.total_vote_count < 600;
-- 2) 로그인한 계정으로 이미 본 적 있으면 idea_impressions 때문에 목록이 비게 됨 → 테스트 시 해당 유저 행 삭제
--    DELETE FROM public.idea_impressions WHERE user_id = '<public.users.id>';
-- 3) 시드만 다시 쌓기 전에 027+ 스키마인지, fetch_feed_ideas_page(028) 적용 여부 확인

-- 확인 예시
-- SELECT toss_user_key, display_name FROM public.users WHERE toss_user_key BETWEEN 910000000101 AND 910000000202 OR toss_user_key BETWEEN 910000000201 AND 910000000202 ORDER BY toss_user_key;
-- SELECT title, total_vote_count FROM public.ideas WHERE title LIKE '피드 시드%' OR title LIKE '명예의 전당 더미%' ORDER BY title;

-- 시드만 지우기(유저 행은 유지하고 싶을 때는 ideas / 의존 행만 삭제)
-- DELETE FROM public.idea_impressions WHERE idea_id IN (SELECT id FROM public.ideas WHERE title LIKE '피드 시드%' OR title = '명예의 전당 더미 · 600표 클럽');
-- DELETE FROM public.votes WHERE idea_id IN (SELECT id FROM public.ideas WHERE title LIKE '피드 시드%' OR title = '명예의 전당 더미 · 600표 클럽');
-- DELETE FROM public.payout_logs WHERE idea_id IN (SELECT id FROM public.ideas WHERE title LIKE '피드 시드%' OR title = '명예의 전당 더미 · 600표 클럽');
-- DELETE FROM public.ideas WHERE title LIKE '피드 시드%' OR title = '명예의 전당 더미 · 600표 클럽';
