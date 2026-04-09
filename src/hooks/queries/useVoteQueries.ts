import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_STALE } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/authStore';
import {
  castVoteAtomic,
  fetchMyVoteForIdea,
  fetchMyVotedIdeasAll,
  fetchMyVotesAll,
} from '@/services/voteService';

export function useMyVotesAllQuery() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return useQuery({
    queryKey: queryKeys.votes.myAll(),
    queryFn: () => fetchMyVotesAll(),
    enabled: Boolean(isLoggedIn),
    staleTime: QUERY_STALE.myVotes,
  });
}

export function useMyVotedIdeasAllQuery() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return useQuery({
    queryKey: queryKeys.votes.myVotedIdeasAll(),
    queryFn: () => fetchMyVotedIdeasAll(),
    enabled: Boolean(isLoggedIn),
    staleTime: QUERY_STALE.myVotes,
  });
}

export function useMyVoteForIdeaQuery(ideaId: string | null) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return useQuery({
    queryKey: queryKeys.votes.myIdea(ideaId ?? '', '__all__'),
    queryFn: () => fetchMyVoteForIdea(ideaId!),
    enabled: Boolean(ideaId && isLoggedIn),
    staleTime: QUERY_STALE.myVotes,
  });
}

export function useCastVoteMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (ideaId: string) => {
      if (!userId) throw new Error('로그인이 필요합니다.');
      return castVoteAtomic(userId, ideaId);
    },
    onSuccess: (res) => {
      if (res.success) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.votes.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.ranking.all });
      }
    },
  });
}
