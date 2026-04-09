function parseIntNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 부스트 유지시간(분) — 표시·문구용. 실제 적용 구간은 DB `apply_boost_charge_on_idea` 의 interval 과 맞출 것.
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
