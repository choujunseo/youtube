import { Paragraph, Skeleton } from '@toss/tds-mobile';
import QueryErrorPanel from '@/components/common/QueryErrorPanel';
import MySubpageLayout from '@/components/my/MySubpageLayout';
import { useMarkNotificationReadMutation, useMyNotificationsQuery } from '@/hooks/queries';
import { useAuthStore } from '@/store/authStore';
import type { IUserNotification } from '@/types/notification';

const PREVIEW_MY_TABS = import.meta.env.VITE_MY_TABS_PREVIEW === 'true';

function formatNotificationTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}


interface INotificationCardProps {
  item: IUserNotification;
  onRead: (id: string) => void;
}

function NotificationCard(props: INotificationCardProps) {
  const { item, onRead } = props;
  const unread = !item.readAt;

  const markIfUnread = () => {
    if (unread) onRead(item.id);
  };

  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm active:bg-gray-50"
      onClick={markIfUnread}
    >
      <div className="flex items-start gap-2">
        {unread ? (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            {item.title}
          </Paragraph>
          <div className="mt-1">
            <Paragraph typography="t7" fontWeight="regular" color="#6B7684">
              {item.body}
            </Paragraph>
          </div>
          <p className="mt-2 text-xs text-gray-400">{formatNotificationTime(item.createdAt)}</p>
        </div>
      </div>
    </button>
  );
}

export default function MyNotificationsPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const notificationsQuery = useMyNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();

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

  if (!isLoggedIn) {
    return (
      <MySubpageLayout title="알림" subtitle="앱 소식">
        <p className="px-4 pt-2 text-sm text-gray-600">로그인 후 확인할 수 있어요.</p>
      </MySubpageLayout>
    );
  }

  if (notificationsQuery.isLoading) {
    return (
      <MySubpageLayout title="알림" subtitle="앱 소식">
        <section className="px-4 pt-2">
          <Skeleton className="w-full max-w-md" pattern="cardOnly" repeatLastItemCount={4} />
        </section>
      </MySubpageLayout>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <MySubpageLayout title="알림" subtitle="앱 소식">
        <div className="px-4 pt-2">
          <QueryErrorPanel
            message={
              notificationsQuery.error instanceof Error
                ? notificationsQuery.error.message
                : '다시 시도해 주세요.'
            }
            onRetry={() => void notificationsQuery.refetch()}
          />
        </div>
      </MySubpageLayout>
    );
  }

  const rows = notificationsQuery.data ?? [];

  return (
    <MySubpageLayout title="알림" subtitle="앱 소식">
      <section className="space-y-3 px-4 pt-2">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
            <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
              새 알림이 없어요
            </Paragraph>
            <div className="mt-2">
              <Paragraph typography="t7" fontWeight="regular" color="#6B7684">
                토스로 보내드린 안내가 있으면 이곳에도 함께 보여 드려요.
              </Paragraph>
            </div>
          </div>
        ) : (
          rows.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onRead={(id) => {
                void markRead.mutateAsync(id).catch(() => {});
              }}
            />
          ))
        )}
      </section>
    </MySubpageLayout>
  );
}
