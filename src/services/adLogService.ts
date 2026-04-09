import { voteTicketAdGroupId } from '@/lib/adGroupIds';
import { supabase } from '@/services/supabase';
import { mapAdLogRow } from '@/lib/supabaseMappers';
import type {
  IAdLog,
  IBoostChargeRewardResult,
  IInsertAdLogInput,
  ITicketRechargeRewardResult,
} from '@/types/adLog';

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

/**
 * 광고 노출·완료 기록 전용 RPC.
 * SECURITY DEFINER로 실행되어 RLS 매핑 오류와 ad_type 제약 위반을 명시적으로 반환한다.
 * 전면형(hall_gate_interstitial) · 배너(feed_top_banner_impression) 등 집계용 insert에 사용한다.
 */
export async function recordAdImpression(input: IInsertAdLogInput): Promise<void> {
  const { data, error } = await supabase.rpc('record_ad_impression', {
    p_user_id: input.userId,
    p_ad_type: input.adType,
    p_ad_group_id: input.adGroupId,
    p_reward_amount: input.rewardAmount ?? 0,
  });

  if (error) throw new Error(error.message);

  const row = data as Record<string, unknown> | null;
  if (!row || row.success !== true) {
    throw new Error((row?.error as string | undefined) ?? 'RECORD_AD_IMPRESSION_FAILED');
  }
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


export async function rewardBoostRecharge(
  userId: string,
  options?: { adGroupId?: string; rewardAmount?: number },
): Promise<IBoostChargeRewardResult> {
  const adGroupId = options?.adGroupId ?? '';
  const rewardAmount = options?.rewardAmount ?? 1;

  const { data, error } = await supabase.rpc('reward_boost_recharge', {
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
    boostCharges: row.boostCharges as number | undefined,
    error: row.error as string | undefined,
  };
}

export async function rewardTicketRecharge(
  userId: string,
  options?: { adGroupId?: string; rewardAmount?: number },
): Promise<ITicketRechargeRewardResult> {
  const adGroupId = options?.adGroupId ?? voteTicketAdGroupId();
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
