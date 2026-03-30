export type IWeekStatus = 'active' | 'fever' | 'closed' | 'settled';

/** `weeks` 테이블 행 (앱에서 camelCase 사용) */
export interface IWeek {
  id: string;
  year: number;
  weekNumber: number;
  startAt: string;
  endAt: string;
  feverStartAt: string;
  status: IWeekStatus;
  prizePool: number;
  createdAt: string;
}
