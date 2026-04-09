/** KST 달력 기준 보조 필드 (Intl) */
function kstParts(now: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const partMap: Record<string, string> = {};
  for (const p of formatter.formatToParts(now)) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }
  return partMap;
}

/**
 * KST 일요일 23:30 ~ 해당 일요일 자정 직전 (월요일 00:00 KST 직전까지).
 * 월요일 00:00부터는 점검/주초 전환 구간(`MaintenancePage`)과 맞물림.
 */
export function isFeverCountdownWindowKst(now: Date = new Date()): boolean {
  const m = kstParts(now);
  const weekday = m.weekday;
  const hour = Number(m.hour);
  const minute = Number(m.minute);
  if (weekday !== 'Sun') return false;
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;
  return hour > 23 || (hour === 23 && minute >= 30);
}

/** 일요일 피버 창에서만: 이번 주 일요일이 끝나는 KST 자정까지 남은 ms */
export function msUntilKstSundayEndMidnight(now: Date = new Date()): number | null {
  if (!isFeverCountdownWindowKst(now)) return null;
  const m = kstParts(now);
  const hour = Number(m.hour);
  const minute = Number(m.minute);
  const second = Number(m.second || 0);
  if (Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) return null;
  const curSec = hour * 3600 + minute * 60 + second;
  const secUntil = 24 * 3600 - curSec;
  return Math.max(0, secUntil * 1000);
}
