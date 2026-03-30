import { useQuery } from '@tanstack/react-query';
import { QUERY_STALE } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { fetchLiveRanking } from '@/services/rankingService';

/** 랭킹은 피버 구간에서만 수동(당겨서 새로고침) 갱신 — 자동 폴링 없음 */
export function useLiveRankingQuery() {
  return useQuery({
    queryKey: queryKeys.ranking.live(),
    queryFn: fetchLiveRanking,
    staleTime: QUERY_STALE.liveRanking,
    refetchInterval: false,
  });
}
