import type { IWeek } from '@/types/week';

/** 예: 2026년 13주차 */
export function formatWeekLabel(week: IWeek): string {
  return `${week.year}년 ${week.weekNumber}주차`;
}
