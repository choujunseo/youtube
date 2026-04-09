import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@toss/tds-mobile';
import QueryErrorPanel from '@/components/common/QueryErrorPanel';
import { useInfiniteScrollTrigger } from '@/hooks/feed/useInfiniteScrollTrigger';
import { useFeedInlineVote } from '@/hooks/feed/useFeedInlineVote';
import { useFeedStyleIdeaActions } from '@/hooks/feed/useFeedStyleIdeaActions';
import { FEED_EXPOSURE } from '@/lib/feedExposureConfig';
import {
  useIdeasInfiniteQuery,
  useIdeaQuery,
  useMyVotesAllQuery,
} from '@/hooks/queries';
import { getGuestFeedUserId } from '@/lib/guestFeedSession';
import { recordIdeaImpressions } from '@/services/ideaService';
import { useAuthStore } from '@/store/authStore';
import type { IIdea } from '@/types/idea';
import ReportIdeaModal from '@/components/report/ReportIdeaModal';
import { fireTossHaptic } from '@/utils/tossBridge';
import IdeaCard from './IdeaCard';

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isBoostActive(idea: IIdea, nowMs: number): boolean {
  if (!idea.isBoosted) return false;
  if (!idea.boostExpiresAt) return true;
  return new Date(idea.boostExpiresAt).getTime() > nowMs;
}

