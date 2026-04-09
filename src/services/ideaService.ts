import { supabase } from '@/services/supabase';
import { mapIdeaRow } from '@/lib/supabaseMappers';
import type { IIdea, IIdeaCategory, IIdeaPage } from '@/types/idea';

interface IUserDisplayRow {
  id: string;
  display_name: string;
}

async function attachCreatorDisplayNames(ideas: IIdea[]): Promise<IIdea[]> {
  if (ideas.length === 0) return ideas;
  const ids = [...new Set(ideas.map((i) => i.creatorId).filter(Boolean))];
  if (ids.length === 0) return ideas;

  const { data, error } = await supabase.rpc('fetch_user_display_names', {
    p_user_ids: ids,
  });
  if (error) throw new Error(error.message);

  const map = new Map(
    ((data ?? []) as IUserDisplayRow[]).map((r) => [r.id, r.display_name]),
  );
  return ideas.map((idea) => ({
    ...idea,
    creatorDisplayName: map.get(idea.creatorId) ?? '알 수 없음',
  }));
}

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
    .eq('user_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapIdeaRow);
}

/** RLS: 본인 행만 삭제. 연관 투표·노출 등은 DB CASCADE */
export async function deleteMyIdea(ideaId: string): Promise<void> {
  const { error } = await supabase.from('ideas').delete().eq('id', ideaId);
  if (error) throw new Error(error.message);
}

export async function fetchMyDailyIdeaUploadCount(creatorId: string): Promise<number> {
  const kstTodayStartIso = getKstTodayStartIso();
  const { count, error } = await supabase
    .from('ideas')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', creatorId)
    .gte('created_at', kstTodayStartIso);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * 공유 코드(8자리 대문자 hex) → 아이디어 조회
 * UUID 첫 8자리와 매칭: `xxxxxxxx-...`
 */
export async function fetchIdeaByCode(code: string): Promise<IIdea | null> {
  // uuid 컬럼은 PostgREST ILIKE 불가 → DB 함수(fetch_idea_by_code)로 처리
  const { data, error } = await supabase
    .rpc('fetch_idea_by_code', { p_code: code.toLowerCase() });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return null;

  const idea = mapIdeaRow(rows[0]!);
  const [enriched] = await attachCreatorDisplayNames([idea]);
  return enriched ?? idea;
}

export async function fetchIdeaById(ideaId: string): Promise<IIdea | null> {
  const { data, error } = await supabase.from('ideas').select('*').eq('id', ideaId).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: weekTotal, error: wErr } = await supabase.rpc('week_weight_total_for_idea', {
    p_idea_id: ideaId,
  });
  if (wErr) throw new Error(wErr.message);

  const idea = mapIdeaRow(data as Record<string, unknown>);
  const withWeek: IIdea = {
    ...idea,
    totalWeightedShares: Number(weekTotal ?? 0),
  };
  const [enriched] = await attachCreatorDisplayNames([withWeek]);
  return enriched ?? withWeek;
}

/** RLS 범위 내 다건 조회(내 투표 아이디어 묶음 등) */
export async function fetchIdeasByIds(ideaIds: string[]): Promise<IIdea[]> {
  const unique = [...new Set(ideaIds)].filter(Boolean);
  if (unique.length === 0) return [];

  const { data, error } = await supabase.from('ideas').select('*').in('id', unique);

  if (error) throw new Error(error.message);
  const mapped = ((data ?? []) as Record<string, unknown>[]).map(mapIdeaRow);
  return attachCreatorDisplayNames(mapped);
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
      user_id: input.creatorId,
      title: input.title,
      description: input.description,
      thumbnail_url: input.thumbnailUrl ?? null,
      category: input.category ?? 'etc',
      category_tags: input.categoryTags,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const mapped = mapIdeaRow(data as Record<string, unknown>);
  const { data: weekTotal, error: wErr } = await supabase.rpc('week_weight_total_for_idea', {
    p_idea_id: mapped.id,
  });
  if (wErr) throw new Error(wErr.message);
  return {
    ...mapped,
    totalWeightedShares: Number(weekTotal ?? 0),
  };
}

export interface IApplyBoostChargeResult {
  success: boolean;
  boostCharges?: number;
  error?: string;
}

/**
 * 보유 부스트 충전 1회 소모 → 본인 아이디어에 부스트 적용 (기간은 DB RPC와 `VITE_BOOST_DURATION_MINUTES` 동기).
 */
export async function applyBoostChargeOnIdea(ideaId: string): Promise<IApplyBoostChargeResult> {
  const { data, error } = await supabase.rpc('apply_boost_charge_on_idea', {
    p_idea_id: ideaId,
  });

  if (error) throw new Error(error.message);

  const row = data as Record<string, unknown> | null;
  if (!row || typeof row.success !== 'boolean') {
    return { success: false, error: 'INVALID_RPC_RESPONSE' };
  }

  return {
    success: row.success as boolean,
    boostCharges: row.boostCharges as number | undefined,
    error: row.error as string | undefined,
  };
}
