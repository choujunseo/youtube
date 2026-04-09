import { supabase } from '@/services/supabase';
import type { IIdeaCategory } from '@/types/idea';
import type { IHallOfFameRow } from '@/types/ranking';

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

interface IHallIdeaRow {
  id: string;
  title: string;
  description: string;
  total_vote_count: number;
  user_id: string;
  created_at: string;
  category: string;
  category_tags: unknown;
}

interface IFirstVoterPayoutRow {
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
    .select('id,title,description,total_vote_count,user_id,created_at,category,category_tags')
    .gte('total_vote_count', 600)
    .order('created_at', { ascending: false });
  if (ideasError) throw new Error(ideasError.message);

  const ideas = (ideasData ?? []) as IHallIdeaRow[];
  if (ideas.length === 0) return [];

  const ideaIds = ideas.map((idea) => idea.id);
  const creatorIds = ideas.map((idea) => idea.user_id);

  const { data: payoutFirstData, error: payoutFirstError } = await supabase
    .from('payout_logs')
    .select('idea_id,user_id')
    .in('idea_id', ideaIds)
    .eq('reason', 'GRADUATION_VOTER')
    .eq('vote_sequence', 1);
  if (payoutFirstError) throw new Error(payoutFirstError.message);

  const { data: payoutLegacyData, error: payoutLegacyError } = await supabase
    .from('payout_logs')
    .select('idea_id,user_id')
    .in('idea_id', ideaIds)
    .eq('reason', 'GRADUATION_600_FIRST_VOTER');
  if (payoutLegacyError) throw new Error(payoutLegacyError.message);

  const firstVoterByIdea = new Map<string, string>();
  for (const row of (payoutFirstData ?? []) as IFirstVoterPayoutRow[]) {
    if (!firstVoterByIdea.has(row.idea_id)) {
      firstVoterByIdea.set(row.idea_id, row.user_id);
    }
  }
  for (const row of (payoutLegacyData ?? []) as IFirstVoterPayoutRow[]) {
    if (!firstVoterByIdea.has(row.idea_id)) {
      firstVoterByIdea.set(row.idea_id, row.user_id);
    }
  }

  const firstVoterIds = Array.from(firstVoterByIdea.values());
  const userIds = [...new Set([...creatorIds, ...firstVoterIds])];

  const { data: usersData, error: usersError } = await supabase.rpc('fetch_user_display_names', {
    p_user_ids: userIds,
  });
  if (usersError) throw new Error(usersError.message);

  const users = (usersData ?? []) as IUserNameRow[];
  const userNameMap = new Map(users.map((user) => [user.id, user.display_name || '알 수 없음']));

  return ideas.map((idea) => {
    const firstVoterId = firstVoterByIdea.get(idea.id) ?? null;
    return {
      ideaId: idea.id,
      title: idea.title,
      description: idea.description,
      totalVoteCount: idea.total_vote_count,
      creatorId: idea.user_id,
      creatorName: userNameMap.get(idea.user_id) || '알 수 없음',
      category: mapHallCategory(idea.category),
      categoryTags: mapHallCategoryTags(idea.category_tags),
      firstVoterId,
      firstVoterName: firstVoterId ? (userNameMap.get(firstVoterId) ?? '알 수 없음') : '미정',
      createdAt: idea.created_at,
    };
  });
}
