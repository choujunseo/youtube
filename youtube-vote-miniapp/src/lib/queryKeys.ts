export const queryKeys = {
  weeks: {
    all: ['weeks'] as const,
    active: () => [...queryKeys.weeks.all, 'active'] as const,
    detail: (weekId: string) => [...queryKeys.weeks.all, 'detail', weekId] as const,
    latestSettled: () => [...queryKeys.weeks.all, 'latestSettled'] as const,
  },
  ideas: {
    all: ['ideas'] as const,
    list: (weekId: string) => [...queryKeys.ideas.all, 'list', weekId] as const,
    infinite: (weekId: string) => [...queryKeys.ideas.all, 'infinite', weekId] as const,
    detail: (ideaId: string) => [...queryKeys.ideas.all, 'detail', ideaId] as const,
    myAll: (creatorId: string) => [...queryKeys.ideas.all, 'myAll', creatorId] as const,
    myWeek: (creatorId: string, weekId: string) =>
      [...queryKeys.ideas.all, 'my', creatorId, weekId] as const,
    weekAll: (weekId: string) => [...queryKeys.ideas.all, 'weekAll', weekId] as const,
  },
  votes: {
    all: ['votes'] as const,
    myAll: () => [...queryKeys.votes.all, 'myAll'] as const,
    myWeek: (weekId: string) => [...queryKeys.votes.all, 'my', weekId] as const,
    myVotedIdeasAll: () => [...queryKeys.votes.all, 'myVotedIdeasAll'] as const,
    myVotedIdeas: (weekId: string) => [...queryKeys.votes.all, 'myVotedIdeas', weekId] as const,
    myIdea: (ideaId: string, weekId: string) =>
      [...queryKeys.votes.all, 'myIdea', ideaId, weekId] as const,
  },
  ranking: {
    all: ['ranking'] as const,
    live: () => [...queryKeys.ranking.all, 'live'] as const,
  },
  adLogs: {
    all: ['adLogs'] as const,
    my: () => [...queryKeys.adLogs.all, 'my'] as const,
  },
  weeklyResults: {
    all: ['weeklyResults'] as const,
    byWeek: (weekId: string) => [...queryKeys.weeklyResults.all, weekId] as const,
  },
} as const;
