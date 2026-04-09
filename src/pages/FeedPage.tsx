import BrandPageHeader from '@/components/common/BrandPageHeader';
import SwipeFeed from '@/components/feed/SwipeFeed';
import FeedTopAdBanner from '@/components/ad/FeedTopAdBanner';

export default function FeedPage() {
  return (
    <main className="min-h-full bg-gray-50">
      <BrandPageHeader title="이번주 아이디어리그" />
      <FeedTopAdBanner />
      <SwipeFeed />
    </main>
  );
}
