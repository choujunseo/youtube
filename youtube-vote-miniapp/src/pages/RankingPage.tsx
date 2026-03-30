import { useCallback, useMemo, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Paragraph, Skeleton } from '@toss/tds-mobile';
import BrandPageHeader from '@/components/common/BrandPageHeader';
import QueryErrorPanel from '@/components/common/QueryErrorPanel';
import ReportIdeaModal from '@/components/report/ReportIdeaModal';
import RankingFeedRow from '@/components/ranking/RankingFeedRow';
import { useFeedStyleIdeaActions } from '@/hooks/feed/useFeedStyleIdeaActions';
import { useFeverUi } from '@/hooks/useFeverMode';
import { useActiveWeekQuery, useLiveRankingQuery, useMyVotesForWeekQuery } from '@/hooks/queries';
import { useRankingAccessibleKst } from '@/hooks/useRankingWindowKst';

const PULL_MAX = 92;
const PULL_TRIGGER = 62;

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RankingPage() {
  const accessible = useRankingAccessibleKst();
  const rankingQuery = useLiveRankingQuery();
  const { data: activeWeek } = useActiveWeekQuery();
  const { countdownMs } = useFeverUi(activeWeek?.status);
  const weekId = activeWeek?.id ?? null;
  const votesQuery = useMyVotesForWeekQuery(weekId);
  const {
    onVote,
    onReport,
    reportingIdeaId,
    reportModalIdeaId,
    closeReportModal,
    submitReportReason,
    isReportSubmitting,
  } = useFeedStyleIdeaActions();

  const myVoteMap = useMemo(
    () =>
      new Map((votesQuery.data ?? []).map((vote) => [vote.ideaId, vote] as const)),
    [votesQuery.data],
  );

  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [isPullArmed, setIsPullArmed] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  const rows = useMemo(() => rankingQuery.data ?? [], [rankingQuery.data]);

  const onRefresh = useCallback(async () => {
    if (isPullRefreshing) return;
    setIsPullRefreshing(true);
    try {
      await Promise.all([rankingQuery.refetch(), votesQuery.refetch()]);
    } finally {
      setIsPullRefreshing(false);
    }
  }, [isPullRefreshing, rankingQuery, votesQuery]);

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (isPullRefreshing) return;
    if (window.scrollY > 0) return;
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (isPullRefreshing) return;
    const startY = touchStartYRef.current;
    if (startY == null) return;
    if (window.scrollY > 0) return;

    const currentY = event.touches[0]?.clientY ?? startY;
    const rawDelta = currentY - startY;
    if (rawDelta <= 0) {
      setPullDistance(0);
      setIsPullArmed(false);
      return;
    }

    const resistance = 1 - Math.min(rawDelta / 210, 0.42);
    const nextDistance = Math.min(PULL_MAX, rawDelta * resistance);
    setPullDistance(nextDistance);
    setIsPullArmed(nextDistance >= PULL_TRIGGER);
    event.preventDefault();
  };

  const onTouchEnd = () => {
    touchStartYRef.current = null;
    const shouldRefresh = isPullArmed && !isPullRefreshing;
    setPullDistance(0);
    setIsPullArmed(false);
    if (shouldRefresh) {
      void onRefresh();
    }
  };

  const pullProgress = Math.min(1, pullDistance / PULL_TRIGGER);
  const spinnerRotate = Math.round(pullProgress * 220);
  const spinnerOpacity = isPullRefreshing ? 1 : Math.min(1, pullDistance / 18);

  if (!accessible) {
    return <Navigate to="/feed" replace />;
  }

  return (
    <main className="relative min-h-full bg-gradient-to-r from-rose-50 to-amber-50">
      <BrandPageHeader
        title="실시간 랭킹"
        containerClassName="border-rose-100 bg-gradient-to-r from-rose-50 to-amber-50"
        subtitle={
          <div className="flex w-full justify-center">
            <div className="text-center">
              <p className="text-sm font-semibold text-rose-700">
                피버 타임
              </p>
              <p className="mt-1 text-xs font-normal tabular-nums text-rose-600">
                라이브 집계 마감까지 {countdownMs != null ? formatCountdown(countdownMs) : '--:--'}
              </p>
            </div>
          </div>
        }
      />

      <section
        className="space-y-3 bg-gradient-to-r from-rose-50 to-amber-50 px-4 pb-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: touchStartYRef.current == null ? 'transform 180ms ease-out' : 'none',
        }}
      >
        <div className="flex h-8 items-center justify-center">
          <div
            className={[
              'h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-500',
              isPullRefreshing ? 'animate-spin' : '',
            ].join(' ')}
            style={
              isPullRefreshing
                ? { opacity: spinnerOpacity }
                : { transform: `rotate(${spinnerRotate}deg)`, opacity: spinnerOpacity }
            }
            aria-hidden
          />
        </div>

        {rankingQuery.isLoading ? (
          <Skeleton className="w-full max-w-md" pattern="cardOnly" repeatLastItemCount={5} />
        ) : null}

        {rankingQuery.isError ? (
          <QueryErrorPanel
            title="랭킹을 불러오지 못했어요"
            message="일시적으로 불러올 수 없어요. 네트워크를 확인한 뒤 다시 시도해 주세요."
            onRetry={() => void rankingQuery.refetch()}
          />
        ) : null}

        {!rankingQuery.isLoading && !rankingQuery.isError && rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            <p className="font-medium text-gray-700">표시할 랭킹이 없어요.</p>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              이번 주 진행 주차가 없거나, 등록된 아이디어가 아직 없을 수 있어요.
            </p>
          </div>
        ) : null}

        {rows.map((row) => (
          <RankingFeedRow
            key={row.ideaId}
            row={row}
            myVote={myVoteMap.get(row.ideaId)}
            onVote={onVote}
            onReport={onReport}
            reportingIdeaId={reportingIdeaId}
          />
        ))}
      </section>

      <ReportIdeaModal
        ideaId={reportModalIdeaId}
        onClose={closeReportModal}
        onSubmit={submitReportReason}
        isSubmitting={isReportSubmitting}
      />
    </main>
  );
}
