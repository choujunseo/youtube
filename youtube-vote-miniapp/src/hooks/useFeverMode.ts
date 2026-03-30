import { useEffect, useMemo, useState } from 'react';
import type { IWeekStatus } from '@/types/week';
import { isFeverCountdownWindowKst, msUntilKstSundayEndMidnight } from '@/lib/feverWindowKst';

const CLIENT_FEVER_SYNC_MS = 15_000;

/** DB `weeks.status === 'fever'` 또는 KST 일요일 23:30~24:00 타이밍 */
export function useFeverMode(weekStatus: IWeekStatus | undefined): boolean {
  const [clientFever, setClientFever] = useState(() => isFeverCountdownWindowKst());

  useEffect(() => {
    const sync = () => setClientFever(isFeverCountdownWindowKst());
    sync();
    const id = window.setInterval(sync, CLIENT_FEVER_SYNC_MS);
    return () => window.clearInterval(id);
  }, []);

  return weekStatus === 'fever' || clientFever;
}

/** 피더 배너용: 1초마다 카운트다운 갱신 (일요일 피버 창에서만 유효 ms) */
export function useFeverUi(weekStatus: IWeekStatus | undefined) {
  const feverMode = useFeverMode(weekStatus);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!feverMode) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1_000);
    return () => window.clearInterval(id);
  }, [feverMode]);

  const countdownMs = useMemo(() => {
    void tick;
    if (!feverMode || !isFeverCountdownWindowKst()) return null;
    return msUntilKstSundayEndMidnight();
  }, [feverMode, tick]);

  return { feverMode, countdownMs };
}
