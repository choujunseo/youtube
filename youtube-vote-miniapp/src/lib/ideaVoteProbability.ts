import type { IIdea } from '@/types/idea';
import type { IVote } from '@/types/vote';

/** 피드·랭킹 공통: 투표 1건 기준 당첨 확률(%) */
export function computeVoteProbability(idea: IIdea, vote: IVote | undefined): number | null {
  if (!vote) return null;
  if (idea.totalWeightedShares <= 0) return null;
  return (vote.weightedShare / idea.totalWeightedShares) * 100;
}
