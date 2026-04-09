import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { bridgeAppLogin } from '@/utils/tossBridge';
import { exchangeToken, unlinkTossLogin, withdrawAccount } from '@/services/authService';
import { supabase } from '@/services/supabase';
import type { IUser } from '@/types/user';

type AuthStatus = 'idle' | 'loading' | 'success' | 'error';

function toIUser(row: Record<string, unknown>): IUser {
  const id = row.id as string;
  const authUid =
    row.auth_user_id != null && String(row.auth_user_id).trim() !== ''
      ? String(row.auth_user_id)
      : id;
  return {
    id,
    authUserId: authUid,
    tossUserKey: row.toss_user_key as number,
    displayName: row.display_name as string,
    gender:
      row.gender === 'male' || row.gender === 'female' || row.gender === 'other' || row.gender === 'unknown'
        ? (row.gender as IUser['gender'])
        : null,
    ageDecade: typeof row.age_decade === 'number' ? row.age_decade : null,
    freeTickets: row.free_tickets as number,
    adTickets: row.ad_tickets as number,
    boostCharges: Number(row.boost_charges ?? 0),
    weeklyUploadCount: row.weekly_upload_count as number,
    hasBonusUpload: row.has_bonus_upload as boolean,
    ticketResetAt: row.ticket_reset_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

type TLoginMode = 'auto' | 'interactive';

export type TLoginResult =
  | { ok: true }
  | { ok: false; message: string; skipped?: boolean };

export function useAuth() {
  const location = useLocation();
  const [authHydrated, setAuthHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) return;
    return useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
  }, []);
  const { isLoggedIn, user, setAuth, clearAuth } = useAuthStore();
  const isPreviewMode = import.meta.env.VITE_IS_MOCK === 'true';
  const [status, setStatus] = useState<AuthStatus>(isPreviewMode ? 'success' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const hasTriedAutoRef = useRef(false);

  const login = useCallback(
    async (mode: TLoginMode = 'auto'): Promise<TLoginResult> => {
      if (mode === 'auto' && hasTriedAutoRef.current) {
        return { ok: false, message: '', skipped: true };
      }
      if (mode === 'auto') hasTriedAutoRef.current = true;

      setError(null);

      try {
        // 토스 네이티브 로그인 시트: 사용자 탭 직후 가능한 한 빨리 브릿지를 호출(setState보다 먼저 시작)
        const appLoginPromise = bridgeAppLogin();
        if (mode === 'interactive') setStatus('loading');
        const { authorizationCode, referrer } = await appLoginPromise;

        const {
          accessToken,
          tossUserKey,
          user: userRow,
          authLinked,
          profileNameDecrypted,
        } = await exchangeToken(authorizationCode, referrer);

        const userData = toIUser(userRow);

        setAuth({
          tossUserKey,
          accessToken,
          user: userData,
          authLinked,
          profileNameDecrypted,
        });
        setStatus('success');
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        setStatus('error');
        clearAuth();
        if (mode === 'auto') hasTriedAutoRef.current = false;
        return { ok: false, message };
      }
    },
    [setAuth, clearAuth],
  );

  /** 웰컴(`/`)에서는 자동 appLogin 지연 — 「다음」에서 interactive 로그인 */
  const isWelcomePath = location.pathname === '/';

  /**
   * DB 리셋·원격 truncate 후에도 localStorage persist에 옛 user가 남으면
   * 「개발우회 님」처럼 보이고 로그인을 건너뜀 → 서버에 행이 없으면 클라이언트 세션 제거.
   */
  useEffect(() => {
    if (!authHydrated || !isLoggedIn || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        clearAuth();
        await supabase.auth.signOut();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, isLoggedIn, user?.id, clearAuth]);

  useEffect(() => {
    if (!authHydrated) return;
    if (isPreviewMode) return;
    if (isWelcomePath || isLoggedIn) return;
    queueMicrotask(() => void login('auto'));
  }, [authHydrated, isPreviewMode, isWelcomePath, isLoggedIn, login]);

  const unlinkToss = useCallback(async (): Promise<TLoginResult> => {
    setError(null);
    try {
      await unlinkTossLogin();
      hasTriedAutoRef.current = false;
      setStatus('idle');
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : '연결 끊기에 실패했어요.';
      setError(message);
      return { ok: false, message };
    }
  }, []);

  const withdraw = useCallback(async (): Promise<TLoginResult> => {
    setError(null);
    try {
      await withdrawAccount();
      hasTriedAutoRef.current = false;
      setStatus('idle');
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : '탈퇴에 실패했어요.';
      setError(message);
      return { ok: false, message };
    }
  }, []);

  return {
    isLoggedIn,
    user,
    status,
    error,
    login,
    unlinkToss,
    withdraw,
    authHydrated,
  };
}
