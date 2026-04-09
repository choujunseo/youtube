import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Skeleton, TextButton, Top, useToast } from '@toss/tds-mobile';
import QueryErrorPanel from '@/components/common/QueryErrorPanel';
import TicketBadge from '@/components/vote/TicketBadge';
import VoteAction from '@/components/vote/VoteAction';
import { useTickets } from '@/hooks/useTickets';
import { useVote } from '@/hooks/useVote';
import IdeaTagChips from '@/components/feed/IdeaTagChips';
import { voteErrorMessage } from '@/lib/voteRpcMessages';
import { markIdeaImpressionAsVote } from '@/services/ideaService';
import { useIdeaQuery, useMyVoteForIdeaQuery } from '@/hooks/queries';
import { useAuthStore } from '@/store/authStore';

function IdeaDetailBody({ id }: { id: string }) {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const userId = useAuthStore((s) => s.user?.id);
  const [isVoteLocked, setIsVoteLocked] = useState(false);
  const tickets = useTickets();

  const ideaQuery = useIdeaQuery(id);
  const idea = ideaQuery.data;
  const voteQuery = useMyVoteForIdeaQuery(id);
  const myVote = voteQuery.data;
  const vote = useVote();

  const hasVoted = Boolean(myVote) || isVoteLocked;

  const ideaDetailBack = (
    <TextButton type="button" size="medium" variant="clear" onClick={() => void navigate(-1)}>
      뒤로
    </TextButton>
  );

  const handleVote = async () => {
    try {
      const res = await vote.castVote(id);
      if (res.success) {
        setIsVoteLocked(true);
        if (userId) {
          await markIdeaImpressionAsVote(userId, id);
        }
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
      openToast(msg, { higherThanCTA: true, duration: 3200 });
    }
  };

  if (ideaQuery.isLoading || (idea && voteQuery.isLoading)) {
    return (
      <main className="min-h-full bg-white">
        <Top upper={ideaDetailBack} subtitleTop="불러오는 중" title="아이디어 상세" />
        <div className="mx-auto max-w-md p-4">
          <Skeleton className="w-full" pattern="cardOnly" repeatLastItemCount={2} />
        </div>
      </main>
    );
  }

  if (ideaQuery.isError) {
    return (
      <main className="min-h-full bg-white">
        <Top upper={ideaDetailBack} subtitleTop="다시 시도해 주세요" title="아이디어 상세" />
        <div className="mx-auto max-w-md p-4">
          <QueryErrorPanel
            title="아이디어를 불러오지 못했어요"
            message="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            onRetry={() => void ideaQuery.refetch()}
          />
        </div>
      </main>
    );
  }

  if (!idea) {
    return (
      <main className="min-h-full bg-white p-4">
        <Top
          upper={ideaDetailBack}
          subtitleTop="삭제되었거나 주소가 잘못되었을 수 있어요"
          title="아이디어를 찾을 수 없어요"
        />
      </main>
    );
  }

  return (
    <main className="min-h-full bg-white pb-28">
      <Top
        upper={ideaDetailBack}
        subtitleTop={hasVoted ? '투표 결과' : '투표 전 마지막 확인'}
        subtitleBottom={hasVoted ? '철회할 수 없는 투표예요' : '투표 후에는 철회할 수 없어요'}
        title="아이디어 상세"
      />

      <section className="space-y-4 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <IdeaTagChips idea={idea} tone="muted" />
          {idea.isBoosted ? (
            <span className="rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-500">BOOST</span>
          ) : null}
          {hasVoted ? (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
              투표 완료
            </span>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <h2 className="mb-2 text-lg font-bold text-gray-900">{idea.title}</h2>
          <p className="text-sm leading-6 text-gray-600">{idea.description}</p>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-500">누적 표</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{idea.totalVoteCount}표</p>
        </div>
      </section>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        {hasVoted ? (
          <Button disabled display="full">
            투표 완료
          </Button>
        ) : !userId ? (
          <Button disabled variant="weak" display="full">
            로그인 후 투표할 수 있어요
          </Button>
        ) : (
          <VoteAction loading={vote.isPending} onConfirmVote={() => void handleVote()} />
        )}
      </div>

      {userId ? (
        <div className="pointer-events-none fixed bottom-[86px] left-0 right-0 z-30 flex justify-center px-4">
          <div className="pointer-events-auto flex w-full max-w-md justify-end">
            <TicketBadge freeTickets={tickets.freeTickets} adTickets={tickets.adTickets} />
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function IdeaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const ideaDetailBack = (
    <TextButton type="button" size="medium" variant="clear" onClick={() => void navigate(-1)}>
      뒤로
    </TextButton>
  );

  if (!id) {
    return (
      <main className="min-h-full bg-white p-4">
        <Top
          upper={ideaDetailBack}
          subtitleTop="주소가 올바른지 확인해 주세요"
          title="아이디어를 찾을 수 없어요"
        />
      </main>
    );
  }

  return <IdeaDetailBody key={id} id={id} />;
}
