import { useState } from 'react';
import { Button, Paragraph, useToast } from '@toss/tds-mobile';
import MySubpageLayout from '@/components/my/MySubpageLayout';
import { useTickets } from '@/hooks/useTickets';
import { INITIAL_FREE_VOTE_TICKETS } from '@/lib/voteTicketPolicy';
import { claimAttendanceTicket } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';

export default function MyAttendancePage() {
  const { openToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const userId = user?.id ?? null;
  const tickets = useTickets();
  const [busy, setBusy] = useState(false);

  const handleAttendance = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const res = await claimAttendanceTicket(userId);
      if (!res.success) {
        openToast(
          res.error === 'FORBIDDEN'
            ? '다시 로그인한 뒤 시도해 주세요.'
            : res.error === 'USER_NOT_FOUND'
              ? '회원 정보를 찾을 수 없어요.'
              : '출석 처리에 실패했어요.',
          { higherThanCTA: true, duration: 2600 },
        );
        return;
      }
      updateUser({ freeTickets: res.freeTickets, adTickets: res.adTickets });
      if (res.granted) {
        openToast('출석 완료! 투표권 1장을 드렸어요.', { higherThanCTA: true, duration: 2400 });
      } else {
        openToast('오늘은 이미 출석했어요. 내일 다시 받을 수 있어요.', {
          higherThanCTA: true,
          duration: 2600,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '출석 처리에 실패했어요.';
      openToast(msg, { higherThanCTA: true, duration: 2800 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <MySubpageLayout title="출석 체크" subtitle="매일 투표권">
      <section className="space-y-4 px-4 pt-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            보유 투표권
          </Paragraph>
          <Paragraph typography="t5" fontWeight="bold" color="#191F28" className="!mt-2">
            {userId ? `${tickets.totalTickets}장` : '—'}
          </Paragraph>
          <Paragraph typography="t7" fontWeight="regular" color="#6B7684" className="!mt-3 !leading-5">
            처음 가입하면 기본 투표권 {INITIAL_FREE_VOTE_TICKETS}장이에요. 여기서 매일 출석하면 투표권을 1장씩 더 드려요.
          </Paragraph>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            오늘의 출석
          </Paragraph>
          <div className="mt-4">
            {userId ? (
              <Button size="large" display="full" loading={busy} onClick={() => void handleAttendance()}>
                출석하고 투표권 받기
              </Button>
            ) : (
              <Paragraph typography="t7" color="#6B7684">
                로그인 후 이용할 수 있어요.
              </Paragraph>
            )}
          </div>
        </div>
      </section>
    </MySubpageLayout>
  );
}
