export interface IUserNotification {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  payoutLogId: string | null;
  createdAt: string;
  readAt: string | null;
}
