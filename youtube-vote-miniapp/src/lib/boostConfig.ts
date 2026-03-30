function parseIntNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 부스트 유지시간(분)
 * - VITE_BOOST_DURATION_MINUTES: 미설정 시 기본 120분(2시간). 스펙 예시 1시간보다 광고 보상 체감에 맞춤.
 */
export const BOOST_DURATION_MINUTES = clamp(
  parseIntNumber(import.meta.env.VITE_BOOST_DURATION_MINUTES, 120),
  5,
  24 * 60,
);

export function makeBoostExpiresAt(baseDate = new Date()): string {
  const expiresAt = new Date(baseDate.getTime() + BOOST_DURATION_MINUTES * 60_000);
  return expiresAt.toISOString();
}
