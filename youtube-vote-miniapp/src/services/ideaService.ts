import { supabase } from '@/services/supabase';
import { makeBoostExpiresAt } from '@/lib/boostConfig';
import { mapIdeaRow } from '@/lib/supabaseMappers';
import type { IIdea, IIdeaCategory, IIdeaPage } from '@/types/idea';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKstTodayStartIso(now = new Date()): string {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  kstNow.setUTCHours(0, 0, 0, 0);
  return new Date(kstNow.getTime() - KST_OFFSET_MS).toISOString();
}

export interface IFetchIdeasPageParams {
  userId: string;
  limit: number;
  offset: number;
}

export async function fetchIdeasPage(params: IFetchIdeasPageParams): Promise<IIdeaPage> {
  const { userId, limit, offset } = params;
  const { data, error } = await supabase.rpc('fetch_feed_ideas_page', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const items = rows.map(mapIdeaRow);
  const nextOffset = rows.length < limit ? null : offset + limit;

  return { items, nextOffset };
}

export async function fetchMyIdeasAll(creatorId: string): Promise<IIdea[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapIdeaRow);
}

export async function fetchMyDailyIdeaUploadCount(creatorId: string): Promise<number> {
  const kstTodayStartIso = getKstTodayStartIso();
  const { count, error } = await supabase
    .from('ideas')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .gte('created_at', kstTodayStartIso);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchIdeaById(ideaId: string): Promise<IIdea | null> {
  const { data, error } = await supabase.from('ideas').select('*').eq('id', ideaId).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapIdeaRow(data as Record<string, unknown>);
}

/** RLS 범위 내 다건 조회(내 투표 아이디어 묶음 등) */
export async function fetchIdeasByIds(ideaIds: string[]): Promise<IIdea[]> {
  const unique = [...new Set(ideaIds)].filter(Boolean);
  if (unique.length === 0) return [];

  const { data, error } = await supabase.from('ideas').select('*').in('id', unique);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapIdeaRow);
}

export interface IRecordIdeaImpressionsInput {
  userId: string;
  ideaIds: string[];
  action?: 'view' | 'pass' | 'vote';
}

export async function recordIdeaImpressions(input: IRecordIdeaImpressionsInput): Promise<void> {
  const { userId, ideaIds, action = 'view' } = input;
  if (ideaIds.length === 0) return;

  const rows = ideaIds.map((ideaId) => ({
    user_id: userId,
    idea_id: ideaId,
    action,
  }));

  const { error } = await supabase.from('idea_impressions').upsert(rows, {
    onConflict: 'user_id,idea_id',
    ignoreDuplicates: true,
  });

  if (error) throw new Error(error.message);
}

export async function markIdeaImpressionAsVote(
  userId: string,
  ideaId: string,
): Promise<void> {
  const { error } = await supabase.from('idea_impressions').upsert(
    {
      user_id: userId,
      idea_id: ideaId,
      action: 'vote',
    },
    {
      onConflict: 'user_id,idea_id',
      ignoreDuplicates: false,
    },
  );

  if (error) throw new Error(error.message);
}

export async function markIdeaImpressionAsPass(
  userId: string,
  ideaId: string,
): Promise<void> {
  const { error } = await supabase.from('idea_impressions').upsert(
    {
      user_id: userId,
      idea_id: ideaId,
      action: 'pass',
    },
    {
      onConflict: 'user_id,idea_id',
      ignoreDuplicates: false,
    },
  );

  if (error) throw new Error(error.message);
}

export interface IInsertIdeaInput {
  creatorId: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  /** 신규 업로드는 태그 기준. DB 하위 호환용으로 미지정 시 etc */
  category?: IIdeaCategory;
  categoryTags: string[];
}

export async function insertIdea(input: IInsertIdeaInput): Promise<IIdea> {
  const { data, error } = await supabase
    .from('ideas')
    .insert({
      creator_id: input.creatorId,
      title: input.title,
      description: input.description,
      thumbnail_url: input.thumbnailUrl ?? null,
      category: input.category ?? 'etc',
      category_tags: input.categoryTags,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapIdeaRow(data as Record<string, unknown>);
}

/**
 * 아이디어 부스트 활성화.
 * 만료 시각은 `VITE_BOOST_DURATION_MINUTES`로 계산한다.
 */
export async function activateIdeaBoost(ideaId: string): Promise<IIdea> {
  const { data, error } = await supabase
    .from('ideas')
    .update({
      is_boosted: true,
      boost_expires_at: makeBoostExpiresAt(),
    })
    .eq('id', ideaId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapIdeaRow(data as Record<string, unknown>);
}
