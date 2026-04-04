import type { ILiveRankingRow } from '@/types/ranking';
import type { IIdea } from '@/types/idea';

export function rankingRowToIdea(row: ILiveRankingRow): IIdea {
  return {
    id: row.ideaId,
    creatorId: row.creatorId,
    creatorDisplayName: row.creatorName ?? '',
    title: row.title,
    description: row.description,
    thumbnailUrl: null,
    category: row.category,
    categoryTags: row.categoryTags,
    totalVoteCount: row.totalVoteCount,
    totalWeightedShares: row.totalWeightedShares,
    isBoosted: row.isBoosted,
    boostExpiresAt: row.boostExpiresAt ?? null,
    createdAt: '',
  };
}
