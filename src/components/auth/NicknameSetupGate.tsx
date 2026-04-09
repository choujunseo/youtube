import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * 토스 등에서 `/feed`로 바로 진입하면 웰컴의 닉네임 시트를 건너뜀.
 * 로그인됐는데 공개 닉네임이 비어 있으면 웰컴(`/`)으로 보내 다음 단계에서 시트를 띄움.
 */
export default function NicknameSetupGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, authHydrated } = useAuth();

  useEffect(() => {
    if (!authHydrated) return;
    if (location.pathname === '/') return;
    if (!isLoggedIn || !user?.id) return;
    if ((user.displayName ?? '').trim().length > 0) return;
    navigate('/', { replace: true });
  }, [authHydrated, isLoggedIn, user?.id, user?.displayName, location.pathname, navigate]);

  return null;
}
