-- 피드 확인용: 테스트 유저 1명 + 아이디어 5건 (users 0명이어도 실행 가능)
-- Supabase Dashboard → SQL Editor → Run
-- RLS는 postgres 역할로 실행 시 우회됩니다.
--
-- 테스트 유저: toss_user_key = 910000000001 (실서비스 토스 키와 겹치지 않게 큰 고정값)
-- 마이그레이션 014 미적용 시 아래 INSERT ideas 에서 category_tags 열·값만 제거하세요.

DO $$
DECLARE
  v_uid   uuid;
  v_wid   uuid;
BEGIN
  -- 1) 테스트 유저 (이미 있으면 스킵)
  BEGIN
    INSERT INTO public.users (
      toss_user_key,
      display_name,
      free_tickets,
      ad_tickets,
      weekly_upload_count
    )
    VALUES (
      910000000001,
      '피드시드 테스트',
      10,
      0,
      0
    );
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  SELECT id INTO STRICT v_uid
  FROM public.users
  WHERE toss_user_key = 910000000001;

  -- 2) active/fever 주차가 없으면 006과 같이 1건 넣기 (이미 해당 연·주 있으면 스킵)
  INSERT INTO public.weeks (
    year,
    week_number,
    start_at,
    end_at,
    fever_start_at,
    status,
    prize_pool
  )
  VALUES (
    EXTRACT(YEAR FROM NOW())::INT,
    EXTRACT(WEEK FROM NOW())::INT,
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul',
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' + INTERVAL '7 days',
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' + INTERVAL '6 days 23 hours 30 minutes',
    'active',
    10000
  )
  ON CONFLICT (year, week_number) DO NOTHING;

  SELECT id INTO v_wid
  FROM public.weeks
  WHERE status IN ('active', 'fever')
  ORDER BY start_at DESC
  LIMIT 1;

  IF v_wid IS NULL THEN
    RAISE EXCEPTION
      'active/fever 주차가 없습니다. public.weeks 에서 최소 1건 status 를 active 또는 fever 로 맞춘 뒤 다시 실행하세요.';
  END IF;

  -- 3) 아이디어 5건 (같은 스크립트를 여러 번 돌리면 중복 행이 쌓입니다. 정리는 아래 주석 참고)
  INSERT INTO public.ideas (
    creator_id,
    week_id,
    title,
    description,
    category,
    category_tags
  )
  VALUES
    (
      v_uid,
      v_wid,
      '피드 시드 1 · 쇼츠 성장 실험',
      '썸네일 A/B로 쇼츠 조회수 비교하는 2주 실험 기록이에요.',
      'etc',
      ARRAY['쇼츠', '실험']::text[]
    ),
    (
      v_uid,
      v_wid,
      '피드 시드 2 · 브이로그 일상',
      '출퇴근 루틴을 주 3회 올리며 구독자 반응 보는 기획이에요.',
      'etc',
      ARRAY['브이로그']::text[]
    ),
    (
      v_uid,
      v_wid,
      '피드 시드 3 · 알고리즘 분석',
      '추천 탭 노출 패턴을 스프레드시트로 정리하는 교육 콘텐츠예요.',
      'etc',
      ARRAY['교육', '분석']::text[]
    ),
    (
      v_uid,
      v_wid,
      '피드 시드 4 · 라이브 Q&A',
      '주 1회 라이브로 댓글 질문만 받아 답하는 커뮤니티형 기획이에요.',
      'etc',
      ARRAY['라이브', '소통']::text[]
    ),
    (
      v_uid,
      v_wid,
      '피드 시드 5 · 롱폼 시리즈',
      '한 주제 10편 시리즈로 채널 체류시간 늘리는 롱폼 전략이에요.',
      'etc',
      ARRAY['롱폼', '시리즈']::text[]
    );
END $$;

-- 확인
-- SELECT id, display_name, toss_user_key FROM public.users WHERE toss_user_key = 910000000001;
-- SELECT id, title, week_id FROM public.ideas WHERE title LIKE '피드 시드%' ORDER BY created_at DESC;

-- 시드만 지우기 (유저는 남김)
-- DELETE FROM public.ideas WHERE title LIKE '피드 시드%';

-- 테스트 유저까지 지우기 (해당 유저가 만든 아이디어만 있다면)
-- DELETE FROM public.users WHERE toss_user_key = 910000000001;
