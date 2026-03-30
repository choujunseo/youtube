import { Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWeeklyMaintenanceKst } from '@/hooks/useWeeklyMaintenanceKst';
import MaintenancePage from '@/pages/MaintenancePage';
import FeedPage from '@/pages/FeedPage';
import IdeaDetailPage from '@/pages/IdeaDetailPage';
import UploadPage from '@/pages/UploadPage';
import GuidePage from '@/pages/GuidePage';
import MyPage from '@/pages/MyPage';
import MyIdeasPage from '@/pages/MyIdeasPage';
import MyVotedIdeasPage from '@/pages/MyVotedIdeasPage';
import MyRewardTicketsPage from '@/pages/MyRewardTicketsPage';
import MyNotificationsPage from '@/pages/MyNotificationsPage';
import RankingPage from '@/pages/RankingPage';
import ResultEntryPage from '@/pages/ResultEntryPage';
import ResultPage from '@/pages/ResultPage';
import OpenEventWelcomePage from '@/pages/OpenEventWelcomePage';
import BottomNav from '@/components/common/BottomNav';

function AppRoutes() {
  const location = useLocation();
  /** 웰컴·상세: 하단 탭 숨김 */
  const hideBottomNav =
    location.pathname === '/' || location.pathname.startsWith('/idea/');

  useAuth();
  const maintenance = useWeeklyMaintenanceKst();

  if (maintenance) {
    return <MaintenancePage />;
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <div
        className={hideBottomNav ? 'flex-1' : 'flex-1 pb-16'}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 28px)' }}
      >
        <Routes>
          <Route path="/" element={<OpenEventWelcomePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/idea/:id" element={<IdeaDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/my" element={<MyPage />} />
          <Route path="/my/guide" element={<GuidePage />} />
          <Route path="/my/ideas" element={<MyIdeasPage />} />
          <Route path="/my/votes" element={<MyVotedIdeasPage />} />
          <Route path="/my/reward-tickets" element={<MyRewardTicketsPage />} />
          <Route path="/my/notifications" element={<MyNotificationsPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/result" element={<ResultEntryPage />} />
          <Route path="/result/:weekId" element={<ResultPage />} />
        </Routes>
      </div>
      {hideBottomNav ? null : <BottomNav />}
    </div>
  );
}

export default function App() {
  return <AppRoutes />;
}
