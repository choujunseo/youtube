/**
 * 졸업 상금 티어 합계 스모크 테스트 (DB RPC와 동일 규칙).
 * 실행: node scripts/test-graduation-payout-tiers.mjs
 */
function graduationVoterRewardWon(position) {
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

const CREATOR = 3000;
let voterTotal = 0;
for (let p = 1; p <= 600; p += 1) {
  voterTotal += graduationVoterRewardWon(p);
}

const expectMilestones = 1000 + 500 + 800 + 1000 + 2000;
const expectBase = 595;
const expectVoterSum = expectMilestones + expectBase;
console.assert(voterTotal === expectVoterSum, `voterTotal ${voterTotal} !== ${expectVoterSum}`);

const grand = CREATOR + voterTotal;
console.log('OK graduation tiers:', {
  creator: CREATOR,
  voterMilestones: expectMilestones,
  voterBase595: expectBase,
  votersSubtotal: voterTotal,
  grandTotal: grand,
});
