import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@toss/tds-mobile';
import { useAuth } from '@/hooks/useAuth';
import { textContainsProfanity } from '@/lib/profanityCheck';
import { updateUserDisplayName } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';

const isPreviewMode = import.meta.env.VITE_IS_MOCK === 'true';

const OPEN_EVENT_MAIN_EMOJI_SRC = 'https://static.toss.im/2d-emojis/png/4x/u1F381.png';
const OPEN_EVENT_HAND_EMOJI_SRC = 'https://static.toss.im/2d-emojis/png/4x/u270B.png';
const OPEN_EVENT_BULB_EMOJI_SRC = 'https://static.toss.im/2d-emojis/png/4x/u1F4A1.png';

export default function OpenEventWelcomePage() {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const { login, status, authHydrated } = useAuth();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);

  /**
   * 닉네임 시트는 토스 로그인 완료 후 `handleNext` 안에서만 연다.
   * (마운트 시 자동 오픈하면 로그인 시트보다 먼저 뜨는 것처럼 보일 수 있음)
   */
  const ensureNicknameIfNeeded = (displayName: string | undefined): boolean => {
    if (displayName?.trim()) return true;
    setNicknameDialogOpen(true);
    return false;
  };

  const handleNicknameSave = async () => {
    const n = nicknameInput.trim();
    if (n.length === 0 || n.length > 20) {
      openToast('닉네임은 1~20자로 입력해 주세요.', { higherThanCTA: true, duration: 2400 });
      return;
    }
    if (textContainsProfanity(n)) {
      openToast('닉네임에 부적절한 표현이 포함되어 있어요.', { higherThanCTA: true, duration: 2600 });
      return;
    }
    if (!user?.id) return;

    setNicknameSaving(true);
    try {
      await updateUserDisplayName(user.id, n);
      updateUser({ displayName: n });
      setNicknameDialogOpen(false);
      navigate('/feed', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '닉네임 저장에 실패했어요.';
      openToast(msg, { higherThanCTA: true, duration: 2600 });
    } finally {
      setNicknameSaving(false);
    }
  };

  const handleNext = async () => {
    if (!authHydrated) {
      openToast('잠시만 기다려 주세요…', { higherThanCTA: true, duration: 2000 });
      return;
    }
    if (isPreviewMode) {
      navigate('/feed', { replace: true });
      return;
    }
    /** 다음 → (필요 시) 토스 로그인 → 닉네임. 닉네임까지 있으면 로그인 생략하고 피드만. */
    const s = useAuthStore.getState();
    const hasNickname = (s.user?.displayName ?? '').trim().length > 0;
    if (s.isLoggedIn && s.user?.id && hasNickname) {
      navigate('/feed', { replace: true });
      return;
    }
    // 로그인됐지만 user 정보가 불완전하거나 닉네임이 없는 경우 → 세션 초기화 후 재로그인
    if (s.isLoggedIn) {
      clearAuth();
    }
    const res = await login('interactive');
    if (res.ok) {
      const nextUser = useAuthStore.getState().user;
      if (ensureNicknameIfNeeded(nextUser?.displayName)) {
        navigate('/feed', { replace: true });
      }
      return;
    }
    openToast(res.message || '로그인에 실패했어요. 다시 시도해 주세요.', {
      higherThanCTA: true,
      duration: 3200,
    });
  };

  const loading = status === 'loading' || !authHydrated;

  return (
    <div className="bg-gray-100 flex flex-1 justify-center">
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-white pt-0 shadow-sm">
        <div className="flex flex-col items-center px-6 pb-4 pt-6">
          <h1 className="text-center text-[26px] font-bold leading-snug text-[#191F28]">
            <span className="text-[#3182F6]">아이디어리그</span>
            <br />
            오픈 이벤트
          </h1>

          <img
            src={OPEN_EVENT_MAIN_EMOJI_SRC}
            alt="보물상자"
            className="mb-2 mt-8 h-[120px] w-[120px] select-none object-contain"
            draggable={false}
          />
        </div>

        <div className="mt-4 flex flex-col gap-5 px-6 pb-[160px]">
          <div className="flex items-center gap-4">
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#F2F4F6] p-3">
              <img src={OPEN_EVENT_HAND_EMOJI_SRC} alt="손" className="h-7 w-7" />
            </div>
            <p className="text-[18px] font-bold leading-tight text-[#191F28]">첫 투표 5P 즉시 지급!</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#F2F4F6] p-3">
              <img src={OPEN_EVENT_BULB_EMOJI_SRC} alt="전구" className="h-7 w-7" />
            </div>
            <p className="text-[18px] font-bold leading-tight text-[#191F28]">내 아이디어 졸업 시 3,000P!</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#F2F4F6] p-3">
              <img src={OPEN_EVENT_MAIN_EMOJI_SRC} alt="상자" className="h-7 w-7" />
            </div>
            <p className="text-[18px] font-bold leading-tight text-[#191F28]">투표한 아이디어 졸업 시 최대 2,000P!</p>
          </div>

          <div className="mt-12 px-1 py-1 text-center">
            <p className="text-[15px] font-semibold text-[#191F28]">"졸업"이 뭔지 궁금하시면, My {'>'} 설명서를 확인하세요!</p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 z-40 flex w-full justify-center bg-gradient-to-t from-white via-white to-transparent px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
          <div className="w-full max-w-md">
            <button
              type="button"
              className="h-[56px] w-full rounded-2xl bg-[#3182F6] text-[17px] font-semibold text-white transition-colors active:bg-[#1B64DA] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={() => void handleNext()}
            >
              {loading ? '잠시만요...' : '다음'}
            </button>
          </div>
        </div>
      </div>

      {nicknameDialogOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/45 pt-[max(12px,env(safe-area-inset-top))] px-4"
          role="presentation"
        >
          <div className="w-full max-w-md animate-top-sheet-in rounded-b-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
            <p className="text-base font-semibold text-gray-900">닉네임을 설정해 주세요</p>
            <p className="mt-1 text-sm text-gray-500">최초 로그인 시 1회만 필요해요. 부적절한 단어는 사용할 수 없어요.</p>
            <input
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={nicknameInput}
              maxLength={20}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="명예의 전당에 표시될 닉네임"
              disabled={nicknameSaving}
            />
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
              disabled={nicknameSaving}
              onClick={() => void handleNicknameSave()}
            >
              {nicknameSaving ? '저장 중...' : '시작하기'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
