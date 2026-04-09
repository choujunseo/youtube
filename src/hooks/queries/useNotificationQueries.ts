import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_STALE } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/authStore';
import { fetchMyNotifications, markNotificationRead } from '@/services/notificationService';

export function useMyNotificationsQuery() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return useQuery({
    queryKey: queryKeys.notifications.my(),
    queryFn: () => fetchMyNotifications(),
    enabled: Boolean(isLoggedIn),
    staleTime: QUERY_STALE.notifications,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.my() });
    },
  });
}
