function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 피드 노출 가중치 튜닝 값.
 * - VITE_FEED_BOOST_WEIGHT_DEFAULT: 일반 구간 부스트 가중 (기본 1.5)
 * - VITE_FEED_BOOST_WEIGHT_FEVER: 피버 구간 부스트 가중 (기본 1.4)
 * - VITE_FEED_BOOST_CONSECUTIVE_CAP: 부스트 연속 노출 상한 (기본 3)
 * - VITE_FEED_BOOST_JITTER_MIN: 노출 다양성 하한 (기본 0.92)
 * - VITE_FEED_BOOST_JITTER_RANGE: 노출 다양성 폭 (기본 0.16)
 */
export const FEED_EXPOSURE = {
  boostWeightDefault: clamp(parseNumber(import.meta.env.VITE_FEED_BOOST_WEIGHT_DEFAULT, 1.5), 1, 3),
  boostWeightFever: clamp(parseNumber(import.meta.env.VITE_FEED_BOOST_WEIGHT_FEVER, 1.4), 1, 3),
  consecutiveCap: clamp(parseIntNumber(import.meta.env.VITE_FEED_BOOST_CONSECUTIVE_CAP, 3), 1, 10),
  jitterMin: clamp(parseNumber(import.meta.env.VITE_FEED_BOOST_JITTER_MIN, 0.92), 0.5, 1.2),
  jitterRange: clamp(parseNumber(import.meta.env.VITE_FEED_BOOST_JITTER_RANGE, 0.16), 0, 1),
} as const;
