import BrandPageHeader from '@/components/common/BrandPageHeader';
import FeverBanner from '@/components/fever/FeverBanner';
import SwipeFeed from '@/components/feed/SwipeFeed';
import { useActiveWeekQuery } from '@/hooks/queries';
import { useFeverUi } from '@/hooks/useFeverMode';

export default function FeedPage() {
  const { data: activeWeek } = useActiveWeekQuery();
  const { feverMode, countdownMs } = useFeverUi(activeWeek?.status);

  return (
    <main className="min-h-full bg-gray-50">
      <BrandPageHeader title="이번주 아이디어리그" />

      {feverMode ? <FeverBanner countdownMs={countdownMs} /> : null}

      <SwipeFeed />
    </main>
  );
}
