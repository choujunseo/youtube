/** 졸업(600표) 시 투표 순번별 토스 포인트(원) — DB `cast_vote_atomic` CASE 와 동기화 */
export function graduationVoterRewardWon(position: number): number {
  switch (position) {
    case 1:
      return 1000;
    case 150:
      return 500;
    case 300:
      return 800;
    case 450:
      return 1000;
    case 600:
      return 2000;
    default:
      return 1;
  }
}

export const GRADUATION_CREATOR_WON = 3000;
export const FIRST_GLOBAL_VOTE_PROMO_WON = 5;
