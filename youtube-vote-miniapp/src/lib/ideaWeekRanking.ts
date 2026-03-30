import type { IIdea } from '@/types/idea';

/** 주차 내 아이디어 전체 기준 순위 (가중 점수 → 투표 수 → 먼저 등록 순, mv_live_ranking·정산과 동일) */
export function buildWeekRankMap(ideas: IIdea[]): Map<string, number> {
  const sorted = [...ideas].sort((a, b) => {
    if (b.totalWeightedShares !== a.totalWeightedShares) {
      return b.totalWeightedShares - a.totalWeightedShares;
    }
    if (b.totalVoteCount !== a.totalVoteCount) {
      return b.totalVoteCount - a.totalVoteCount;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
  return new Map(sorted.map((idea, idx) => [idea.id, idx + 1]));
}

export function weekTotalWeightedShares(ideas: IIdea[]): number {
  return ideas.reduce((sum, i) => sum + Number(i.totalWeightedShares ?? 0), 0);
}
