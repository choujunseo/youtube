import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import FeedPage from '@/pages/FeedPage';
import IdeaDetailPage from '@/pages/IdeaDetailPage';
import UploadPage from '@/pages/UploadPage';
import GuidePage from '@/pages/GuidePage';
import MyPage from '@/pages/MyPage';
import MyIdeasPage from '@/pages/MyIdeasPage';
import MyVotedIdeasPage from '@/pages/MyVotedIdeasPage';
import MyRewardTicketsPage from '@/pages/MyRewardTicketsPage';
import MyNotificationsPage from '@/pages/MyNotificationsPage';
import HallOfFamePage from '@/pages/HallOfFamePage';
import OpenEventWelcomePage from '@/pages/OpenEventWelcomePage';
import BottomNav from '@/components/common/BottomNav';

function AppRoutes() {
  const location = useLocation();
  /** 웰컴·상세: 하단 탭 숨김 */
  const hideBottomNav =
    location.pathname === '/' || location.pathname.startsWith('/idea/');
  const hallOfFameBg = location.pathname === '/hall-of-fame';

  useAuth();

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <div
        className={[
          hideBottomNav ? 'flex-1' : 'flex-1 pb-16',
          hallOfFameBg ? 'bg-gradient-to-r from-amber-50 to-yellow-50' : '',
        ]
          .filter(Boolean)
          .join(' ')}
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
          <Route path="/hall-of-fame" element={<HallOfFamePage />} />
          <Route path="/ranking" element={<Navigate to="/hall-of-fame" replace />} />
        </Routes>
      </div>
      {hideBottomNav ? null : <BottomNav />}
    </div>
  );
}

export default function App() {
  return <AppRoutes />;
}
