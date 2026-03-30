import { supabase } from '@/services/supabase';
import { makeBoostExpiresAt } from '@/lib/boostConfig';
import { mapIdeaRow } from '@/lib/supabaseMappers';
import type { IIdea, IIdeaCategory, IIdeaPage } from '@/types/idea';

export interface IFetchIdeasPageParams {
  userId: string;
  weekId: string;
  limit: number;
  offset: number;
}

export async function fetchIdeasPage(params: IFetchIdeasPageParams): Promise<IIdeaPage> {
  const { userId, weekId, limit, offset } = params;
  const { data, error } = await supabase.rpc('fetch_feed_ideas_page', {
    p_user_id: userId,
    p_week_id: weekId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const items = rows.map(mapIdeaRow);
  const nextOffset = rows.length < limit ? null : offset + limit;

  return { items, nextOffset };
}

export async function fetchMyIdeasForWeek(creatorId: string, weekId: string): Promise<IIdea[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('week_id', weekId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapIdeaRow);
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

/** 주차 전체 아이디어(순위/확률 분모용). RLS: 공개 읽기 */
export async function fetchWeekIdeasAll(weekId: string): Promise<IIdea[]> {
  const { data, error } = await supabase.from('ideas').select('*').eq('week_id', weekId);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapIdeaRow);
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
  weekId: string;
  ideaIds: string[];
  action?: 'view' | 'pass' | 'vote';
}

export async function recordIdeaImpressions(input: IRecordIdeaImpressionsInput): Promise<void> {
  const { userId, weekId, ideaIds, action = 'view' } = input;
  if (ideaIds.length === 0) return;

  const rows = ideaIds.map((ideaId) => ({
    user_id: userId,
    week_id: weekId,
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
  weekId: string,
  ideaId: string,
): Promise<void> {
  const { error } = await supabase.from('idea_impressions').upsert(
    {
      user_id: userId,
      week_id: weekId,
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
  weekId: string,
  ideaId: string,
): Promise<void> {
  const { error } = await supabase.from('idea_impressions').upsert(
    {
      user_id: userId,
      week_id: weekId,
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
  weekId: string;
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
      week_id: input.weekId,
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
