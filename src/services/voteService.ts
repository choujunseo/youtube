import { supabase } from '@/services/supabase';
import { mapVoteRow } from '@/lib/supabaseMappers';
import { fetchIdeasByIds } from '@/services/ideaService';
import type { IIdea } from '@/types/idea';
import type { ICastVoteAtomicResult, IVote } from '@/types/vote';

export interface IMyVotedIdeaRow {
  vote: IVote;
  idea: IIdea | null;
}

export async function castVoteAtomic(userId: string, ideaId: string): Promise<ICastVoteAtomicResult> {
  const { data, error } = await supabase.rpc('cast_vote_atomic', {
    p_user_id: userId,
    p_idea_id: ideaId,
  });

  if (error) throw new Error(error.message);

  const row = data as Record<string, unknown> | null;
  if (!row || typeof row.success !== 'boolean') {
    return { success: false, error: 'INVALID_RPC_RESPONSE' };
  }

  return {
    success: row.success as boolean,
    probability: row.probability as number | undefined,
    weight: row.weight as number | undefined,
    weekId: row.weekId as string | undefined,
    error: row.error as string | undefined,
  };
}

export async function fetchMyVotesAll(): Promise<IVote[]> {
  const { data, error } = await supabase.from('votes').select('*').order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapVoteRow);
}

export async function fetchMyVoteForIdea(ideaId: string): Promise<IVote | null> {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('idea_id', ideaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapVoteRow(data as Record<string, unknown>);
}

export async function fetchMyVotedIdeasAll(): Promise<IMyVotedIdeaRow[]> {
  const votes = await fetchMyVotesAll();
  const ids = [...new Set(votes.map((v) => v.ideaId))];
  if (ids.length === 0) return [];

  const ideas = await fetchIdeasByIds(ids);
  const ideaMap = new Map(ideas.map((i) => [i.id, i]));

  return votes.map((vote) => ({
    vote,
    idea: ideaMap.get(vote.ideaId) ?? null,
  }));
}
