import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { Skeleton } from '@toss/tds-mobile';
import BrandPageHeader from '@/components/common/BrandPageHeader';
import QueryErrorPanel from '@/components/common/QueryErrorPanel';
import ReportIdeaModal from '@/components/report/ReportIdeaModal';
import { useFeedStyleIdeaActions } from '@/hooks/feed/useFeedStyleIdeaActions';
import { useHallOfFameQuery } from '@/hooks/queries';
import { IDEA_CATEGORY_LABEL } from '@/lib/ideaCategoryLabel';
import { isIntegratedAdSupported, showIntegratedFullScreenGateAd } from '@/utils/tossBridge';

const PULL_MAX = 92;
const PULL_TRIGGER = 62;
const HALL_GATE_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const HALL_GATE_COOLDOWN_KEY = 'ideaLeague.hallGate.lastShownAt';

export default function HallOfFamePage() {
  const hallQuery = useHallOfFameQuery();
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [isPullArmed, setIsPullArmed] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const gateTriedRef = useRef(false);
  const hallGateAdGroupId =
    (import.meta.env.VITE_AD_GROUP_HALL_OF_FAME_GATE as string | undefined) ??
    (import.meta.env.VITE_AD_GROUP_ID as string | undefined) ??
    'hall_of_fame_gate';

  const rows = useMemo(() => hallQuery.data ?? [], [hallQuery.data]);

  const {
    onReport,
    reportingIdeaId,
    reportModalIdeaId,
    closeReportModal,
    submitReportReason,
    isReportSubmitting,
  } = useFeedStyleIdeaActions();

  const onRefresh = useCallback(async () => {
    if (isPullRefreshing) return;
    setIsPullRefreshing(true);
    try {
      await hallQuery.refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [hallQuery, isPullRefreshing]);

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

  useEffect(() => {
    if (gateTriedRef.current) return;
    gateTriedRef.current = true;

    if (!isIntegratedAdSupported()) return;

    let lastShownAt = 0;
    try {
      const raw = localStorage.getItem(HALL_GATE_COOLDOWN_KEY);
      lastShownAt = raw ? Number(raw) : 0;
    } catch {
      lastShownAt = 0;
    }
    if (Number.isFinite(lastShownAt) && lastShownAt > 0 && Date.now() - lastShownAt < HALL_GATE_COOLDOWN_MS) {
      return;
    }

    void showIntegratedFullScreenGateAd(hallGateAdGroupId).then((shown) => {
      if (!shown) return;
      try {
        localStorage.setItem(HALL_GATE_COOLDOWN_KEY, String(Date.now()));
      } catch {
        // ignore
      }
    });
  }, [hallGateAdGroupId]);

  const reportModalEl = (
    <ReportIdeaModal
      ideaId={reportModalIdeaId}
      onClose={closeReportModal}
      onSubmit={submitReportReason}
      isSubmitting={isReportSubmitting}
    />
  );

  return (
    <main className="relative min-h-full bg-transparent">
      <BrandPageHeader title="명예의 전당" containerClassName="border-amber-100/80 bg-transparent" />

      <section className="space-y-3 bg-transparent px-4 pb-6"
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

        {hallQuery.isLoading ? (
          <Skeleton className="w-full max-w-md" pattern="cardOnly" repeatLastItemCount={5} />
        ) : null}

        {hallQuery.isError ? (
          <QueryErrorPanel
            title="명예의 전당을 불러오지 못했어요"
            message="네트워크를 확인한 뒤 다시 시도해 주세요."
            onRetry={() => void hallQuery.refetch()}
          />
        ) : null}

        {!hallQuery.isLoading && !hallQuery.isError && rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            <p className="font-medium text-gray-700">아직 600표 달성 아이디어가 없어요.</p>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              첫 번째 명예의 전당 주인공이 곧 등장할 거예요.
            </p>
          </div>
        ) : null}

        {rows.map((row) => (
          <article key={row.ideaId} className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-base font-semibold text-gray-900">{row.creatorName}</p>
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">
                {IDEA_CATEGORY_LABEL[row.category]}
              </span>
            </div>
            <h3 className="mb-2 text-base font-semibold text-gray-900">{row.title}</h3>
            <p className="text-sm leading-5 text-gray-600">{row.description}</p>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="text-sm text-gray-400 underline underline-offset-2 disabled:opacity-60"
                onClick={() => onReport(row.ideaId)}
                disabled={reportingIdeaId === row.ideaId}
              >
                {reportingIdeaId === row.ideaId ? '제출 중' : '신고'}
              </button>
            </div>
          </article>
        ))}
      </section>
      {reportModalEl}
    </main>
  );
}
