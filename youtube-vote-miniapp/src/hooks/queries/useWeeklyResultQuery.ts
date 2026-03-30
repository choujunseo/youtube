import { useQuery } from '@tanstack/react-query';
import { QUERY_STALE } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { fetchWeeklyResultByWeekId } from '@/services/weeklyResultService';

export function useWeeklyResultQuery(weekId: string | null) {
  return useQuery({
    queryKey: queryKeys.weeklyResults.byWeek(weekId ?? ''),
    queryFn: () => fetchWeeklyResultByWeekId(weekId!),
    enabled: Boolean(weekId),
    staleTime: QUERY_STALE.weeklyResult,
  });
}
