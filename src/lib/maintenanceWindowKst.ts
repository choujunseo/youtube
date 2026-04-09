/**
 * KST 기준 매주 월요일 점검 시간 구간.
 * 시작/종료 시각은 .env(VITE_MAINTENANCE_START_HOUR_KST, VITE_MAINTENANCE_END_HOUR_KST)로 제어.
 */
export function isWeeklyMaintenanceWindowKst(now: Date = new Date()): boolean {
  const { startHour, endHour } = getMaintenanceWindowHours();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  });
  const partMap: Record<string, string> = {};
  for (const p of formatter.formatToParts(now)) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }
  const weekday = partMap.weekday;
  const hour = Number(partMap.hour);
  if (weekday !== 'Mon' || Number.isNaN(hour)) return false;
  return hour >= startHour && hour < endHour;
}

export function getMaintenanceWindowHours(): { startHour: number; endHour: number } {
  const startHour = readHourEnv('VITE_MAINTENANCE_START_HOUR_KST', 1);
  const endHour = readHourEnv('VITE_MAINTENANCE_END_HOUR_KST', 6);
  return { startHour, endHour };
}

export function getMaintenanceWindowLabelKst(): string {
  const { startHour, endHour } = getMaintenanceWindowHours();
  const hh = (n: number) => `${String(n).padStart(2, '0')}:00`;
  return `매주 월요일 ${hh(startHour)}~${hh(endHour)} (KST)`;
}

function readHourEnv(name: 'VITE_MAINTENANCE_START_HOUR_KST' | 'VITE_MAINTENANCE_END_HOUR_KST', fallback: number): number {
  const raw = import.meta.env[name];
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 24) return fallback;
  return parsed;
}
