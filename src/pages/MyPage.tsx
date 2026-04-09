import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import BrandPageHeader from '@/components/common/BrandPageHeader';
import { List, ListRow, Paragraph, useToast } from '@toss/tds-mobile';
import { useBoostCharges } from '@/hooks/useBoostCharges';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { boostAdGroupId, voteTicketAdGroupId } from '@/lib/adGroupIds';
import { queryKeys } from '@/lib/queryKeys';
import { useTickets } from '@/hooks/useTickets';
import { insertAdLog, rewardBoostRecharge, rewardTicketRecharge } from '@/services/adLogService';
import { useAuthStore } from '@/store/authStore';

export default function MyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const userId = user?.id ?? null;
  const tickets = useTickets();
  const boostCharges = useBoostCharges();

  const ticketDisplay = userId != null ? tickets.totalTickets : 0;
  const boostDisplay = userId != null ? boostCharges : 0;
  const [adBusy, setAdBusy] = useState<null | 'adTicket' | 'adBoost'>(null);

  const ticketAdGroupId = voteTicketAdGroupId();
  const boostGroupId = boostAdGroupId();
  const ticketAd = useRewardedAd(ticketAdGroupId);
  const boostAd = useRewardedAd(boostGroupId);

  type TMyRow = { key: string; title: string; to: string };

  const rows: TMyRow[] = [
    { key: 'voted', title: '내가 투표한 아이디어', to: '/my/votes' },
    { key: 'created', title: '내가 만든 아이디어', to: '/my/ideas' },
    { key: 'attendance', title: '출석 체크', to: '/my/attendance' },
    { key: 'adTicket', title: '광고 보고 투표권 얻기', to: '/my/reward-tickets' },
    { key: 'adBoost', title: '광고 보고 부스트 얻기', to: '/my/ideas' },
    { key: 'find', title: '아이디어 찾기', to: '/my/find' },
    { key: 'guide', title: '아이디어리그 사용설명서', to: '/my/guide' },
    { key: 'notif', title: '알림', to: '/my/notifications' },
    { key: 'withdraw', title: '탈퇴하기', to: '/my/withdraw' },
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
    if (!userId) return;
    if (!boostAd.isSupported) {
      openToast('이 기기에서는 리워드 광고를 지원하지 않아요.', { higherThanCTA: true, duration: 2400 });
      return;
    }
    if (!boostAd.isLoaded) {
      openToast('광고를 준비 중이에요. 잠시 후 다시 시도해 주세요.', { higherThanCTA: true, duration: 2200 });
      return;
    }

    setAdBusy('adBoost');
    try {
      const watched = await boostAd.showRewarded();
      if (!watched) {
        openToast('광고 시청이 완료되지 않았어요.', { higherThanCTA: true, duration: 2200 });
        return;
      }
      const reward = await rewardBoostRecharge(userId, { adGroupId: boostGroupId });
      if (!reward.success) {
        openToast(reward.error ?? '부스트 충전에 실패했어요.', { higherThanCTA: true, duration: 2400 });
        return;
      }
      updateUser({
        boostCharges: reward.boostCharges ?? (user?.boostCharges ?? 0) + (reward.rewardAmount ?? 1),
      });
      await insertAdLog({
        userId,
        adType: 'boost_charge_recharge',
        adGroupId: boostGroupId,
        rewardAmount: reward.rewardAmount ?? 1,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
      openToast('부스트 충전 1회가 추가됐어요.', { higherThanCTA: true, duration: 2200 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '부스트 처리에 실패했어요.';
      openToast(msg, { higherThanCTA: true, duration: 2600 });
    } finally {
      setAdBusy(null);
    }
  };

  return (
    <main className="flex min-h-[calc(100svh-64px)] flex-col bg-gray-50">
      <BrandPageHeader title="My" />

      <section className="space-y-4 px-4 pb-6">
        <p className="py-6 text-center text-[#191F28]">
          {userId != null ? (
            <>
              <span className="text-[2.55rem] font-bold leading-none tracking-tight">
                {(user?.displayName ?? '').trim() || '회원'}
              </span>
              <span className="ml-1 text-[1.4875rem] font-medium leading-none text-gray-500">님</span>
            </>
          ) : (
            <>
              <span className="text-[2.55rem] font-bold leading-none tracking-tight">게스트</span>
              <span className="ml-1 text-[1.4875rem] font-medium leading-none text-gray-500">님</span>
            </>
          )}
        </p>
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

          <List>
            {rows.map((row) => (
              <ListRow
                key={row.key}
                withArrow
                arrowType="right"
                border="none"
                horizontalPadding="medium"
                left={
                  <span
                    className={
                      row.key === 'withdraw'
                        ? 'text-sm font-semibold text-red-600'
                        : 'text-sm font-semibold text-gray-900'
                    }
                  >
                    {row.title}
                  </span>
                }
                right={
                  row.key === 'adTicket' && adBusy === 'adTicket' ? (
                    <span className="text-xs text-gray-500">광고 재생 중</span>
                  ) : row.key === 'adBoost' && adBusy === 'adBoost' ? (
                    <span className="text-xs text-gray-500">광고 재생 중</span>
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
                  if ('to' in row) {
                    navigate(row.to);
                  }
                }}
              />
            ))}
          </List>
        </div>
      </section>
    </main>
  );
}
