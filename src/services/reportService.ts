import { supabase } from '@/services/supabase';
import type { IInsertReportInput, IReport } from '@/types/report';

function mapReportRow(row: Record<string, unknown>): IReport {
  return {
    id: row.id as string,
    reporterUserId: (row.reporter_user_id as string | null | undefined) ?? null,
    reportedIdeaId: row.reported_idea_id as string,
    reasonCode: row.reason_code as IReport['reasonCode'],
    reasonDetail: (row.reason_detail as string | null) ?? null,
    status: row.status as IReport['status'],
    handledBy: (row.handled_by as string | null) ?? null,
    handledAt: (row.handled_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function insertReport(input: IInsertReportInput): Promise<IReport> {
  const row: Record<string, unknown> = {
    reported_idea_id: input.reportedIdeaId,
    reason_code: input.reasonCode,
    reason_detail: input.reasonDetail ?? null,
  };
  if (input.reporterUserId != null && input.reporterUserId !== '') {
    row.reporter_user_id = input.reporterUserId;
  } else {
    row.reporter_user_id = null;
  }

  const { data, error } = await supabase.from('reports').insert(row).select().single();

  if (error) throw new Error(error.message);
  return mapReportRow(data as Record<string, unknown>);
}
