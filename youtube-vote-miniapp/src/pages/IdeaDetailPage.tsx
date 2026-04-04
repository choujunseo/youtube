import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, FixedBottomCTA, Skeleton, TextButton, Top, useToast } from '@toss/tds-mobile';
import QueryErrorPanel from '@/components/common/QueryErrorPanel';
import AdRewardButton from '@/components/ad/AdRewardButton';
import ProbabilityGauge from '@/components/vote/ProbabilityGauge';
import TicketBadge from '@/components/vote/TicketBadge';
import VoteAction from '@/components/vote/VoteAction';
import { useTickets } from '@/hooks/useTickets';
import { useVote } from '@/hooks/useVote';
import IdeaTagChips from '@/components/feed/IdeaTagChips';
import { markIdeaImpressionAsVote } from '@/services/ideaService';
import { useIdeaQuery, useMyVoteForIdeaQuery } from '@/hooks/queries';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';

function isRpcErrorCode(msg: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(msg);
}

function voteErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'ALREADY_VOTED':
      return '이미 이 아이디어에 투표했어요.';
    case 'NO_TICKETS':
      return '투표권이 없어요.';
    case 'NO_ACTIVE_WEEK':
      return '진행 중인 주차가 없어요.';
    case 'IDEA_NOT_IN_CURRENT_WEEK':
      return '이번 주 아이디어가 아니에요.';
    case 'USER_NOT_FOUND':
      return '사용자 정보를 찾을 수 없어요.';
    case 'FORBIDDEN':
      return '권한이 없어요. 다시 로그인해 주세요.';
    case 'INVALID_RPC_RESPONSE':
    case 'INVALID_REWARD_AMOUNT':
      return '보상 처리에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
    default:
      return code ? `투표 실패: ${code}` : '투표에 실패했어요.';
  }
}

