import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import BrandPageHeader from '@/components/common/BrandPageHeader';
import { List, ListRow, Paragraph, useToast } from '@toss/tds-mobile';
import { useActiveWeekQuery, useLatestSettledWeekQuery, useMyIdeasForWeekQuery } from '@/hooks/queries';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { queryKeys } from '@/lib/queryKeys';
import { useTickets } from '@/hooks/useTickets';
import { isBoostActive } from '@/lib/boostActive';
import { formatWeekLabel } from '@/lib/weekLabel';
import { insertAdLog, rewardShareViralTicket, rewardTicketRecharge } from '@/services/adLogService';
import { activateIdeaBoost } from '@/services/ideaService';
import { useAuthStore } from '@/store/authStore';
import { openContactsViral } from '@/utils/tossBridge';

const PREVIEW_MY_TABS = import.meta.env.VITE_MY_TABS_PREVIEW === 'true';

export default function MyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openToast } = useToast();
  const { data: latestSettled, isLoading: isSettledLoading } = useLatestSettledWeekQuery();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const userId = user?.id ?? null;
  const tickets = useTickets();
  const { data: activeWeek } = useActiveWeekQuery();
  const weekId = activeWeek?.id ?? null;
  const myIdeasQuery = useMyIdeasForWeekQuery(userId, weekId);

  const activeBoostCount = useMemo(
    () => (myIdeasQuery.data ?? []).filter((idea) => isBoostActive(idea)).length,
    [myIdeasQuery.data],
  );

  const ticketDisplay = userId != null ? tickets.totalTickets : 0;
  const boostDisplay = userId != null ? activeBoostCount : 0;
  const [adBusy, setAdBusy] = useState<null | 'adTicket' | 'adBoost' | 'shareViral'>(null);

  const shareViralModuleId = (import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID as string | undefined)?.trim() ?? '';

  const ticketAdGroupId = (import.meta.env.VITE_AD_GROUP_ID as string | undefined) ?? 'vote_no_ticket_modal';
  const boostAdGroupId =
    (import.meta.env.VITE_AD_GROUP_BOOST as string | undefined) ??
    (import.meta.env.VITE_AD_GROUP_ID as string | undefined) ??
    'boost_dev';
  const ticketAd = useRewardedAd(ticketAdGroupId);
  const boostAd = useRewardedAd(boostAdGroupId);

  type TMyRow =
    | { key: string; title: string; kind: 'result' }
    | { key: string; title: string; kind: 'shareViral' }
    | { key: string; title: string; to: string };

  const rows: TMyRow[] = [
    { key: 'settled', title: '지난 주 정산 결과', kind: 'result' },
    { key: 'voted', title: '내가 투표한 아이디어', to: '/my/votes' },
    { key: 'created', title: '내가 만든 아이디어', to: '/my/ideas' },
    { key: 'adTicket', title: '광고 보고 티켓 얻기', to: '/my/reward-tickets' },
    { key: 'adBoost', title: '광고 보고 부스트 얻기', to: '/my/ideas' },
    { key: 'shareViral', title: '친구에게 공유하고 투표권 받기', kind: 'shareViral' },
    { key: 'guide', title: '아이디어리그 사용설명서', to: '/my/guide' },
    { key: 'notif', title: '알림', to: '/my/notifications' },
  ];

  const handleRewardTicketAd = async () => {
    if (!userId) return;
    if (!ticketAd.isSupported) {
      openToast('이 기기에서는 리워드 광고를 지원하지 않아요.', { higherThanCTA: true, duration: 2400 });
      return;
    }
    if (!ticketAd.isLoaded) {
      openToast('광고를 준비 중이에요. 잠시 후 다시 시도해 주세요.', { higherThanCTA: true, duration: 2200 });
      return;
    }
    setAdBusy('adTicket');
    try {
      const watched = await ticketAd.showRewarded();
      if (!watched) {
        openToast('광고 시청이 완료되지 않았어요.', { higherThanCTA: true, duration: 2200 });
        return;
      }
      const reward = await rewardTicketRecharge(userId, { adGroupId: ticketAdGroupId });
      if (!reward.success) {
        openToast(reward.error ?? '티켓 지급에 실패했어요.', { higherThanCTA: true, duration: 2400 });
        return;
      }
      updateUser({ adTickets: reward.adTickets ?? (user?.adTickets ?? 0) + (reward.rewardAmount ?? 1) });
      openToast('투표권이 지급됐어요.', { higherThanCTA: true, duration: 2200 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '광고 보상 처리에 실패했어요.';
      openToast(msg, { higherThanCTA: true, duration: 2600 });
    } finally {
      setAdBusy(null);
    }
  };

  const handleRewardBoostAd = async () => {
    if (!userId || !weekId) return;
    if (!boostAd.isSupported) {
      openToast('이 기기에서는 리워드 광고를 지원하지 않아요.', { higherThanCTA: true, duration: 2400 });
      return;
    }
    if (!boostAd.isLoaded) {
      openToast('광고를 준비 중이에요. 잠시 후 다시 시도해 주세요.', { higherThanCTA: true, duration: 2200 });
      return;
    }

    const targetIdea = (myIdeasQuery.data ?? []).find((idea) => !isBoostActive(idea));
    if (!targetIdea) {
      openToast('부스트 가능한 내 아이디어가 없어요.', { higherThanCTA: true, duration: 2400 });
      return;
    }

    setAdBusy('adBoost');
    try {
      const watched = await boostAd.showRewarded();
      if (!watched) {
        openToast('광고 시청이 완료되지 않았어요.', { higherThanCTA: true, duration: 2200 });
        return;
      }
      await activateIdeaBoost(targetIdea.id);
      await insertAdLog({
        userId,
        adType: 'boost',
        adGroupId: boostAdGroupId,
        rewardAmount: 0,
      });
      await Promise.all([
        myIdeasQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: queryKeys.ideas.weekAll(weekId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all }),
      ]);
      openToast('부스트가 적용됐어요.', { higherThanCTA: true, duration: 2200 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '부스트 처리에 실패했어요.';
      openToast(msg, { higherThanCTA: true, duration: 2600 });
    } finally {
      setAdBusy(null);
    }
  };

  const handleShareViral = () => {
    if (!userId) {
      openToast('로그인 후 이용할 수 있어요.', { higherThanCTA: true, duration: 2200 });
      return;
    }
    if (!shareViralModuleId) {
      openToast('앱인토스 콘솔에서 공유 리워드 moduleId 설정 후 이용할 수 있어요.', {
        higherThanCTA: true,
        duration: 3200,
      });
      return;
    }

    setAdBusy('shareViral');
    let cleanup: (() => void) | undefined;

    cleanup = openContactsViral(
      shareViralModuleId,
      (event) => {
        if (event.type === 'sendViral') {
          void (async () => {
            try {
              const reward = await rewardShareViralTicket(userId);
              if (!reward.success) {
                if (reward.error === 'ALREADY_GRANTED_TODAY') {
                  openToast('오늘은 이미 받았어요. 내일 다시 해 보세요.', {
                    higherThanCTA: true,
                    duration: 2600,
                  });
                } else {
                  openToast(reward.error ?? '투표권 지급에 실패했어요.', {
                    higherThanCTA: true,
                    duration: 2400,
                  });
                }
                return;
              }
              updateUser({
                adTickets: reward.adTickets ?? (user?.adTickets ?? 0) + (reward.rewardAmount ?? 1),
              });
              openToast('투표권 1장이 지급됐어요.', { higherThanCTA: true, duration: 2200 });
            } catch (err) {
              const msg = err instanceof Error ? err.message : '투표권 지급 처리에 실패했어요.';
              openToast(msg, { higherThanCTA: true, duration: 2600 });
            } finally {
              cleanup?.();
              setAdBusy(null);
            }
          })();
          return;
        }
        if (event.type === 'close') {
          cleanup?.();
          setAdBusy(null);
        }
      },
      (err) => {
        const msg = err instanceof Error ? err.message : '공유 화면을 열 수 없어요.';
        openToast(msg, { higherThanCTA: true, duration: 2600 });
        cleanup?.();
        setAdBusy(null);
      },
    );
  };

  return (
    <main className="flex min-h-[calc(100svh-64px)] flex-col bg-gray-50">
      <BrandPageHeader title="My" />

      <section className="space-y-4 px-4 pb-6">
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-10 shadow-sm">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div className="flex flex-col items-center">
              <Paragraph typography="t6" fontWeight="medium" color="#6B7684">
                투표권
              </Paragraph>
              <p className="mt-4 text-5xl font-bold tabular-nums leading-none text-[#191F28]">
                {ticketDisplay}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Paragraph typography="t6" fontWeight="medium" color="#6B7684">
                부스트
              </Paragraph>
              <p className="mt-4 text-5xl font-bold tabular-nums leading-none text-[#191F28]">
                {boostDisplay}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
              설정 및 활동
            </Paragraph>
          </div>

          <List paddingBottom={0}>
            {rows.map((row) => (
              <ListRow
                key={row.key}
                withArrow
                arrowType="right"
                border="none"
                horizontalPadding="medium"
                left={<span className="text-sm font-semibold text-gray-900">{row.title}</span>}
                right={
                  row.kind === 'result' && PREVIEW_MY_TABS ? (
                    <span className="text-xs text-gray-500">25.03.24 - 25.03.30</span>
                  ) : row.kind === 'result' && latestSettled ? (
                    <span className="text-xs text-gray-500">{formatWeekLabel(latestSettled)}</span>
                  ) : row.key === 'adTicket' && adBusy === 'adTicket' ? (
                    <span className="text-xs text-gray-500">광고 재생 중</span>
                  ) : row.key === 'adBoost' && adBusy === 'adBoost' ? (
                    <span className="text-xs text-gray-500">광고 재생 중</span>
                  ) : row.key === 'shareViral' && adBusy === 'shareViral' ? (
                    <span className="text-xs text-gray-500">공유 중</span>
                  ) : undefined
                }
                withTouchEffect
                onClick={() => {
                  if (adBusy) return;
                  if (row.key === 'adTicket') {
                    if (!userId) {
                      openToast('로그인 후 이용할 수 있어요.', { higherThanCTA: true, duration: 2200 });
                      return;
                    }
                    void handleRewardTicketAd();
                    return;
                  }
                  if (row.key === 'adBoost') {
                    if (!userId) {
                      openToast('로그인 후 이용할 수 있어요.', { higherThanCTA: true, duration: 2200 });
                      return;
                    }
                    void handleRewardBoostAd();
                    return;
                  }
                  if (row.key === 'shareViral') {
                    void handleShareViral();
                    return;
                  }
                  if (row.kind === 'result') {
                    if (PREVIEW_MY_TABS) {
                      navigate('/result/preview');
                      return;
                    }
                    if (isSettledLoading) return;
                    if (!latestSettled) {
                      openToast('아직 공개된 정산 주차가 없어요.', {
                        higherThanCTA: true,
                        duration: 2400,
                      });
                      return;
                    }
                    navigate(`/result/${latestSettled.id}`);
                    return;
                  }
                  navigate(row.to);
                }}
              />
            ))}
          </List>
        </div>
      </section>
    </main>
  );
}
