import { supabase } from '@/services/supabase';
import { mapWeeklyResultRow } from '@/lib/supabaseMappers';
import type { IWeeklyResult } from '@/types/weeklyResult';

export async function fetchWeeklyResultByWeekId(weekId: string): Promise<IWeeklyResult | null> {
  const { data, error } = await supabase
    .from('weekly_results')
    .select('*')
    .eq('week_id', weekId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapWeeklyResultRow(data as Record<string, unknown>);
}
