import { Skeleton } from '@toss/tds-mobile';
import QueryErrorPanel from '@/components/common/QueryErrorPanel';
import IdeaTagChips from '@/components/feed/IdeaTagChips';
import MySubpageLayout from '@/components/my/MySubpageLayout';
import { useMyVotedIdeasAllQuery } from '@/hooks/queries';
import { useAuthStore } from '@/store/authStore';

const PREVIEW_MY_TABS = import.meta.env.VITE_MY_TABS_PREVIEW === 'true';

export default function MyVotedIdeasPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const votedQuery = useMyVotedIdeasAllQuery();

  if (PREVIEW_MY_TABS) {
    return (
      <MySubpageLayout title="내가 투표한 아이디어" subtitle="">
        <section className="space-y-3 px-4 pt-2">
          <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">출근 10분 단축 루틴</h3>
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">작은 습관으로 아침 시간을 줄이는 아이디어예요.</p>
          </article>
          <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">하루 1분 절약 가계부</h3>
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">입력 단계를 줄여서 매일 빠르게 기록하는 방식이에요.</p>
          </article>
        </section>
      </MySubpageLayout>
    );
  }

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
            </article>
          );
        })}
      </section>
    </MySubpageLayout>
  );
}
