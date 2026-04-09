import { Outlet, useLocation } from 'react-router-dom';
import FeedPage from '@/pages/FeedPage';

/** `/feed` 라우트가 매칭될 때 Outlet에 그릴 내용 없음 — 피드는 레이아웃이 직접 렌더 */
export function FeedTabOutlet() {
  return null;
}

/**
 * 피드·My·업로드·명예의 전당·/my/* 는 같은 세션에서 피드 트리를 언마운트하지 않음.
 * My 갔다가 피드로 돌아와도 스크롤·목록·React Query 구독이 유지됨.
 * 웰컴(/)·아이디어 상세(/idea/:id)는 이 레이아웃 밖이라 피드는 그때 내려감.
 */
export default function PersistBottomTabsLayout() {
  const path = useLocation().pathname;
  const isFeed = path === '/feed';

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div
        className={isFeed ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
        aria-hidden={!isFeed}
      >
        <FeedPage />
      </div>
      <div className={isFeed ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
        <Outlet />
      </div>
    </div>
  );
}
