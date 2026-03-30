/** `weekly_results` 테이블 행 */
export interface IWeeklyResult {
  id: string;
  weekId: string;
  winnerIdeaId: string;
  creatorId: string;
  creatorPrize: number;
  voterWinner1Id: string | null;
  voterWinner2Id: string | null;
  voterPrizeEach: number;
  fullRanking: unknown | null;
  settledAt: string;
}
