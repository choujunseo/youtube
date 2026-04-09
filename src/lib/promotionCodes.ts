/**
 * (클라이언트용) 토스 프로모션 코드 — 필요 시 SDK `grantPromotionReward` 등에 사용.
 * 졸업·첫 투표 5원 등 **서버 지급**은 Edge `payout-worker` + 시크릿
 * `TOSS_PROMOTION_CODE_CREATOR` / `VOTER` / `FIRST_VOTE` 를 사용합니다.
 */

function envTrim(name: string): string | undefined {
  const v = import.meta.env[name] as string | undefined;
  const t = v?.trim();
  return t || undefined;
}

/** 창작자 대상 프로모션 */
export function promotionCodeCreator(): string | undefined {
  return envTrim('VITE_PROMOTION_CODE_CREATOR');
}

/** 투표자 대상 프로모션 */
export function promotionCodeVoter(): string | undefined {
  return envTrim('VITE_PROMOTION_CODE_VOTER');
}

/** 첫 투표 5원 등 첫 투표 인센티브 */
export function promotionCodeFirstVote(): string | undefined {
  return envTrim('VITE_PROMOTION_CODE_FIRST_VOTE');
}
