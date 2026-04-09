import type { IAdLog } from '@/types/adLog';
import type { IIdea } from '@/types/idea';
import type { IVote } from '@/types/vote';

function mapCategoryTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mapIdeaRow(row: Record<string, unknown>): IIdea {
  const creatorDisplayName =
    typeof row.creator_display_name === 'string' ? row.creator_display_name : '';
  const creatorId =
    (typeof row.user_id === 'string' ? row.user_id : null) ??
    (typeof row.creator_id === 'string' ? row.creator_id : null) ??
    '';
  return {
    id: row.id as string,
    creatorId,
    creatorDisplayName,
    title: row.title as string,
    description: row.description as string,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
    category: row.category as IIdea['category'],
    categoryTags: mapCategoryTags(row.category_tags),
    totalVoteCount: row.total_vote_count as number,
    totalWeightedShares: Number(row.total_weighted_shares ?? 0),
    isBoosted: row.is_boosted as boolean,
    boostExpiresAt: (row.boost_expires_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function mapVoteRow(row: Record<string, unknown>): IVote {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    ideaId: row.idea_id as string,
    dayOfWeek: row.day_of_week as number,
    weight: row.weight as IVote['weight'],
    weightedShare: Number(row.weighted_share ?? 0),
    createdAt: row.created_at as string,
  };
}

export function mapAdLogRow(row: Record<string, unknown>): IAdLog {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    adType: row.ad_type as IAdLog['adType'],
    adGroupId: row.ad_group_id as string,
    rewardAmount: row.reward_amount as number,
    createdAt: row.created_at as string,
  };
}
