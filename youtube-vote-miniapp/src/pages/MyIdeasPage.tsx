import { Skeleton } from '@toss/tds-mobile';
import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import BoostButton from '@/components/boost/BoostButton';
import MySubpageLayout from '@/components/my/MySubpageLayout';
import { useActiveWeekQuery, useMyIdeasAllQuery, useWeekIdeasAllQuery } from '@/hooks/queries';
import IdeaTagChips from '@/components/feed/IdeaTagChips';
import { buildWeekRankMap, weekTotalWeightedShares } from '@/lib/ideaWeekRanking';
import { isBoostActive } from '@/lib/boostActive';
import { useAuthStore } from '@/store/authStore';

const PREVIEW_MY_TABS = import.meta.env.VITE_MY_TABS_PREVIEW === 'true';

export default function MyIdeasPage() {
  if (PREVIEW_MY_TABS) {
    return (
      <MySubpageLayout title="내 아이디어" subtitle="">
        <section className="space-y-3 px-4 pt-2">
          <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">#LIFE</span>
                <span className="rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-600">BOOST</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900">출근 10분 단축 루틴</h3>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                아침 동선 체크리스트를 자동으로 묶어서 시간을 줄여주는 아이디어예요.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600">
                <div className="rounded-lg bg-gray-50 px-2 py-2">
                  <p className="text-gray-500">투표수</p>
                  <p className="mt-0.5 font-semibold text-gray-900">128표</p>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">#FINANCE</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900">하루 1분 절약 가계부</h3>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                템플릿 입력만으로 지출을 기록하는 초간단 가계부 아이디어예요.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600">
                <div className="rounded-lg bg-gray-50 px-2 py-2">
                  <p className="text-gray-500">투표수</p>
                  <p className="mt-0.5 font-semibold text-gray-900">79표</p>
                </div>
              </div>
            </div>
          </article>
        </section>
      </MySubpageLayout>
    );
  }

  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;

  const { data: activeWeek } = useActiveWeekQuery();
  const weekId = activeWeek?.id ?? null;

  const myIdeasQuery = useMyIdeasAllQuery(userId);
  const weekAllQuery = useWeekIdeasAllQuery(weekId);

  const rankMap = useMemo(
    () => buildWeekRankMap(weekAllQuery.data ?? []),
    [weekAllQuery.data],
  );
  const weekTotal = useMemo(
    () => weekTotalWeightedShares(weekAllQuery.data ?? []),
    [weekAllQuery.data],
  );

  const shareLabel = (weighted: number) => {
    if (weekTotal <= 0) return '-';
    return `${((weighted / weekTotal) * 100).toFixed(2)}%`;
  };

  if (myIdeasQuery.isLoading) {
    return (
      <MySubpageLayout title="내 아이디어" subtitle="전체 기간">
        <section className="px-4 pt-2">
          <Skeleton className="w-full max-w-md" pattern="cardOnly" repeatLastItemCount={3} />
        </section>
      </MySubpageLayout>
    );
  }

  const ideas = myIdeasQuery.data ?? [];

  return (
    <MySubpageLayout title="내 아이디어" subtitle="전체 기간">
      <section className="space-y-3 px-4 pt-2">
        {ideas.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500">
            등록한 아이디어가 없어요.
          </p>
        ) : null}

        {ideas.map((idea) => {
          const rank = idea.weekId === weekId ? (rankMap.get(idea.id) ?? null) : null;
          const boosted = isBoostActive(idea);

          return (
            <article
              key={idea.id}
              className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
                <span className="text-xl font-bold tabular-nums leading-none text-blue-600">
                  {rank != null ? rank : '–'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <IdeaTagChips idea={idea} tone="muted" />
                  {boosted ? (
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-600">BOOST</span>
                  ) : null}
                </div>
                <h3 className="text-base font-semibold text-gray-900">{idea.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">{idea.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="rounded-lg bg-gray-50 px-2 py-2">
                    <p className="text-gray-500">주간 가중치 비중(추정)</p>
                    <p className="mt-0.5 font-semibold text-gray-900">
                      {shareLabel(Number(idea.totalWeightedShares))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-2 py-2">
                    <p className="text-gray-500">누적 표 / 가중합</p>
                    <p className="mt-0.5 font-semibold text-gray-900">
                      {idea.totalVoteCount}표 · {String(idea.totalWeightedShares)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {userId && weekId && idea.weekId === weekId ? <BoostButton idea={idea} userId={userId} /> : null}
                  <NavLink
                    to={`/idea/${idea.id}`}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                  >
                    상세
                  </NavLink>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </MySubpageLayout>
  );
}
