import { Paragraph } from '@toss/tds-mobile';
import MySubpageLayout from '@/components/my/MySubpageLayout';

const PREVIEW_MY_TABS = import.meta.env.VITE_MY_TABS_PREVIEW === 'true';

export default function MyNotificationsPage() {
  if (PREVIEW_MY_TABS) {
    return (
      <MySubpageLayout title="알림" subtitle="앱 소식 (미리보기)">
        <section className="space-y-3 px-4 pt-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
              지난 주 정산 결과가 공개됐어요
            </Paragraph>
            <div className="mt-1">
              <Paragraph typography="t7" fontWeight="regular" color="#6B7684">
                My {'>'} 지난 주 정산 결과에서 당첨 여부와 상금을 확인해 보세요.
              </Paragraph>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
              피버 타임이 시작됐어요
            </Paragraph>
            <div className="mt-1">
              <Paragraph typography="t7" fontWeight="regular" color="#6B7684">
                일요일 23:30~24:00에는 실시간 랭킹이 열려요.
              </Paragraph>
            </div>
          </div>
        </section>
      </MySubpageLayout>
    );
  }

  return (
    <MySubpageLayout title="알림" subtitle="앱 소식">
      <section className="px-4 pt-2">
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            새 알림이 없어요
          </Paragraph>
          <div className="mt-2">
            <Paragraph typography="t7" fontWeight="regular" color="#6B7684">
              정산·이벤트 등 안내가 생기면 이곳에 표시할 예정이에요.
            </Paragraph>
          </div>
        </div>
      </section>
    </MySubpageLayout>
  );
}
