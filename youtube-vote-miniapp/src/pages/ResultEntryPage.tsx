import { Paragraph, Skeleton } from '@toss/tds-mobile';
import { Navigate } from 'react-router-dom';
import { useLatestSettledWeekQuery } from '@/hooks/queries';

const PREVIEW_MY_TABS = import.meta.env.VITE_MY_TABS_PREVIEW === 'true';

/** `/result` → 최신 `settled` 주차의 `/result/:weekId` */
export default function ResultEntryPage() {
  if (PREVIEW_MY_TABS) {
    return <Navigate replace to="/result/preview" />;
  }

  const { data: week, isLoading, isError } = useLatestSettledWeekQuery();

  if (isLoading) {
    return (
      <main className="min-h-[50svh] bg-gray-50 px-4 pb-8 pt-6">
        <div className="mx-auto max-w-md pt-4">
          <Skeleton className="w-full" pattern="topList" repeatLastItemCount={2} />
        </div>
      </main>
    );
  }

  if (isError || !week) {
    return (
      <main className="min-h-full bg-gray-50 px-4 pb-8 pt-6">
        <Paragraph typography="t6" fontWeight="regular" textAlign="center" color="#6B7684">
          아직 공개된 주간 정산 결과가 없어요.
        </Paragraph>
      </main>
    );
  }

  return <Navigate replace to={`/result/${week.id}`} />;
}
