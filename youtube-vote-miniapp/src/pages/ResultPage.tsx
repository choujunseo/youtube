import { NavLink, useParams } from 'react-router-dom';
import { Top } from '@toss/tds-mobile';
import { useIdeaQuery, useWeekQuery, useWeeklyResultQuery } from '@/hooks/queries';
import { formatWeekLabel } from '@/lib/weekLabel';
import { useAuthStore } from '@/store/authStore';

const PREVIEW_MY_TABS = import.meta.env.VITE_MY_TABS_PREVIEW === 'true';

function formatWon(n: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(n)}원`;
}

function parseRankingLines(raw: unknown): Array<{ rank: number; title: string }> {
  if (!Array.isArray(raw)) return [];
  const lines: Array<{ rank: number; title: string }> = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const rank = typeof o.rank === 'number' ? o.rank : Number(o.rank);
    const title =
      typeof o.title === 'string'
        ? o.title
        : typeof o.idea_title === 'string'
          ? o.idea_title
          : '';
    if (!Number.isFinite(rank) || !title) continue;
    lines.push({ rank, title });
  }
  return lines.sort((a, b) => a.rank - b.rank);
}

export default function ResultPage() {
  const { weekId: weekIdParam } = useParams<{ weekId: string }>();
  const weekId = weekIdParam ?? null;
  const meId = useAuthStore((s) => s.user?.id ?? null);

  if (PREVIEW_MY_TABS && weekId === 'preview') {
    return (
      <main className="relative min-h-full bg-gray-50 pb-6">
        <div className="px-1 pt-2">
          <NavLink
            to="/my"
            className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-gray-100"
            aria-label="My로 돌아가기"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="text-gray-900">
              <path
                d="M15 6L9 12L15 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </NavLink>
        </div>
        <Top subtitleTop="25.03.24 - 25.03.30 · 정산 완료">주간 결과</Top>
        <section className="space-y-3 px-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">1위 아이디어</p>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">#LIFE</span>
            </div>
            <p className="mt-1 text-base font-semibold text-gray-900">출근 10분 단축 루틴</p>
            <p className="mt-2 text-sm leading-5 text-gray-600">
              아침 동선 체크리스트를 자동으로 묶어서 시간을 줄여주는 아이디어예요.
            </p>
            <div className="mt-3 rounded-lg bg-gray-50 px-2 py-2 text-xs text-gray-600">
              <p className="text-gray-500">투표수</p>
              <p className="mt-0.5 font-semibold text-gray-900">128표</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">상금 배분</p>
            <ul className="mt-2 space-y-2 text-sm text-gray-800">
              <li className="flex justify-between gap-2">
                <span>창작자</span>
                <span className="font-semibold tabular-nums text-gray-900">{formatWon(60000)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>투표 당첨자</span>
                <span className="font-semibold tabular-nums text-gray-900">{formatWon(20000)}</span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">당첨 여부</p>
            <div className="mt-2 space-y-2 text-sm text-gray-800">
              <p>
                창작: <span className="font-semibold text-emerald-600">당첨! 상금이 지급되었는지 확인하세요!</span>
              </p>
              <p>
                투표: <span className="font-semibold text-gray-600">아쉽지만 다음 기회에..</span>
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">해당 주 최종 순위</p>
            <ol className="mt-3 space-y-2">
              <li className="flex gap-2 text-sm text-gray-800">
                <span className="w-8 shrink-0 font-semibold text-amber-700">1</span>
                <span>출근 10분 단축 루틴</span>
              </li>
              <li className="flex gap-2 text-sm text-gray-800">
                <span className="w-8 shrink-0 font-semibold text-amber-700">2</span>
                <span>하루 1분 절약 가계부</span>
              </li>
              <li className="flex gap-2 text-sm text-gray-800">
                <span className="w-8 shrink-0 font-semibold text-amber-700">3</span>
                <span>직장인 점심 최적화 지도</span>
              </li>
            </ol>
          </div>
          <p className="text-center text-xs text-gray-400">정산일시 2026. 03. 31. 01:12:00</p>
        </section>
      </main>
    );
  }

  const weekQuery = useWeekQuery(weekId);
  const resultQuery = useWeeklyResultQuery(weekId);
  const winnerIdeaId = resultQuery.data?.winnerIdeaId ?? null;
  const ideaQuery = useIdeaQuery(winnerIdeaId);

  const week = weekQuery.data;
  const result = resultQuery.data;

  const rankingLines = parseRankingLines(result?.fullRanking ?? null);

  if (!weekId) {
    return (
      <main className="min-h-full bg-gray-50 pb-6">
        <Top subtitleTop="주차를 선택해 주세요">주간 결과</Top>
      </main>
    );
  }

  if (weekQuery.isLoading || resultQuery.isLoading) {
    return (
      <main className="min-h-full bg-gray-50 pb-6">
        <Top subtitleTop="불러오는 중">주간 결과</Top>
        <div className="flex justify-center py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        </div>
      </main>
    );
  }

  if (weekQuery.isError || resultQuery.isError) {
    return (
      <main className="min-h-full bg-gray-50 pb-6">
        <Top subtitleTop="다시 시도해 주세요">주간 결과</Top>
        <p className="px-4 text-sm text-red-600">결과를 불러오지 못했어요.</p>
      </main>
    );
  }

  if (!week || !result) {
    return (
      <main className="min-h-full bg-gray-50 pb-6">
        <Top subtitleTop="해당 주차">주간 결과</Top>
        <p className="px-4 text-sm text-gray-600">이 주차의 정산 데이터가 없어요.</p>
      </main>
    );
  }

  const winnerTitle = ideaQuery.data?.title ?? '1위 아이디어';
  const creatorWon = meId != null && result.creatorId === meId;
  const voterWon =
    meId != null && (result.voterWinner1Id === meId || result.voterWinner2Id === meId);

  return (
    <main className="relative min-h-full bg-gray-50 pb-6">
      <div className="px-1 pt-2">
        <NavLink
          to="/my"
          className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-gray-100"
          aria-label="My로 돌아가기"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="text-gray-900">
            <path
              d="M15 6L9 12L15 18"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </NavLink>
      </div>
      <Top subtitleTop={`${formatWeekLabel(week)} · 정산 완료`}>주간 결과</Top>

      <section className="space-y-3 px-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">1위 아이디어</p>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
              {ideaQuery.data?.categoryTags?.length
                ? `#${ideaQuery.data.categoryTags[0]}`
                : `#${ideaQuery.data?.category ?? '-'}`}
            </span>
          </div>
          <p className="mt-1 text-base font-semibold text-gray-900">{winnerTitle}</p>
          {ideaQuery.isLoading ? (
            <p className="mt-2 text-xs text-gray-400">제목 불러오는 중…</p>
          ) : null}
          <p className="mt-2 text-sm leading-5 text-gray-600">{ideaQuery.data?.description ?? '-'}</p>
          <div className="mt-3 rounded-lg bg-gray-50 px-2 py-2 text-xs text-gray-600">
            <p className="text-gray-500">투표수</p>
            <p className="mt-0.5 font-semibold text-gray-900">
              {ideaQuery.data ? `${ideaQuery.data.totalVoteCount}표` : '-'}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">당첨 여부</p>
          <div className="mt-2 space-y-2 text-sm text-gray-800">
            <p>
              창작:{' '}
              <span className={`font-semibold ${creatorWon ? 'text-emerald-600' : 'text-gray-600'}`}>
                {creatorWon ? '당첨! 상금이 지급되었는지 확인하세요!' : '아쉽지만 다음 기회에..'}
              </span>
            </p>
            <p>
              투표:{' '}
              <span className={`font-semibold ${voterWon ? 'text-emerald-600' : 'text-gray-600'}`}>
                {voterWon ? '당첨! 상금이 지급되었는지 확인하세요!' : '아쉽지만 다음 기회에..'}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">상금 배분</p>
          <ul className="mt-2 space-y-2 text-sm text-gray-800">
            <li className="flex justify-between gap-2">
              <span>창작자</span>
              <span className="font-semibold tabular-nums text-gray-900">
                {formatWon(result.creatorPrize)}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span>투표 당첨자</span>
              <span className="font-semibold tabular-nums text-gray-900">
                {formatWon(result.voterPrizeEach)}
              </span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-400">
            투표자 추첨 2인 · 지급은 운영 정책에 따라 처리됩니다.
          </p>
        </div>

        {rankingLines.length > 0 ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">해당 주 최종 순위</p>
            <ol className="mt-3 space-y-2">
              {rankingLines.slice(0, 10).map((line) => (
                <li
                  key={`${line.rank}-${line.title}`}
                  className="flex gap-2 text-sm text-gray-800"
                >
                  <span className="w-8 shrink-0 font-semibold text-amber-700">{line.rank}</span>
                  <span className="line-clamp-2">{line.title}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <p className="text-center text-xs text-gray-400">
          정산일시 {new Date(result.settledAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
        </p>
      </section>
    </main>
  );
}
