import { useToast } from '@toss/tds-mobile';
import { useCallback, useRef, useState } from 'react';
import { useVote } from '@/hooks/useVote';
import { isRpcErrorCode, voteErrorMessage } from '@/lib/voteRpcMessages';
import { markIdeaImpressionAsVote } from '@/services/ideaService';
import { useAuthStore } from '@/store/authStore';

export function useFeedInlineVote() {
  const { openToast } = useToast();
  const userId = useAuthStore((s) => s.user?.id);
  const vote = useVote();
  const [votingIdeaId, setVotingIdeaId] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const voteIdea = useCallback(
    async (ideaId: string) => {
      if (!userId) {
        openToast('로그인 후 투표할 수 있어요.', { higherThanCTA: true, duration: 2600 });
        return;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setVotingIdeaId(ideaId);
      try {
        const res = await vote.castVote(ideaId);
        if (res.success) {
          await markIdeaImpressionAsVote(userId, ideaId);
          openToast('투표 완료!', {
            higherThanCTA: true,
            duration: 3200,
          });
        } else {
          openToast(voteErrorMessage(res.error), {
            higherThanCTA: true,
            duration: 3200,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '알 수 없는 오류';
        openToast(isRpcErrorCode(msg) ? voteErrorMessage(msg) : msg, {
          higherThanCTA: true,
          duration: 3200,
        });
      } finally {
        inFlightRef.current = false;
        setVotingIdeaId(null);
      }
    },
    [openToast, userId, vote],
  );

  return { voteIdea, votingIdeaId };
}
