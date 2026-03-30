import { Button, useToast } from '@toss/tds-mobile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useBoostRemainingMs } from '@/hooks/useBoostRemainingMs';
import { formatBoostRemainingMs } from '@/lib/formatBoostRemaining';
import { queryKeys } from '@/lib/queryKeys';
import { isBoostActive } from '@/lib/boostActive';
import { activateIdeaBoost } from '@/services/ideaService';
import { insertAdLog } from '@/services/adLogService';
import type { IIdea } from '@/types/idea';

function boostAdGroupId(): string {
  return (
    (import.meta.env.VITE_AD_GROUP_BOOST as string | undefined) ||
    (import.meta.env.VITE_AD_GROUP_ID as string | undefined) ||
    'boost_dev'
  );
}

interface IBoostButtonProps {
  idea: Pick<IIdea, 'id' | 'isBoosted' | 'boostExpiresAt'>;
  userId: string;
  disabled?: boolean;
}

/**
 * 리워드 광고 `userEarnedReward` 이후 `activateIdeaBoost` + 부스트 광고 로그.
 */
export default function BoostButton(props: IBoostButtonProps) {
  const { idea, userId, disabled = false } = props;
  const { openToast } = useToast();
  const queryClient = useQueryClient();
  const [localBusy, setLocalBusy] = useState(false);
  const adGroupId = boostAdGroupId();
  const { isSupported, isLoaded, showRewarded } = useRewardedAd(adGroupId);

  const active = isBoostActive(idea);
  const remainingMs = useBoostRemainingMs(idea.boostExpiresAt, active);

  const mutation = useMutation({
    mutationFn: async () => {
      const earned = await showRewarded();
      if (!earned) throw new Error('AD_NOT_COMPLETED');
      const updated = await activateIdeaBoost(idea.id);
      await insertAdLog({
        userId,
        adType: 'boost',
        adGroupId,
        rewardAmount: 0,
      });
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ranking.all });
    },
  });

  const handlePress = async () => {
    if (!isLoaded || active) return;
    setLocalBusy(true);
    try {
      await mutation.mutateAsync();
      openToast('부스트가 적용됐어요.', { higherThanCTA: true, duration: 2400 });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message === 'AD_NOT_COMPLETED'
            ? '광고 시청이 완료되지 않았어요.'
            : err.message
          : '부스트에 실패했어요.';
      openToast(msg, { higherThanCTA: true, duration: 2600 });
    } finally {
      setLocalBusy(false);
    }
  };

  if (active) {
    const label =
      idea.boostExpiresAt != null
        ? `부스트 · 남은 ${formatBoostRemainingMs(remainingMs)}`
        : '부스트 적용 중';
    return (
      <Button
        size="small"
        variant="weak"
        disabled
        className="pointer-events-none border-0 bg-gray-200 !text-gray-600 opacity-100"
      >
        {label}
      </Button>
    );
  }

  return (
    <Button
      size="small"
      disabled={disabled || !isSupported || !isLoaded || mutation.isPending || localBusy}
      loading={mutation.isPending || localBusy}
      onClick={() => void handlePress()}
    >
      광고 보고 부스트
    </Button>
  );
}
