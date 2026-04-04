import { supabase } from '@/services/supabase';
import { mapLiveRankingRow } from '@/lib/supabaseMappers';
import type { IIdeaCategory } from '@/types/idea';
import type { IHallOfFameRow, ILiveRankingRow } from '@/types/ranking';

const IDEA_CATEGORIES: readonly IIdeaCategory[] = [
  'entertainment',
  'education',
  'vlog',
  'shorts',
  'etc',
];

function mapHallCategory(value: unknown): IIdeaCategory {
  if (typeof value === 'string' && (IDEA_CATEGORIES as readonly string[]).includes(value)) {
    return value as IIdeaCategory;
  }
  return 'etc';
}

function mapHallCategoryTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
}

/**
 * 실시간 랭킹: `mv_live_ranking` 스냅샷 읽기 전용.
 * 갱신은 DB에서 `REFRESH MATERIALIZED VIEW` / `refresh_live_ranking()`(주기·정산 후 등).
 */
export async function fetchLiveRanking(): Promise<ILiveRankingRow[]> {
  const { data, error } = await supabase.from('mv_live_ranking').select('*').order('rank', {
    ascending: true,
  });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapLiveRankingRow);
}

interface IHallIdeaRow {
  id: string;
  title: string;
  description: string;
  total_vote_count: number;
  creator_id: string;
  created_at: string;
  category: string;
  category_tags: unknown;
}

interface IFirstVoterLogRow {
  idea_id: string;
  user_id: string;
}

interface IUserNameRow {
  id: string;
  display_name: string;
}

export async function fetchHallOfFame(): Promise<IHallOfFameRow[]> {
  const { data: ideasData, error: ideasError } = await supabase
    .from('ideas')
    .select('id,title,description,total_vote_count,creator_id,created_at,category,category_tags')
    .gte('total_vote_count', 600)
    .order('created_at', { ascending: false });
  if (ideasError) throw new Error(ideasError.message);

  const ideas = (ideasData ?? []) as IHallIdeaRow[];
  if (ideas.length === 0) return [];

  const ideaIds = ideas.map((idea) => idea.id);
  const creatorIds = ideas.map((idea) => idea.creator_id);

  const { data: firstVoterLogsData, error: firstVoterLogsError } = await supabase
    .from('payout_logs')
    .select('idea_id,user_id')
    .in('idea_id', ideaIds)
    .eq('reason', 'MILESTONE_600_RANK_1');
  if (firstVoterLogsError) throw new Error(firstVoterLogsError.message);

  const firstVoterLogs = (firstVoterLogsData ?? []) as IFirstVoterLogRow[];
  const firstVoterByIdea = new Map<string, string>();
  for (const log of firstVoterLogs) {
    if (!firstVoterByIdea.has(log.idea_id)) {
      firstVoterByIdea.set(log.idea_id, log.user_id);
    }
  }

  const firstVoterIds = Array.from(firstVoterByIdea.values());
  const userIds = [...new Set([...creatorIds, ...firstVoterIds])];

  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id,display_name')
    .in('id', userIds);
  if (usersError) throw new Error(usersError.message);

  const users = (usersData ?? []) as IUserNameRow[];
  const userNameMap = new Map(users.map((user) => [user.id, user.display_name || '익명']));

  return ideas.map((idea) => {
    const firstVoterId = firstVoterByIdea.get(idea.id) ?? null;
    return {
      ideaId: idea.id,
      title: idea.title,
      description: idea.description,
      totalVoteCount: idea.total_vote_count,
      creatorId: idea.creator_id,
      creatorName: userNameMap.get(idea.creator_id) || '익명',
      category: mapHallCategory(idea.category),
      categoryTags: mapHallCategoryTags(idea.category_tags),
      firstVoterId,
      firstVoterName: firstVoterId ? (userNameMap.get(firstVoterId) ?? '익명') : '미정',
      createdAt: idea.created_at,
    };
  });
}
