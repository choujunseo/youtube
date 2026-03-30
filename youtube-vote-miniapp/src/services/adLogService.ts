import { supabase } from '@/services/supabase';
import { mapAdLogRow } from '@/lib/supabaseMappers';
import type { IAdLog, IInsertAdLogInput, ITicketRechargeRewardResult } from '@/types/adLog';

export async function insertAdLog(input: IInsertAdLogInput): Promise<IAdLog> {
  const { data, error } = await supabase
    .from('ad_logs')
    .insert({
      user_id: input.userId,
      ad_type: input.adType,
      ad_group_id: input.adGroupId,
      reward_amount: input.rewardAmount ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapAdLogRow(data as Record<string, unknown>);
}

export async function fetchMyAdLogs(limit = 50): Promise<IAdLog[]> {
  const { data, error } = await supabase
    .from('ad_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapAdLogRow);
}

const DEFAULT_TICKET_RECHARGE_AD_GROUP = 'vote_no_ticket_modal';

/** 공유 리워드(sendViral) 완료 후 서버에서 투표권 1장 (KST 일 1회) */
export async function rewardShareViralTicket(userId: string): Promise<ITicketRechargeRewardResult> {
  const { data, error } = await supabase.rpc('reward_share_viral_ticket', {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);

  const row = data as Record<string, unknown> | null;
  if (!row || typeof row.success !== 'boolean') {
    return { success: false, error: 'INVALID_RPC_RESPONSE' };
  }

  return {
    success: row.success as boolean,
    rewardAmount: row.rewardAmount as number | undefined,
    adTickets: row.adTickets as number | undefined,
    error: row.error as string | undefined,
  };
}

export async function rewardTicketRecharge(
  userId: string,
  options?: { adGroupId?: string; rewardAmount?: number },
): Promise<ITicketRechargeRewardResult> {
  const adGroupId =
    options?.adGroupId ??
    (import.meta.env.VITE_AD_GROUP_ID as string | undefined) ??
    DEFAULT_TICKET_RECHARGE_AD_GROUP;
  const rewardAmount = options?.rewardAmount ?? 1;

  const { data, error } = await supabase.rpc('reward_ticket_recharge', {
    p_user_id: userId,
    p_ad_group_id: adGroupId,
    p_reward_amount: rewardAmount,
  });

  if (error) throw new Error(error.message);

  const row = data as Record<string, unknown> | null;
  if (!row || typeof row.success !== 'boolean') {
    return { success: false, error: 'INVALID_RPC_RESPONSE' };
  }

  return {
    success: row.success as boolean,
    rewardAmount: row.rewardAmount as number | undefined,
    adTickets: row.adTickets as number | undefined,
    error: row.error as string | undefined,
  };
}
