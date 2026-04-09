import { useEffect, useRef, useState } from 'react';
import { feedTopBannerAdGroupId } from '@/lib/adGroupIds';
import { recordAdImpression } from '@/services/adLogService';
import { useAuthStore } from '@/store/authStore';
import { attachBannerAd, initBannerAds, isBannerAdSupported } from '@/utils/tossBridge';

export default function FeedTopAdBanner() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [visible, setVisible] = useState(true);
  const hasLoggedImpressionRef = useRef(false);

  useEffect(() => {
    // 루트(App.tsx)에서 이미 initBannerAds를 호출했다면 싱글턴이 즉시 콜백을 실행한다.
    // isBannerAdSupported가 false인 환경(구버전 토스 앱)에서는 숨김 처리.
    if (!isBannerAdSupported()) {
      setVisible(false);
      return;
    }
    initBannerAds(
      () => setIsInitialized(true),
      () => setVisible(false),
    );
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const host = hostRef.current;
    if (!host) return;

    const adGroupId = feedTopBannerAdGroupId();
    hasLoggedImpressionRef.current = false;

    const destroy = attachBannerAd(adGroupId, host, {
      theme: 'auto',
      tone: 'blackAndWhite',
      // 공식 문서 기본값이자 공식 예제 전부 'expanded' 사용.
      // 'card'는 좌우 패딩+border-radius를 추가해 피드형 네이티브 크리에이티브 렌더링을 방해할 수 있음.
      variant: 'expanded',
      callbacks: {
        onAdImpression: () => {
          if (hasLoggedImpressionRef.current) return;
          hasLoggedImpressionRef.current = true;
          if (!userId) {
            if (import.meta.env.DEV) {
              console.warn('[FeedTopAdBanner] impression occurred but skipped: missing userId');
            }
            return;
          }
          void recordAdImpression({
            userId,
            adType: 'feed_top_banner_impression',
            adGroupId,
            rewardAmount: 0,
          }).catch((err: unknown) => {
            console.error('[FeedTopAdBanner] record_ad_impression failed', err);
          });
        },
        onAdViewable: () => {
          if (import.meta.env.DEV) {
            console.info('[FeedTopAdBanner] banner viewable');
          }
        },
        onAdFailedToRender: () => setVisible(false),
        onNoFill: () => setVisible(false),
      },
    });

    return () => {
      destroy();
    };
  }, [isInitialized, userId]);

  if (!visible) return null;

  // 공식 문서: width 100% 필수, 고정형 배너는 height 96px 권장.
  // height가 없으면 초기 렌더 시 컨테이너 높이가 0이라 onAdViewable이 지연되어
  // onAdImpression(수익 발생 시점)도 누락될 수 있음.
  return (
    <div
      ref={hostRef}
      style={{ width: '100%', height: '96px' }}
      aria-label="배너 광고"
    />
  );
}
