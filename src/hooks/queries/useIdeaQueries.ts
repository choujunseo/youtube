import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_STALE } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import type { IInsertIdeaInput } from '@/services/ideaService';
import {
  deleteMyIdea,
  fetchIdeaByCode,
  fetchIdeaById,
  fetchMyDailyIdeaUploadCount,
  fetchMyIdeasAll,
  fetchIdeasPage,
  insertIdea,
} from '@/services/ideaService';

const DEFAULT_PAGE_SIZE = 10;

interface IUseIdeasInfiniteOptions {
  /** 피버 구간이면 피드 데이터를 더 자주 재요청 */
  feverMode?: boolean;
}

export function useIdeasInfiniteQuery(
  userId: string | null,
  pageSize = DEFAULT_PAGE_SIZE,
  options?: IUseIdeasInfiniteOptions,
) {
  const feverMode = Boolean(options?.feverMode);
  return useInfiniteQuery({
    queryKey: queryKeys.ideas.infinite(
      `${userId ?? '__none__'}:${feverMode ? 'f' : 'n'}`,
    ),
    queryFn: ({ pageParam }) =>
      fetchIdeasPage({
        userId: userId!,
        limit: pageSize,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: Boolean(userId),
    staleTime: feverMode ? 10_000 : QUERY_STALE.ideasFeed,
    refetchInterval: feverMode ? 10_000 : false,
    /** My 등 탭 왕복 시 피드 트리는 유지되지만, 혹시 리마운트돼도 목록이 깜빡이지 않도록 */
    refetchOnMount: false,
  });
}

export function useIdeaByCodeQuery(code: string) {
  const trimmed = code.trim().toUpperCase();
  return useQuery({
    queryKey: queryKeys.ideas.byCode(trimmed),
    queryFn: () => fetchIdeaByCode(trimmed),
    enabled: trimmed.length === 8,
    staleTime: QUERY_STALE.ideaDetail,
    retry: false,
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

export function useMyIdeasAllQuery(creatorId: string | null) {
  return useQuery({
    queryKey: queryKeys.ideas.myAll(creatorId ?? ''),
    queryFn: () => fetchMyIdeasAll(creatorId!),
    enabled: Boolean(creatorId),
    staleTime: QUERY_STALE.ideasFeed,
  });
}

export function useMyDailyIdeaUploadCountQuery(creatorId: string | null) {
  return useQuery({
    queryKey: queryKeys.ideas.myDailyCount(creatorId ?? ''),
    queryFn: () => fetchMyDailyIdeaUploadCount(creatorId!),
    enabled: Boolean(creatorId),
    staleTime: 10_000,
    refetchInterval: 10_000,
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

export function useDeleteMyIdeaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ideaId: string) => deleteMyIdea(ideaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.votes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ranking.all });
    },
  });
}
