import { Button } from '@toss/tds-mobile';
import { useState } from 'react';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { rewardTicketRecharge } from '@/services/adLogService';
import { useAuthStore } from '@/store/authStore';
import type { ITicketRechargeRewardResult } from '@/types/adLog';

export interface IAdRewardButtonProps {
  userId: string;
  adGroupId?: string;
  label?: string;
  disabled?: boolean;
  variant?: 'default' | 'weak';
  onAdNotCompleted?: () => void;
  onRewardSuccess?: (result: ITicketRechargeRewardResult) => void;
  onRewardError?: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

/**
 * 리워드 광고 시청 → Supabase `reward_ticket_recharge`로 티켓 지급 · ad_logs 기록.
 */
export default function AdRewardButton(props: IAdRewardButtonProps) {
  const {
    userId,
    adGroupId = (import.meta.env.VITE_AD_GROUP_ID as string | undefined) ?? 'vote_no_ticket_modal',
    label = '광고 보고 티켓 받기',
    disabled = false,
    variant = 'default',
    onAdNotCompleted,
    onRewardSuccess,
    onRewardError,
    onBusyChange,
  } = props;

  const { isSupported, isLoaded, showRewarded } = useRewardedAd(adGroupId);
  const updateUser = useAuthStore((s) => s.updateUser);
  const currentUser = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (!isSupported) {
      onRewardError?.('이 기기에서는 리워드 광고를 지원하지 않아요.');
      return;
    }
    setLoading(true);
    onBusyChange?.(true);
    try {
      if (!isLoaded) {
        onAdNotCompleted?.();
        return;
      }
      const watched = await showRewarded();
      if (!watched) {
        onAdNotCompleted?.();
        return;
      }

      const reward = await rewardTicketRecharge(userId, { adGroupId });
      if (!reward.success) {
        onRewardError?.(reward.error ?? '보상 지급에 실패했어요.');
        return;
      }

      if (typeof reward.adTickets === 'number') {
        updateUser({ adTickets: reward.adTickets });
      } else {
        updateUser({ adTickets: (currentUser?.adTickets ?? 0) + (reward.rewardAmount ?? 1) });
      }
      onRewardSuccess?.(reward);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '광고 보상 처리에 실패했어요.';
      onRewardError?.(msg);
    } finally {
      setLoading(false);
      onBusyChange?.(false);
    }
  };

  return (
    <Button
      variant={variant === 'weak' ? 'weak' : undefined}
      disabled={disabled || !isSupported || !isLoaded}
      loading={loading}
      onClick={() => void handlePress()}
    >
      {label}
    </Button>
  );
}
