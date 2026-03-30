import { useEffect, useState } from 'react';
import { isWeeklyMaintenanceWindowKst } from '@/lib/maintenanceWindowKst';

const TICK_MS = 30_000;

const maintenancePreview = import.meta.env.VITE_MAINTENANCE_PREVIEW === 'true';

/** 점검 창 종료 직후 곧바로 일반 UI로 전환되도록 주기적으로 재계산 */
export function useWeeklyMaintenanceKst(): boolean {
  const [active, setActive] = useState(() =>
    maintenancePreview ? true : isWeeklyMaintenanceWindowKst(),
  );

  useEffect(() => {
    if (maintenancePreview) {
      setActive(true);
      return;
    }
    const tick = () => setActive(isWeeklyMaintenanceWindowKst());
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return maintenancePreview || active;
}
