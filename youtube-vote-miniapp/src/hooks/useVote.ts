import { useCallback } from 'react';
import { useCastVoteMutation } from '@/hooks/queries';
import { useAuthStore } from '@/store/authStore';
import type { ICastVoteAtomicResult } from '@/types/vote';

interface IUseVoteResult {
  castVote: (ideaId: string) => Promise<ICastVoteAtomicResult>;
  isPending: boolean;
}

export function useVote(): IUseVoteResult {
  const voteMutation = useCastVoteMutation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const castVote = useCallback(
    async (ideaId: string) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const snapshotFree = user.freeTickets;
      const snapshotAd = user.adTickets;

      // 낙관적 반영: 즉시 티켓 감소 체감을 주고, 실패 시 롤백
      if (snapshotFree > 0) {
        updateUser({ freeTickets: snapshotFree - 1 });
      } else if (snapshotAd > 0) {
        updateUser({ adTickets: snapshotAd - 1 });
      }

      try {
        const res = await voteMutation.mutateAsync(ideaId);
        if (!res.success) {
          updateUser({ freeTickets: snapshotFree, adTickets: snapshotAd });
        }
        return res;
      } catch (error) {
        updateUser({ freeTickets: snapshotFree, adTickets: snapshotAd });
        throw error;
      }
    },
    [updateUser, user, voteMutation],
  );

  return {
    castVote,
    isPending: voteMutation.isPending,
  };
}
