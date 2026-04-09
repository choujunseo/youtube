import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { initBannerAds, isBannerAdSupported } from '@/utils/tossBridge';
import IdeaDetailPage from '@/pages/IdeaDetailPage';
import UploadPage from '@/pages/UploadPage';
import GuidePage from '@/pages/GuidePage';
import MyPage from '@/pages/MyPage';
import MyIdeasPage from '@/pages/MyIdeasPage';
import MyVotedIdeasPage from '@/pages/MyVotedIdeasPage';
import MyRewardTicketsPage from '@/pages/MyRewardTicketsPage';
import MyAttendancePage from '@/pages/MyAttendancePage';
import MyNotificationsPage from '@/pages/MyNotificationsPage';
import MyWithdrawPage from '@/pages/MyWithdrawPage';
import MyFindIdeaPage from '@/pages/MyFindIdeaPage';
import HallOfFamePage from '@/pages/HallOfFamePage';
import OpenEventWelcomePage from '@/pages/OpenEventWelcomePage';
import BottomNav from '@/components/common/BottomNav';
import NicknameSetupGate from '@/components/auth/NicknameSetupGate';
import PersistBottomTabsLayout, {
  FeedTabOutlet,
} from '@/components/layout/PersistBottomTabsLayout';

function AppRoutes() {
  const location = useLocation();
  /** 웰컴·상세: 하단 탭 숨김 */
  const hideBottomNav =
    location.pathname === '/' || location.pathname.startsWith('/idea/');
  const hallOfFameBg = location.pathname === '/hall-of-fame';

  useAuth();

  // TossAds.initialize는 앱 전체에서 단 1회만 호출해야 함 (공식 가이드).
  // 싱글턴 내부에서 중복 호출은 자동 차단되지만, 루트에서 선취화하면
  // FeedTopAdBanner 진입 시 onInitialized가 즉시 호출되어 광고 노출이 빨라진다.
  useEffect(() => {
    if (isBannerAdSupported()) {
      initBannerAds();
    }
  }, []);

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
        <NicknameSetupGate />
        <Routes>
          <Route path="/" element={<OpenEventWelcomePage />} />
          <Route path="/idea/:id" element={<IdeaDetailPage />} />
          <Route element={<PersistBottomTabsLayout />}>
            <Route path="feed" element={<FeedTabOutlet />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="hall-of-fame" element={<HallOfFamePage />} />
            <Route path="my/guide" element={<GuidePage />} />
            <Route path="my/ideas" element={<MyIdeasPage />} />
            <Route path="my/votes" element={<MyVotedIdeasPage />} />
            <Route path="my/attendance" element={<MyAttendancePage />} />
            <Route path="my/reward-tickets" element={<MyRewardTicketsPage />} />
            <Route path="my/notifications" element={<MyNotificationsPage />} />
            <Route path="my/withdraw" element={<MyWithdrawPage />} />
            <Route path="my/find" element={<MyFindIdeaPage />} />
            <Route path="my" element={<MyPage />} />
          </Route>
          {/* Deep-link aliases for review portal registrations */}
          <Route path="/home" element={<Navigate to="/feed" replace />} />
          <Route path="/halloffame" element={<Navigate to="/hall-of-fame" replace />} />
          <Route path="/hall_of_fame" element={<Navigate to="/hall-of-fame" replace />} />
          <Route path="/hallOfFame" element={<Navigate to="/hall-of-fame" replace />} />
          <Route path="/mypage" element={<Navigate to="/my" replace />} />
          <Route path="/my/guidebook" element={<Navigate to="/my/guide" replace />} />
          <Route path="/my/my-ideas" element={<Navigate to="/my/ideas" replace />} />
          <Route path="/my/myideas" element={<Navigate to="/my/ideas" replace />} />
          <Route path="/my/voted-ideas" element={<Navigate to="/my/votes" replace />} />
          <Route path="/my/votedideas" element={<Navigate to="/my/votes" replace />} />
          <Route path="/my/rewardtickets" element={<Navigate to="/my/reward-tickets" replace />} />
          <Route path="/my/reward_tickets" element={<Navigate to="/my/reward-tickets" replace />} />
          <Route path="/my/noti" element={<Navigate to="/my/notifications" replace />} />
          <Route path="/my/notification" element={<Navigate to="/my/notifications" replace />} />
          <Route path="/my/search" element={<Navigate to="/my/find" replace />} />
          <Route path="/my/find-idea" element={<Navigate to="/my/find" replace />} />
          <Route path="/my/findidea" element={<Navigate to="/my/find" replace />} />
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
