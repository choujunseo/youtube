import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { bridgeAppLogin } from '@/utils/tossBridge';
import { exchangeToken } from '@/services/authService';
import type { IUser } from '@/types/user';

type AuthStatus = 'idle' | 'loading' | 'success' | 'error';

function toIUser(row: Record<string, unknown>): IUser {
  return {
    id: row.id as string,
    tossUserKey: row.toss_user_key as number,
    displayName: row.display_name as string,
    freeTickets: row.free_tickets as number,
    adTickets: row.ad_tickets as number,
    weeklyUploadCount: row.weekly_upload_count as number,
    hasBonusUpload: row.has_bonus_upload as boolean,
    ticketResetAt: row.ticket_reset_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

type TLoginMode = 'auto' | 'interactive';

export function useAuth() {
  const location = useLocation();
  const [authHydrated, setAuthHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setAuthHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
    return unsub;
  }, []);
  const { isLoggedIn, user, setAuth, clearAuth } = useAuthStore();
  const isPreviewMode = import.meta.env.VITE_IS_MOCK === 'true';
  const [status, setStatus] = useState<AuthStatus>(isPreviewMode ? 'success' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const hasTriedAutoRef = useRef(false);

  const login = useCallback(
    async (mode: TLoginMode = 'auto'): Promise<boolean> => {
      if (mode === 'auto' && hasTriedAutoRef.current) return false;
      if (mode === 'auto') hasTriedAutoRef.current = true;

      setError(null);
      if (mode === 'interactive') setStatus('loading');

      try {
        const { authorizationCode, referrer } = await bridgeAppLogin();

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
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        setStatus('error');
        clearAuth();
        if (mode === 'auto') hasTriedAutoRef.current = false;
        return false;
      }
    },
    [setAuth, clearAuth],
  );

  /** 웰컴(`/`)에서는 자동 appLogin 지연 — 「다음」에서 interactive 로그인 */
  const isWelcomePath = location.pathname === '/';

  useEffect(() => {
    if (!authHydrated) return;
    if (isPreviewMode) {
      setStatus('success');
      return;
    }
    if (isWelcomePath || isLoggedIn) return;
    void login('auto');
  }, [authHydrated, isPreviewMode, isWelcomePath, isLoggedIn, login]);

  return {
    isLoggedIn,
    user,
    status,
    error,
    login,
  };
}
