import type { IIdeaCategory } from '@/types/idea';

/** `mv_live_ranking` 행 (DB 컬럼명 스키마에 맞춤) */
export interface ILiveRankingRow {
  ideaId: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  category: IIdeaCategory;
  categoryTags: string[];
  totalWeightedShares: number;
  totalVoteCount: number;
  isBoosted: boolean;
  boostExpiresAt?: string | null;
  rank: number;
}

export interface IHallOfFameRow {
  ideaId: string;
  title: string;
  description: string;
  totalVoteCount: number;
  creatorId: string;
  creatorName: string;
  category: IIdeaCategory;
  categoryTags: string[];
  firstVoterId: string | null;
  firstVoterName: string;
  createdAt: string;
}