export default function IdeaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openToast } = useToast();
  const userId = useAuthStore((s) => s.user?.id);
  const [isNoTicketModalOpen, setIsNoTicketModalOpen] = useState(false);
  const [isRewarding, setIsRewarding] = useState(false);
  const [isVoteLocked, setIsVoteLocked] = useState(false);
  const [gaugeCelebrateKey, setGaugeCelebrateKey] = useState(0);
  const tickets = useTickets();

  const ideaQuery = useIdeaQuery(id ?? null);
  const idea = ideaQuery.data;
  const voteQuery = useMyVoteForIdeaQuery(id ?? null);
  const myVote = voteQuery.data;
  const vote = useVote();

  const hasVoted = Boolean(myVote) || isVoteLocked;

  useEffect(() => {
    setIsVoteLocked(false);
  }, [id]);

  const probability = useMemo(() => {
    if (!myVote || !idea || idea.totalWeightedShares <= 0) return null;
    return (Number(myVote.weightedShare) / Number(idea.totalWeightedShares)) * 100;
  }, [myVote, idea]);

  const ideaDetailBack = (
    <TextButton type="button" onClick={() => void navigate(-1)}>
      뒤로
    </TextButton>
  );

  const handleVote = async () => {
    if (!id) return;

    try {
      const res = await vote.castVote(id);
      if (res.success) {
        setIsVoteLocked(true);
        setGaugeCelebrateKey((k) => k + 1);
        if (userId) {
          await markIdeaImpressionAsVote(userId, id);
        }
        const p =
          res.probability != null
            ? `${Number(res.probability).toFixed(2)}%`
            : probability != null
              ? `${probability.toFixed(2)}%`
              : '-';
        openToast(`투표 완료! 내 당첨 확률 ${p}`, {
          higherThanCTA: true,
          duration: 3200,
        });
      } else {
        if (res.error === 'NO_TICKETS') {
          setIsNoTicketModalOpen(true);
          return;
        }
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
        <Top upper={ideaDetailBack} subtitleTop="불러오는 중">
          아이디어 상세
        </Top>
        <div className="mx-auto max-w-md p-4">
          <Skeleton className="w-full" pattern="cardOnly" repeatLastItemCount={2} />
        </div>
      </main>
    );
  }

  if (ideaQuery.isError) {
    return (
      <main className="min-h-full bg-white">
        <Top upper={ideaDetailBack} subtitleTop="다시 시도해 주세요">
          아이디어 상세
        </Top>
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
        <Top upper={ideaDetailBack} subtitleTop="삭제되었거나 주소가 잘못되었을 수 있어요">
          아이디어를 찾을 수 없어요
        </Top>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-white pb-28">
      <Top
        upper={ideaDetailBack}
        subtitleTop={hasVoted ? '투표 결과' : '투표 전 마지막 확인'}
        subtitleBottom={hasVoted ? '철회할 수 없는 투표예요' : '투표 후에는 철회할 수 없어요'}
      >
        아이디어 상세
      </Top>

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

        {hasVoted ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-xs text-blue-600">현재 총 투표</p>
              <p className="text-lg font-bold text-blue-700">{idea.totalVoteCount}</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3">
              <p className="text-xs text-violet-600">가중치 합</p>
              <p className="text-lg font-bold text-violet-700">{idea.totalWeightedShares}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-white p-3 ring-1 ring-blue-100">
              <ProbabilityGauge probability={probability} celebrateKey={gaugeCelebrateKey} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">현재 총 투표</p>
              <p className="text-lg font-bold tabular-nums text-gray-900">{idea.totalVoteCount}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">가중치 합</p>
              <p className="text-lg font-bold tabular-nums text-gray-900">{idea.totalWeightedShares}</p>
            </div>
          </div>
        )}
      </section>

      <FixedBottomCTA>
        <FixedBottomCTA.Single>
          {hasVoted ? (
            <Button disabled>투표 완료</Button>
          ) : !userId ? (
            <Button disabled variant="weak">
              로그인 후 투표할 수 있어요
            </Button>
          ) : (
            <VoteAction loading={vote.isPending} onConfirmVote={() => void handleVote()} />
          )}
        </FixedBottomCTA.Single>
      </FixedBottomCTA>

      {userId ? (
        <div className="pointer-events-none fixed bottom-[86px] left-0 right-0 z-30 flex justify-center px-4">
          <div className="pointer-events-auto flex w-full max-w-md justify-end">
            <TicketBadge freeTickets={tickets.freeTickets} adTickets={tickets.adTickets} />
          </div>
        </div>
      ) : null}

      {tickets.isWeeklyResetDue ? (
        <div className="pointer-events-none fixed bottom-[122px] left-0 right-0 z-20 flex justify-center px-4">
          <div className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
            주간 티켓 리셋 시점을 확인해 주세요.
          </div>
        </div>
      ) : null}

      {isNoTicketModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/45 animate-modal-backdrop-in" aria-hidden />
          <div className="relative w-full max-w-md animate-bottom-sheet-in rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-base font-semibold text-gray-900">투표권이 부족해요</p>
            <p className="mt-2 text-sm leading-5 text-gray-600">
              광고를 보고 투표권을 얻을까요?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="weak"
                disabled={isRewarding}
                onClick={() => {
                  setIsNoTicketModalOpen(false);
                }}
              >
                닫기
              </Button>
              {userId ? (
                <AdRewardButton
                  userId={userId}
                  adGroupId="vote_no_ticket_modal"
                  label="광고 보고 투표하기"
                  onBusyChange={setIsRewarding}
                  onAdNotCompleted={() =>
                    openToast('광고 시청을 완료하지 못했어요.', {
                      higherThanCTA: true,
                      duration: 2600,
                    })
                  }
                  onRewardError={(msg) =>
                    openToast(isRpcErrorCode(msg) ? voteErrorMessage(msg) : msg, {
                      higherThanCTA: true,
                      duration: 2600,
                    })
                  }
                  onRewardSuccess={() => {
                    setIsNoTicketModalOpen(false);
                    openToast('투표권 1개가 충전됐어요. 아래에서 투표를 진행해 주세요.', {
                      higherThanCTA: true,
                      duration: 3000,
                    });
                  }}
                />
              ) : (
                <Button variant="weak" disabled>
                  로그인 후 이용
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
