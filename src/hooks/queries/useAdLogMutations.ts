import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchMyAdLogs, insertAdLog } from '@/services/adLogService';
import type { IInsertAdLogInput } from '@/types/adLog';

export function useMyAdLogsQuery(limit = 50) {
  return useQuery({
    queryKey: queryKeys.adLogs.my(),
    queryFn: () => fetchMyAdLogs(limit),
    staleTime: 60_000,
  });
}

export function useInsertAdLogMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IInsertAdLogInput) => insertAdLog(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adLogs.all });
    },
  });
}
