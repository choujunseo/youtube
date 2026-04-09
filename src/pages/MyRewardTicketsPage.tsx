import { Paragraph, useToast } from '@toss/tds-mobile';
import AdRewardButton from '@/components/ad/AdRewardButton';
import MySubpageLayout from '@/components/my/MySubpageLayout';
import { useTickets } from '@/hooks/useTickets';
import { useAuthStore } from '@/store/authStore';

export default function MyRewardTicketsPage() {
  const { openToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const tickets = useTickets();

  return (
    <MySubpageLayout title="광고 보고 티켓 얻기" subtitle="리워드 광고 시청 후 지급">
      <section className="space-y-4 px-4 pt-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            보유 티켓
          </Paragraph>
          <div className="mt-2">
            <Paragraph typography="t7" fontWeight="semibold" color="#191F28">
              {`${tickets.totalTickets}장`}
            </Paragraph>
          </div>
          <div className="mt-3">
            <Paragraph typography="t7" fontWeight="regular" color="#6B7684">
              가입 시 기본 투표권이 지급돼요. My → 출석 체크로 매일 더 받을 수 있고, 부족하면 광고 시청으로도 받을 수
              있어요.
            </Paragraph>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            티켓 받기
          </Paragraph>
          <div className="mt-4">
            {userId ? (
              <AdRewardButton
                userId={userId}
                label="광고 보고 티켓 받기"
                onRewardSuccess={() =>
                  openToast('티켓이 지급됐어요.', { higherThanCTA: true, duration: 2200 })
                }
                onRewardError={(msg) => openToast(msg, { higherThanCTA: true, duration: 2600 })}
                onAdNotCompleted={() =>
                  openToast('광고 시청을 완료해야 해요.', { higherThanCTA: true, duration: 2200 })
                }
              />
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
