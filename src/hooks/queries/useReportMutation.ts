import { useMutation } from '@tanstack/react-query';
import { insertReport } from '@/services/reportService';
import type { IInsertReportInput } from '@/types/report';

export function useInsertReportMutation() {
  return useMutation({
    mutationFn: (input: IInsertReportInput) => insertReport(input),
  });
}
