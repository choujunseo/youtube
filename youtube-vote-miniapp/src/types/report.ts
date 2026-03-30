export type IReportReasonCode = 'SPAM' | 'ABUSE' | 'COPYRIGHT' | 'ILLEGAL' | 'OTHER';

export type IReportStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected';

/** `reports` 테이블 행 (UGC 신고) */
export interface IReport {
  id: string;
  reporterUserId: string | null;
  reportedIdeaId: string;
  reasonCode: IReportReasonCode;
  reasonDetail: string | null;
  status: IReportStatus;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
}

export interface IInsertReportInput {
  /** 비로그인 신고 시 null */
  reporterUserId?: string | null;
  reportedIdeaId: string;
  reasonCode: IReportReasonCode;
  reasonDetail?: string | null;
}
