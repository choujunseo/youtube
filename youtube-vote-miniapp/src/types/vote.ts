/** `votes` 테이블 행 */
export interface IVote {
  id: string;
  userId: string;
  ideaId: string;
  weekId: string;
  dayOfWeek: number;
  weight: 1 | 2 | 3;
  weightedShare: number;
  createdAt: string;
}

/** `cast_vote_atomic` RPC JSON 응답 */
export interface ICastVoteAtomicResult {
  success: boolean;
  probability?: number;
  weight?: number;
  weekId?: string;
  error?: string;
}
