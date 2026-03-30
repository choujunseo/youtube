import { useEffect, useState } from 'react';
import { isFeverCountdownWindowKst } from '@/lib/feverWindowKst';

const TICK_MS = 15_000;

/** `true`면 KST 창과 무관하게 랭킹 탭·페이지 항상 허용 (임시 확인용). 배포 전 `false` 권장. */
function isRankingWindowBypassed(): boolean {
  if (import.meta.env.VITE_RANKING_ALWAYS_OPEN === 'true') return true;
  /** 로컬 dev 서버에서는 기본으로 랭킹 UI 확인 가능 */
  if (import.meta.env.DEV) return true;
  return false;
}

/**
 * 실시간 랭킹 열람 가능 구간: KST 일요일 23:30 ~ 일요일 자정(월요일 00:00 직전).
 * `isFeverCountdownWindowKst`와 동일 시각 창.
 * 우회: `VITE_RANKING_ALWAYS_OPEN=true` 또는 개발 모드(`npm run dev`).
 */
export function useRankingAccessibleKst(): boolean {
  const bypass = isRankingWindowBypassed();
  const [active, setActive] = useState(() => bypass || isFeverCountdownWindowKst());

  useEffect(() => {
    if (bypass) return;
    const tick = () => setActive(isFeverCountdownWindowKst());
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [bypass]);

  return bypass || active;
}