function reorderByBoostExposure(ideas: IIdea[], seedKey: string, feverMode: boolean): IIdea[] {
  const nowMs = Date.now();
  const boostWeight = feverMode ? FEED_EXPOSURE.boostWeightFever : FEED_EXPOSURE.boostWeightDefault;

  const scored = ideas.map((idea) => {
    const createdMs = new Date(idea.createdAt).getTime();
    const recencyHours = Math.max(1, (nowMs - createdMs) / 3_600_000);
    const recencyScore = 1 / recencyHours;
    const jitterSeed = hashString(`${idea.id}:${seedKey}`);
    const jitter = FEED_EXPOSURE.jitterMin + (jitterSeed % 1000) / 1000 * FEED_EXPOSURE.jitterRange;
    const weight = isBoostActive(idea, nowMs) ? boostWeight : 1;

    return {
      idea,
      score: recencyScore * weight * jitter,
      boosted: isBoostActive(idea, nowMs),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // 피드에서 부스트가 과도하게 연속 노출되지 않도록 완만한 캡 적용
  const arranged: typeof scored = [];
  const pool = [...scored];
  let consecutiveBoosted = 0;

  while (pool.length > 0) {
    const next = pool[0];
    const nextWouldExceedCap = next.boosted && consecutiveBoosted >= FEED_EXPOSURE.consecutiveCap;

    if (nextWouldExceedCap) {
      const nonBoostedIndex = pool.findIndex((item) => !item.boosted);
      if (nonBoostedIndex > 0) {
        const [nonBoosted] = pool.splice(nonBoostedIndex, 1);
        arranged.push(nonBoosted);
        consecutiveBoosted = 0;
        continue;
      }
    }

    arranged.push(next);
    pool.shift();
    consecutiveBoosted = next.boosted ? consecutiveBoosted + 1 : 0;
  }

  return arranged.map((row) => row.idea);
}

const SwipeFeed = (): JSX.Element => {
  const PULL_MAX = 92;
  const PULL_TRIGGER = 62;
  const [searchParams] = useSearchParams();
  const pinnedIdeaId = searchParams.get('highlight') ?? undefined;
  const userId = useAuthStore((s) => s.user?.id);
  const feedUserId = userId ?? getGuestFeedUserId();
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [isPullArmed, setIsPullArmed] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const pullThresholdHapticFiredRef = useRef(false);
  const cardRefMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const observedIdeaIdsRef = useRef<Set<string>>(new Set());
  const pendingIdeaIdsRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);

  const ideasQuery = useIdeasInfiniteQuery(feedUserId, 10);
  const pinnedQuery = useIdeaQuery(pinnedIdeaId ?? null);
  const votesQuery = useMyVotesAllQuery();
  const { voteIdea, votingIdeaId } = useFeedInlineVote();
  const {
    onReport,
    reportingIdeaId,
    reportModalIdeaId,
    closeReportModal,
    submitReportReason,
    isReportSubmitting,
  } = useFeedStyleIdeaActions();

  const ideas = useMemo(
    () => (ideasQuery.data?.pages ?? []).flatMap((page) => page.items),
    [ideasQuery.data],
  );
  const exposedIdeas = useMemo(() => {
    const reordered = reorderByBoostExposure(ideas, feedUserId, false);
    const pinned = pinnedQuery.data;
    if (!pinned) return reordered;
    // 중복 제거 후 최상단에 고정
    const rest = reordered.filter((i) => i.id !== pinned.id);
    return [pinned, ...rest];
  }, [ideas, feedUserId, pinnedQuery.data]);
  const myVoteMap = useMemo(
    () =>
      new Map(
        (votesQuery.data ?? []).map((vote) => {
          return [vote.ideaId, vote] as const;
        }),
      ),
    [votesQuery.data],
  );
  useEffect(() => {
    observedIdeaIdsRef.current.clear();
    pendingIdeaIdsRef.current.clear();
  }, [userId]);

  const setCardRef = useCallback((ideaId: string, element: HTMLDivElement | null) => {
    if (element) {
      cardRefMap.current.set(ideaId, element);
      return;
    }
    cardRefMap.current.delete(ideaId);
  }, []);

  useEffect(() => {
    if (!userId || exposedIdeas.length === 0) return;

    const pendingSet = pendingIdeaIdsRef.current;

    const scheduleFlush = () => {
      if (flushTimerRef.current != null) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        const ids = Array.from(pendingIdeaIdsRef.current);
        if (ids.length === 0) return;
        pendingIdeaIdsRef.current.clear();
        void recordIdeaImpressions({
          userId,
          ideaIds: ids,
          action: 'view',
        });
      }, 300);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLDivElement;
          const ideaId = target.dataset.ideaId;
          if (!ideaId) return;
          if (observedIdeaIdsRef.current.has(ideaId)) {
            observer.unobserve(target);
            return;
          }
          observedIdeaIdsRef.current.add(ideaId);
          pendingIdeaIdsRef.current.add(ideaId);
          observer.unobserve(target);
          scheduleFlush();
        });
      },
      { threshold: 0.6 },
    );

    const visibleIds = new Set(exposedIdeas.map((idea) => idea.id));
    cardRefMap.current.forEach((el, ideaId) => {
      if (!visibleIds.has(ideaId)) return;
      if (observedIdeaIdsRef.current.has(ideaId)) return;
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
      if (flushTimerRef.current != null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      const ids = Array.from(pendingSet);
      if (ids.length > 0) {
        pendingSet.clear();
        void recordIdeaImpressions({
          userId,
          ideaIds: ids,
          action: 'view',
        });
      }
    };
  }, [exposedIdeas, userId]);

  const sentinelRef = useInfiniteScrollTrigger({
    enabled: Boolean(ideasQuery.hasNextPage && !ideasQuery.isFetchingNextPage),
    onLoadMore: () => {
      if (ideasQuery.hasNextPage && !ideasQuery.isFetchingNextPage) {
        void ideasQuery.fetchNextPage();
      }
    },
  });

  const refreshFeed = useCallback(async () => {
    if (isPullRefreshing) return;
    setIsPullRefreshing(true);
    try {
      await Promise.all([ideasQuery.refetch(), votesQuery.refetch()]);
    } finally {
      setIsPullRefreshing(false);
    }
  }, [ideasQuery, isPullRefreshing, votesQuery]);

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (isPullRefreshing) return;
    if (window.scrollY > 0) return;
    pullThresholdHapticFiredRef.current = false;
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
      pullThresholdHapticFiredRef.current = false;
      return;
    }

    const resistance = 1 - Math.min(rawDelta / 210, 0.42);
    const nextDistance = Math.min(PULL_MAX, rawDelta * resistance);
    setPullDistance(nextDistance);
    setIsPullArmed(nextDistance >= PULL_TRIGGER);
    if (nextDistance >= PULL_TRIGGER) {
      if (!pullThresholdHapticFiredRef.current) {
        pullThresholdHapticFiredRef.current = true;
        fireTossHaptic('tickWeak');
      }
    } else {
      pullThresholdHapticFiredRef.current = false;
    }
    event.preventDefault();
  };

  const onTouchEnd = () => {
    touchStartYRef.current = null;
    const shouldRefresh = isPullArmed && !isPullRefreshing;
    setPullDistance(0);
    setIsPullArmed(false);
    if (shouldRefresh) {
      void refreshFeed();
    }
  };

  const pullProgress = Math.min(1, pullDistance / PULL_TRIGGER);
  const spinnerRotate = Math.round(pullProgress * 220);
  const spinnerOpacity = isPullRefreshing ? 1 : Math.min(1, pullDistance / 18);

  const reportModalEl = (
    <ReportIdeaModal
      ideaId={reportModalIdeaId}
      onClose={closeReportModal}
      onSubmit={submitReportReason}
      isSubmitting={isReportSubmitting}
    />
  );

  if (ideasQuery.isError) {
    return (
      <>
        <section className="px-4 pb-6">
          <QueryErrorPanel
            title="아이디어를 불러오지 못했어요"
            message="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            onRetry={() => void ideasQuery.refetch()}
          />
        </section>
        {reportModalEl}
      </>
    );
  }

  return (
    <>
    <section
      className="space-y-3 px-4 pb-6"
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
      {exposedIdeas.map((idea, index) => {
        const myVote = myVoteMap.get(idea.id);
        const isPinned = index === 0 && pinnedIdeaId === idea.id;
        return (
          <div key={idea.id} data-idea-id={idea.id} ref={(el) => setCardRef(idea.id, el)}>
            {isPinned ? (
              <div className="mb-1 flex items-center gap-1.5 px-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                  👋 친구가 공유한 아이디어
                </span>
              </div>
            ) : null}
            <IdeaCard
              idea={idea}
              onVote={() => void voteIdea(idea.id)}
              onReport={onReport}
              isVoted={Boolean(myVote)}
              voteLoading={votingIdeaId === idea.id}
              isReporting={reportingIdeaId === idea.id}
            />
          </div>
        );
      })}

      {ideasQuery.isLoading && exposedIdeas.length === 0 ? (
        <Skeleton className="w-full max-w-md" pattern="cardOnly" repeatLastItemCount={3} />
      ) : null}

      {!ideasQuery.isLoading && exposedIdeas.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          <p className="font-medium text-gray-700">지금은 보여 줄 아이디어가 없어요</p>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
            올라온 글이 없거나, 이미 본 아이디어는 피드에 다시 나오지 않아요. 잠시 뒤 새로고침하거나 새 업로드를 기다려 주세요.
          </p>
        </div>
      ) : null}

      {ideasQuery.isFetchingNextPage ? (
        <div className="py-2">
          <Skeleton className="w-full max-w-md" pattern="cardOnly" repeatLastItemCount={1} />
        </div>
      ) : null}

      {ideasQuery.hasNextPage ? <div ref={sentinelRef} className="h-1 w-full" /> : null}
    </section>

    {reportModalEl}
    </>
  );
};

export default SwipeFeed;
