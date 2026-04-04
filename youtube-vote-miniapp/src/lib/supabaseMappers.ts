import type { IAdLog } from '@/types/adLog';
import type { IIdea } from '@/types/idea';
import type { ILiveRankingRow } from '@/types/ranking';
import type { IVote } from '@/types/vote';
import type { IWeek } from '@/types/week';
import type { IWeeklyResult } from '@/types/weeklyResult';

export function mapWeekRow(row: Record<string, unknown>): IWeek {
  return {
    id: row.id as string,
    year: row.year as number,
    weekNumber: row.week_number as number,
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    feverStartAt: row.fever_start_at as string,
    status: row.status as IWeek['status'],
    prizePool: Number(row.prize_pool ?? 0),
    createdAt: row.created_at as string,
  };
}

function mapCategoryTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

const IDEA_CATEGORIES: readonly IIdea['category'][] = [
  'entertainment',
  'education',
  'vlog',
  'shorts',
  'etc',
];

function mapIdeaCategoryCell(value: unknown): IIdea['category'] {
  if (typeof value === 'string' && (IDEA_CATEGORIES as readonly string[]).includes(value)) {
    return value as IIdea['category'];
  }
  return 'etc';
}

export function mapIdeaRow(row: Record<string, unknown>): IIdea {
  const creatorDisplayName =
    typeof row.creator_display_name === 'string' ? row.creator_display_name : '';
  return {
    id: row.id as string,
    creatorId: row.creator_id as string,
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

export function mapLiveRankingRow(row: Record<string, unknown>): ILiveRankingRow {
  return {
    ideaId: row.idea_id as string,
    title: row.title as string,
    description: typeof row.description === 'string' ? row.description : '',
    creatorId: row.creator_id as string,
    creatorName: row.creator_name as string,
    category: mapIdeaCategoryCell(row.category),
    categoryTags: mapCategoryTags(row.category_tags),
    totalWeightedShares: Number(row.total_weighted_shares ?? 0),
    totalVoteCount: row.total_vote_count as number,
    isBoosted: row.is_boosted as boolean,
    boostExpiresAt: (row.boost_expires_at as string | null | undefined) ?? null,
    rank: Number(row.rank ?? 0),
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

export function mapWeeklyResultRow(row: Record<string, unknown>): IWeeklyResult {
  return {
    id: row.id as string,
    weekId: row.week_id as string,
    winnerIdeaId: row.winner_idea_id as string,
    creatorId: row.creator_id as string,
    creatorPrize: Number(row.creator_prize ?? 0),
    voterWinner1Id: (row.voter_winner_1_id as string | null) ?? null,
    voterWinner2Id: (row.voter_winner_2_id as string | null) ?? null,
    voterPrizeEach: Number(row.voter_prize_each ?? 0),
    fullRanking: row.full_ranking ?? null,
    settledAt: row.settled_at as string,
  };
}
