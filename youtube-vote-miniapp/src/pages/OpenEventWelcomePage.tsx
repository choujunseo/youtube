import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomCTA, useToast } from '@toss/tds-mobile';
import { useAuth } from '@/hooks/useAuth';
import { textContainsProfanity } from '@/lib/profanityCheck';
import { updateUserDisplayName } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';

const isPreviewMode = import.meta.env.VITE_IS_MOCK === 'true';

/** TDS 문서 예시와 동일 계열: 토스 2D 이모지 PNG (트로피 U+1F3C6) */
const OPEN_EVENT_EMOJI_SRC = 'https://static.toss.im/2d-emojis/png/4x/u1F3C6.png';

export default function OpenEventWelcomePage() {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const { login, status } = useAuth();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);

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
    if (isLoggedIn) {
      if (ensureNicknameIfNeeded(user?.displayName)) {
        navigate('/feed', { replace: true });
      }
      return;
    }
    if (isPreviewMode) {
      navigate('/feed', { replace: true });
      return;
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

  const loading = status === 'loading';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-white">
      {/* 상단 ~ 절반: 큰 그래픽만 (토스 이벤트 랜딩과 유사) */}
      <div className="flex min-h-[36svh] flex-[1.25] flex-col items-center justify-center px-6 pb-2 pt-8">
        <img
          src={OPEN_EVENT_EMOJI_SRC}
          alt="이벤트"
          width={200}
          height={200}
          className="h-[min(188px,48vw)] w-[min(188px,48vw)] max-h-[200px] max-w-[200px] select-none object-contain"
          decoding="async"
          draggable={false}
        />
      </div>

      {/* 하단부: 카피 → BottomCTA 바로 위 (본문 기준 20/22px, 「오픈 이벤트」만 1.5em) */}
      <div className="shrink-0 px-6 pb-6 pt-2">
        <div className="w-full text-center text-[20px] font-bold leading-snug tracking-tight text-[#191F28] sm:text-[22px]">
          <p className="text-[1.5em] leading-tight">오픈 이벤트</p>
          <p className="mt-3">첫 투표하면 5원!</p>
          <p className="mt-1">내가 업로드한 아이디어가 졸업하면 5000원!</p>
          <p className="mt-1">내가 투표한 아이디어가 졸업하면 최대 1000원!</p>
          <p className="mt-4 text-[15px] font-normal leading-normal text-[#8B95A1] sm:text-[16px]">
            My {'>'} 아이디어리그 설명서를 꼭 확인하세요!
          </p>
        </div>
      </div>

      <BottomCTA.Single
        fixed
        color="primary"
        variant="fill"
        size="xlarge"
        display="full"
        loading={loading}
        disabled={loading}
        onClick={() => void handleNext()}
      >
        다음
      </BottomCTA.Single>

      {nicknameDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45">
          <div className="w-full rounded-t-3xl bg-white p-5">
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
