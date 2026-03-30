export type IAdType = 'ticket_recharge' | 'boost' | 'upload_bonus' | 'share_viral';

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
