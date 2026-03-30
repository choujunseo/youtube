import { useEffect, useState } from 'react';

/** `expiresAtIso`까지 남은 ms(0 이상). `enabled`일 때 1초마다 갱신 */
export function useBoostRemainingMs(expiresAtIso: string | null, enabled: boolean): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !expiresAtIso) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [enabled, expiresAtIso]);

  if (!enabled || !expiresAtIso) return 0;
  void tick;
  return Math.max(0, new Date(expiresAtIso).getTime() - Date.now());
}
