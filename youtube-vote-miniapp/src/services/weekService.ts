import { supabase } from '@/services/supabase';
import { mapWeekRow } from '@/lib/supabaseMappers';
import type { IWeek } from '@/types/week';

/** 현재 진행 중인 주차 (`active` | `fever`, 최신 `start_at` 1건) */
export async function fetchActiveWeek(): Promise<IWeek | null> {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .in('status', ['active', 'fever'])
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapWeekRow(data as Record<string, unknown>);
}

export async function fetchWeekById(weekId: string): Promise<IWeek | null> {
  const { data, error } = await supabase.from('weeks').select('*').eq('id', weekId).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapWeekRow(data as Record<string, unknown>);
}

/** 정산 완료된 주차 중 가장 최근 1건 (`end_at` 기준) */
export async function fetchLatestSettledWeek(): Promise<IWeek | null> {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('status', 'settled')
    .order('end_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapWeekRow(data as Record<string, unknown>);
}
