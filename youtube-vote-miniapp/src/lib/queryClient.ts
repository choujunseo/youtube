import { QueryClient } from '@tanstack/react-query';

/** 스펙/화면별 staleTime — 훅에서 override 가능 */
export const QUERY_STALE = {
  activeWeek: 60_000,
  ideasFeed: 30_000,
  ideaDetail: 45_000,
  myVotes: 20_000,
  liveRanking: 30_000,
  weeklyResult: 120_000,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});
