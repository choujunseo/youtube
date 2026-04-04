import { supabase } from '@/services/supabase';
import type { IUserNotification } from '@/types/notification';

function mapNotificationRow(row: Record<string, unknown>): IUserNotification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    kind: row.kind as string,
    title: row.title as string,
    body: row.body as string,
    payload: (row.payload as Record<string, unknown>) ?? {},
    payoutLogId: (row.payout_log_id as string | null) ?? null,
    createdAt: row.created_at as string,
    readAt: (row.read_at as string | null) ?? null,
  };
}

export async function fetchMyNotifications(): Promise<IUserNotification[]> {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []).map((row) => mapNotificationRow(row as Record<string, unknown>));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
}
