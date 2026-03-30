import { supabase } from '@/services/supabase';

export async function patchUserAfterIdeaUpload(userId: string): Promise<void> {
  const { data: row, error: readErr } = await supabase
    .from('users')
    .select('weekly_upload_count')
    .eq('id', userId)
    .single();

  if (readErr) throw new Error(readErr.message);

  const nextCount = (Number(row?.weekly_upload_count) || 0) + 1;
  const { error } = await supabase
    .from('users')
    .update({
      weekly_upload_count: nextCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}
