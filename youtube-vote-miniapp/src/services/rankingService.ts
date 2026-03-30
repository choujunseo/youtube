import { supabase } from '@/services/supabase';
import { mapLiveRankingRow } from '@/lib/supabaseMappers';
import type { ILiveRankingRow } from '@/types/ranking';

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
