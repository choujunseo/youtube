import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  isIntegratedAdSupported,
  preloadIntegratedRewardAd,
  showIntegratedRewardAd,
} from '@/utils/tossBridge';

export interface IUseRewardedAdResult {
  isSupported: boolean;
  isLoaded: boolean;
  preload: () => void;
  /** userEarnedReward 발생 시 true */
  showRewarded: () => Promise<boolean>;
}

export function useRewardedAd(adGroupId: string): IUseRewardedAdResult {
  const isSupported = useMemo(() => isIntegratedAdSupported(), []);
  const [isLoaded, setIsLoaded] = useState(false);
  const unregisterRef = useRef<(() => void) | null>(null);

  const preload = useCallback(() => {
    if (!isSupported) return;
    unregisterRef.current?.();
    unregisterRef.current = preloadIntegratedRewardAd(
      adGroupId,
      () => {
        // 공식 문서 패턴: loaded 이벤트 수신 직후 반드시 load cleanup 호출
        // (load → cleanup → show 순서를 지켜야 live ID에서 show 이벤트가 정상 포워딩됨)
        unregisterRef.current?.();
        unregisterRef.current = null;
        setIsLoaded(true);
      },
      () => setIsLoaded(false),
    );
  }, [adGroupId, isSupported]);

  useEffect(() => {
    preload();
    return () => {
      unregisterRef.current?.();
      unregisterRef.current = null;
    };
  }, [preload]);

  const showRewarded = useCallback(async () => {
    if (!isSupported) return false;
    const earned = await showIntegratedRewardAd(adGroupId);
    setIsLoaded(false);
    preload();
    return earned;
  }, [adGroupId, isSupported, preload]);

  return { isSupported, isLoaded, preload, showRewarded };
}
