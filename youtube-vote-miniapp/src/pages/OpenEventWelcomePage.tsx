import { useNavigate } from 'react-router-dom';
import { BottomCTA, useToast } from '@toss/tds-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

const isPreviewMode = import.meta.env.VITE_IS_MOCK === 'true';

/** TDS 문서 예시와 동일 계열: 토스 2D 이모지 PNG (트로피 U+1F3C6) */
const OPEN_EVENT_EMOJI_SRC = 'https://static.toss.im/2d-emojis/png/4x/u1F3C6.png';

export default function OpenEventWelcomePage() {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const { login, status } = useAuth();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const handleNext = async () => {
    if (isLoggedIn) {
      navigate('/feed', { replace: true });
      return;
    }
    if (isPreviewMode) {
      navigate('/feed', { replace: true });
      return;
    }
    const ok = await login('interactive');
    if (ok) {
      navigate('/feed', { replace: true });
      return;
    }
    openToast('로그인에 실패했어요. 다시 시도해 주세요.', { higherThanCTA: true, duration: 2800 });
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
          <p className="mt-3">총 상금 10만원!</p>
          <p className="mt-1">10등까지 상금 지급!</p>
          <p className="mt-4">지금 아이디어 리그에 참여하세요!</p>
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
    </div>
  );
}
