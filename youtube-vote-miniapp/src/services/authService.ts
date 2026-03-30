import { supabase } from '@/services/supabase';
import type { ITokenExchangeResponse } from '@/types/user';

/**
 * RLS(auth.uid)와 `public.users.auth_user_id`를 맞추기 위해,
 * Edge 호출 전에 Supabase Auth 세션이 있어야 한다.
 * Dashboard → Authentication → Providers → Anonymous sign-in 활성화 필요.
 */
export async function ensureSupabaseAuthSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) return;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(
      `Supabase 익명 로그인 실패: ${error.message}. 프로젝트에서 Anonymous providers를 켜 주세요.`,
    );
  }
}

/**
 * Toss authorizationCode를 Edge Function을 통해 accessToken + userKey로 교환.
 * Edge Function은 S2S로 Toss 서버와 통신하므로 클라이언트에 secret이 노출되지 않음.
 * invoke 시 현재 Supabase 세션 JWT가 헤더로 전달되어 `users.auth_user_id`에 연결된다.
 */
export async function exchangeToken(
  authorizationCode: string,
  referrer: string,
): Promise<ITokenExchangeResponse> {
  await ensureSupabaseAuthSession();

  const { data, error } = await supabase.functions.invoke<ITokenExchangeResponse>(
    'auth-token-exchange',
    {
      body: { authorizationCode, referrer },
    },
  );

  if (error || !data) {
    throw new Error(error?.message ?? 'Token exchange failed');
  }

  return data;
}

/**
 * toss_user_key로 users 행 조회.
 */
export async function fetchUserByTossKey(tossUserKey: number) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('toss_user_key', tossUserKey)
    .single();

  if (error) {
    throw new Error(`fetchUser failed: ${error.message}`);
  }

  return data;
}
