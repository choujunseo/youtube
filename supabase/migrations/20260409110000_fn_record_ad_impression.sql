-- ad_type 체크 제약을 전체 허용 목록으로 통합 (이전 마이그레이션 파편 정리)
ALTER TABLE public.ad_logs
DROP CONSTRAINT IF EXISTS ad_logs_type;

ALTER TABLE public.ad_logs
ADD CONSTRAINT ad_logs_type CHECK (
  ad_type IN (
    'ticket_recharge',
    'boost',
    'boost_charge_recharge',
    'hall_gate_interstitial',
    'feed_top_banner_impression',
    'upload_bonus',
    'share_viral'
  )
);

-- record_ad_impression: 광고 노출·완료 기록 전용 RPC.
-- 직접 INSERT(RLS 의존)와 달리 SECURITY DEFINER로 실행돼 RLS 매핑 오류를 제거한다.
-- 성공/실패를 jsonb로 명시적으로 반환해 클라이언트가 조용히 누락하지 않게 한다.
CREATE OR REPLACE FUNCTION public.record_ad_impression (
  p_user_id uuid,
  p_ad_type text,
  p_ad_group_id text,
  p_reward_amount integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  -- 세션 → users.id 매핑. current_user_id()가 없으면 auth.uid() 직접 비교로 폴백
  BEGIN
    v_caller_id := public.current_user_id();
  EXCEPTION WHEN undefined_function THEN
    v_caller_id := auth.uid();
  END;

  -- 호출자 본인 데이터만 삽입 허용
  IF p_user_id IS DISTINCT FROM v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  -- ad_type 값이 허용 목록인지 미리 검사 (제약 위반 에러 대신 명시적 반환)
  IF p_ad_type NOT IN (
    'ticket_recharge',
    'boost',
    'boost_charge_recharge',
    'hall_gate_interstitial',
    'feed_top_banner_impression',
    'upload_bonus',
    'share_viral'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AD_TYPE');
  END IF;

  INSERT INTO public.ad_logs (user_id, ad_type, ad_group_id, reward_amount)
  VALUES (p_user_id, p_ad_type, p_ad_group_id, COALESCE(p_reward_amount, 0));

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.record_ad_impression (uuid, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ad_impression (uuid, text, text, integer) TO authenticated;
