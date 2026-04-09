import { useQuery } from '@tanstack/react-query';
import { QUERY_STALE } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { fetchHallOfFame } from '@/services/rankingService';

export function useHallOfFameQuery() {
  return useQuery({
    queryKey: queryKeys.ranking.hallOfFame(),
    queryFn: fetchHallOfFame,
    staleTime: QUERY_STALE.liveRanking,
    refetchInterval: false,
  });
}
