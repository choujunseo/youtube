export type IAdType =
  | 'ticket_recharge'
  | 'boost'
  | 'boost_charge_recharge'
  | 'hall_gate_interstitial'
  | 'feed_top_banner_impression'
  | 'upload_bonus';

/** `ad_logs` 테이블 행 */
export interface IAdLog {
  id: string;
  userId: string;
  adType: IAdType;
  adGroupId: string;
  rewardAmount: number;
  createdAt: string;
}

export interface IInsertAdLogInput {
  userId: string;
  adType: IAdType;
  adGroupId: string;
  rewardAmount?: number;
}

export interface ITicketRechargeRewardResult {
  success: boolean;
  rewardAmount?: number;
  adTickets?: number;
  error?: string;
}

export interface IBoostChargeRewardResult {
  success: boolean;
  rewardAmount?: number;
  boostCharges?: number;
  error?: string;
}
