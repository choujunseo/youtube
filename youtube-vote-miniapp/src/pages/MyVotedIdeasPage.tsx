import { Skeleton } from '@toss/tds-mobile';
import { NavLink } from 'react-router-dom';
import QueryErrorPanel from '@/components/common/QueryErrorPanel';
import IdeaTagChips from '@/components/feed/IdeaTagChips';
import MySubpageLayout from '@/components/my/MySubpageLayout';
import { useMyVotedIdeasAllQuery } from '@/hooks/queries';
import { computeVoteProbability } from '@/lib/ideaVoteProbability';
import { useAuthStore } from '@/store/authStore';

/** `votes.day_of_week`: PG EXTRACT(DOW) KST, 0=일 … 6=토 */
const KST_DOW_LABEL = ['일', '월', '화', '수', '목', '금', '토'] as const;
const PREVIEW_MY_TABS = import.meta.env.VITE_MY_TABS_PREVIEW === 'true';

function labelVoteDay(d: number): string {
  return KST_DOW_LABEL[d] ?? '?';
}

export default function MyVotedIdeasPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (PREVIEW_MY_TABS) {
    return (
      <MySubpageLayout title="내가 투표한 아이디어" subtitle="">
        <section className="space-y-3 px-4 pt-2">
          <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">출근 10분 단축 루틴</h3>
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">작은 습관으로 아침 시간을 줄이는 아이디어예요.</p>
            <div className="mt-3 space-y-1 text-xs text-gray-600">
              <p className="font-medium text-blue-700">당첨확률 : 42.15%</p>
            </div>
          </article>
          <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">하루 1분 절약 가계부</h3>
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">입력 단계를 줄여서 매일 빠르게 기록하는 방식이에요.</p>
            <div className="mt-3 space-y-1 text-xs text-gray-600">
              <p className="font-medium text-blue-700">당첨확률 : 21.06%</p>
            </div>
          </article>
        </section>
      </MySubpageLayout>
    );
  }

  const votedQuery = useMyVotedIdeasAllQuery();

  if (!isLoggedIn) {
    return (
      <MySubpageLayout title="내가 투표한 아이디어" subtitle="이번 주 투표 내역">
        <p className="px-4 pt-2 text-sm text-gray-600">로그인 후 확인할 수 있어요.</p>
      </MySubpageLayout>
    );
  }

  if (votedQuery.isLoading) {
    return (
      <MySubpageLayout title="내가 투표한 아이디어" subtitle="전체 기간">
        <section className="px-4 pt-2">
          <Skeleton className="w-full max-w-md" pattern="cardOnly" repeatLastItemCount={3} />
        </section>
      </MySubpageLayout>
    );
  }

  if (votedQuery.isError) {
    return (
      <MySubpageLayout title="내가 투표한 아이디어" subtitle="전체 기간">
        <div className="px-4 pt-2">
          <QueryErrorPanel
            message={votedQuery.error instanceof Error ? votedQuery.error.message : '다시 시도해 주세요.'}
            onRetry={() => void votedQuery.refetch()}
          />
        </div>
      </MySubpageLayout>
    );
  }

  const rows = votedQuery.data ?? [];

  return (
    <MySubpageLayout title="내가 투표한 아이디어" subtitle="전체 기간">
      <section className="space-y-3 px-4 pt-2">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500">
            투표한 아이디어가 없어요.
          </p>
        ) : null}

        {rows.map(({ vote, idea }) => {
          const prob =
            idea != null ? computeVoteProbability(idea, vote) : null;
          const probLabel =
            prob != null && Number.isFinite(prob) ? `${prob.toFixed(2)}%` : null;

          return (
            <article
              key={vote.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              {idea ? (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <IdeaTagChips idea={idea} tone="muted" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{idea.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{idea.description}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">아이디어를 불러오지 못했어요.</p>
              )}

              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <p>
                  투표 요일 · 가중: {labelVoteDay(vote.dayOfWeek)}요일 · {vote.weight}배 · 내 지분{' '}
                  {String(vote.weightedShare)}
                </p>
                {probLabel ? (
                  <p className="font-medium text-blue-700">이 아이디어 당첨 확률(추정) {probLabel}</p>
                ) : null}
              </div>

              {idea ? (
                <div className="mt-3 flex justify-end">
                  <NavLink
                    to={`/idea/${idea.id}`}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                  >
                    상세
                  </NavLink>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </MySubpageLayout>
  );
}
