import { Button, useToast } from '@toss/tds-mobile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useBoostRemainingMs } from '@/hooks/useBoostRemainingMs';
import { boostApplyErrorMessage } from '@/lib/boostApplyMessages';
import { formatBoostRemainingMs } from '@/lib/formatBoostRemaining';
import { queryKeys } from '@/lib/queryKeys';
import { isBoostActive } from '@/lib/boostActive';
import { applyBoostChargeOnIdea } from '@/services/ideaService';
import { useAuthStore } from '@/store/authStore';
import type { IIdea } from '@/types/idea';

interface IBoostButtonProps {
  idea: Pick<IIdea, 'id' | 'isBoosted' | 'boostExpiresAt'>;
  disabled?: boolean;
}

/**
 * 보유 부스트 충전을 1회 소모해 이 아이디어에 피드 부스트를 적용한다.
 */
export default function BoostButton(props: IBoostButtonProps) {
  const { idea, disabled = false } = props;
  const { openToast } = useToast();
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const boostCharges = useAuthStore((s) => s.user?.boostCharges ?? 0);
  const [localBusy, setLocalBusy] = useState(false);

  const active = isBoostActive(idea);
  const remainingMs = useBoostRemainingMs(idea.boostExpiresAt, active);

  const mutation = useMutation({
    mutationFn: async () => applyBoostChargeOnIdea(idea.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ranking.all });
    },
  });

  const handlePress = async () => {
    if (active || boostCharges <= 0) return;
    const snapshot = boostCharges;
    setLocalBusy(true);
    updateUser({ boostCharges: snapshot - 1 });
    try {
      const res = await mutation.mutateAsync();
      if (!res.success) {
        updateUser({ boostCharges: snapshot });
        openToast(boostApplyErrorMessage(res.error), { higherThanCTA: true, duration: 2800 });
        return;
      }
      if (typeof res.boostCharges === 'number') {
        updateUser({ boostCharges: res.boostCharges });
      }
      openToast('부스트가 적용됐어요.', { higherThanCTA: true, duration: 2400 });
    } catch (err) {
      updateUser({ boostCharges: snapshot });
      const msg = err instanceof Error ? err.message : '부스트에 실패했어요.';
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

  const canUse = boostCharges > 0;

  return (
    <Button
      size="small"
      variant={canUse ? 'fill' : 'weak'}
      disabled={disabled || !canUse || mutation.isPending || localBusy}
      loading={mutation.isPending || localBusy}
      onClick={() => void handlePress()}
    >
      {canUse ? '부스트 사용' : '부스트 충전 필요'}
    </Button>
  );
}
