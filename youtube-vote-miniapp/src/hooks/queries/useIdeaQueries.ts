import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_STALE } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import type { IInsertIdeaInput } from '@/services/ideaService';
import {
  fetchIdeaById,
  fetchMyIdeasAll,
  fetchIdeasPage,
  fetchMyIdeasForWeek,
  fetchWeekIdeasAll,
  insertIdea,
} from '@/services/ideaService';

const DEFAULT_PAGE_SIZE = 10;

interface IUseIdeasInfiniteOptions {
  /** 피버 구간이면 피드 데이터를 더 자주 재요청 */
  feverMode?: boolean;
}

export function useIdeasInfiniteQuery(
  weekId: string | null,
  userId: string | null,
  pageSize = DEFAULT_PAGE_SIZE,
  options?: IUseIdeasInfiniteOptions,
) {
  const feverMode = Boolean(options?.feverMode);
  return useInfiniteQuery({
    queryKey: queryKeys.ideas.infinite(
      `${weekId ?? '__none__'}:${userId ?? '__none__'}:${feverMode ? 'f' : 'n'}`,
    ),
    queryFn: ({ pageParam }) =>
      fetchIdeasPage({
        userId: userId!,
        weekId: weekId!,
        limit: pageSize,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: Boolean(weekId && userId),
    staleTime: feverMode ? 10_000 : QUERY_STALE.ideasFeed,
    refetchInterval: feverMode ? 10_000 : false,
  });
}

export function useIdeaQuery(ideaId: string | null) {
  return useQuery({
    queryKey: queryKeys.ideas.detail(ideaId ?? ''),
    queryFn: () => fetchIdeaById(ideaId!),
    enabled: Boolean(ideaId),
    staleTime: QUERY_STALE.ideaDetail,
  });
}

export function useMyIdeasForWeekQuery(creatorId: string | null, weekId: string | null) {
  return useQuery({
    queryKey: queryKeys.ideas.myWeek(creatorId ?? '', weekId ?? ''),
    queryFn: () => fetchMyIdeasForWeek(creatorId!, weekId!),
    enabled: Boolean(creatorId && weekId),
    staleTime: QUERY_STALE.ideasFeed,
  });
}

export function useMyIdeasAllQuery(creatorId: string | null) {
  return useQuery({
    queryKey: queryKeys.ideas.myAll(creatorId ?? ''),
    queryFn: () => fetchMyIdeasAll(creatorId!),
    enabled: Boolean(creatorId),
    staleTime: QUERY_STALE.ideasFeed,
  });
}

export function useWeekIdeasAllQuery(weekId: string | null) {
  return useQuery({
    queryKey: queryKeys.ideas.weekAll(weekId ?? ''),
    queryFn: () => fetchWeekIdeasAll(weekId!),
    enabled: Boolean(weekId),
    staleTime: QUERY_STALE.ideasFeed,
  });
}

export function useInsertIdeaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IInsertIdeaInput) => insertIdea(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
    },
  });
}
