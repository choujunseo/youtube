import { useQuery } from '@tanstack/react-query';
import { isFeverCountdownWindowKst } from '@/lib/feverWindowKst';
import { QUERY_STALE } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { fetchActiveWeek, fetchLatestSettledWeek, fetchWeekById } from '@/services/weekService';

export function useActiveWeekQuery() {
  return useQuery({
    queryKey: queryKeys.weeks.active(),
    queryFn: fetchActiveWeek,
    staleTime: QUERY_STALE.activeWeek,
    refetchInterval: (q) => {
      const row = q.state.data;
      if (isFeverCountdownWindowKst()) return 10_000;
      if (row?.status === 'fever') return 10_000;
      return false;
    },
  });
}

export function useWeekQuery(weekId: string | null) {
  return useQuery({
    queryKey: queryKeys.weeks.detail(weekId ?? ''),
    queryFn: () => fetchWeekById(weekId!),
    enabled: Boolean(weekId),
    staleTime: QUERY_STALE.activeWeek,
  });
}

export function useLatestSettledWeekQuery() {
  return useQuery({
    queryKey: queryKeys.weeks.latestSettled(),
    queryFn: fetchLatestSettledWeek,
    staleTime: QUERY_STALE.activeWeek,
  });
}
