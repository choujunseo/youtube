import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
/** 끝의 `/` 는 Functions URL 조합 시 이슈를 일으킬 수 있어 제거 */
const supabaseUrl = rawUrl.replace(/\/+$/, '');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    /** 익명 Supabase 세션 유지 → `functions.invoke` 시 JWT 전달·RLS 연동이 앱 탭 생존 동안 안정적 */
    persistSession: true,
    storageKey: 'youtube-vote-miniapp-supabase-auth',
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
