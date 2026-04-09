import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { IUser } from '@/types/user';

/** WebView 등에서 localStorage 실패 시에도 스토어 초기화가 깨지지 않도록 */
function getPersistStorage() {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  try {
    const k = '__idea_league_ls__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
}

interface IAuthStore {
  tossUserKey: number | null;
  accessToken: string | null;
  user: IUser | null;
  isLoggedIn: boolean;
  /** Edge: `auth_user_id` 연결 여부 */
  authLinked: boolean;
  /** Edge: 토스 `name` 필드 복호화 성공 여부 */
  profileNameDecrypted: boolean;

  setAuth: (payload: {
    tossUserKey: number;
    accessToken: string;
    user: IUser;
    authLinked?: boolean;
    profileNameDecrypted?: boolean;
  }) => void;
  clearAuth: () => void;
  updateUser: (patch: Partial<IUser>) => void;
}

export const useAuthStore = create<IAuthStore>()(
  persist(
    (set) => ({
      tossUserKey: null,
      accessToken: null,
      user: null,
      isLoggedIn: false,
      authLinked: false,
      profileNameDecrypted: false,

      setAuth: ({ tossUserKey, accessToken, user, authLinked, profileNameDecrypted }) =>
        set({
          tossUserKey,
          accessToken,
          user,
          isLoggedIn: true,
          authLinked: Boolean(authLinked),
          profileNameDecrypted: Boolean(profileNameDecrypted),
        }),

      clearAuth: () =>
        set({
          tossUserKey: null,
          accessToken: null,
          user: null,
          isLoggedIn: false,
          authLinked: false,
          profileNameDecrypted: false,
        }),

      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : null,
        })),
    }),
    {
      name: 'idea-league-auth-v2',
      version: 2,
      storage: createJSONStorage(getPersistStorage),
      partialize: (state) => ({
        tossUserKey: state.tossUserKey,
        accessToken: state.accessToken,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        authLinked: state.authLinked,
        profileNameDecrypted: state.profileNameDecrypted,
      }),
    },
  ),
);
