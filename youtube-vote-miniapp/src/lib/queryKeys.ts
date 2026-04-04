export const queryKeys = {
  ideas: {
    all: ['ideas'] as const,
    infinite: (feedKey: string) => [...queryKeys.ideas.all, 'infinite', feedKey] as const,
    detail: (ideaId: string) => [...queryKeys.ideas.all, 'detail', ideaId] as const,
    myAll: (creatorId: string) => [...queryKeys.ideas.all, 'myAll', creatorId] as const,
    myDailyCount: (creatorId: string) => [...queryKeys.ideas.all, 'myDailyCount', creatorId] as const,
  },
  votes: {
    all: ['votes'] as const,
    myAll: () => [...queryKeys.votes.all, 'myAll'] as const,
    myVotedIdeasAll: () => [...queryKeys.votes.all, 'myVotedIdeasAll'] as const,
    myIdea: (ideaId: string, scope: string) =>
      [...queryKeys.votes.all, 'myIdea', ideaId, scope] as const,
  },
  ranking: {
    all: ['ranking'] as const,
    live: () => [...queryKeys.ranking.all, 'live'] as const,
    hallOfFame: () => [...queryKeys.ranking.all, 'hallOfFame'] as const,
  },
  adLogs: {
    all: ['adLogs'] as const,
    my: () => [...queryKeys.adLogs.all, 'my'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    my: () => [...queryKeys.notifications.all, 'my'] as const,
  },
} as const;
