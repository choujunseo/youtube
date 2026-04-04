import { supabase } from '@/services/supabase';

export interface IClaimAttendanceTicketResult {
  success: boolean;
  granted: boolean;
  grantType: 'welcome' | 'daily' | 'none';
  grantAmount: number;
  freeTickets: number;
  adTickets: number;
  attendanceDay?: string;
  error?: string;
}

export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
  const next = displayName.trim();
  if (!next) throw new Error('닉네임을 입력해 주세요.');

  const { error } = await supabase
    .from('users')
    .update({
      display_name: next,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

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

export async function claimAttendanceTicket(
  userId: string,
): Promise<IClaimAttendanceTicketResult> {
  const { data, error } = await supabase.rpc('claim_attendance_ticket', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);

  const row = (data ?? null) as Record<string, unknown> | null;
  if (!row || typeof row.success !== 'boolean') {
    return {
      success: false,
      granted: false,
      grantType: 'none',
      grantAmount: 0,
      freeTickets: 0,
      adTickets: 0,
      error: 'INVALID_RPC_RESPONSE',
    };
  }

  return {
    success: Boolean(row.success),
    granted: Boolean(row.granted),
    grantType: (row.grantType as 'welcome' | 'daily' | 'none') ?? 'none',
    grantAmount: Number(row.grantAmount ?? 0),
    freeTickets: Number(row.freeTickets ?? 0),
    adTickets: Number(row.adTickets ?? 0),
    attendanceDay: typeof row.attendanceDay === 'string' ? row.attendanceDay : undefined,
    error: typeof row.error === 'string' ? row.error : undefined,
  };
}
