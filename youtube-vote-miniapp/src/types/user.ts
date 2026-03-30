export interface IUser {
  id: string;
  tossUserKey: number;
  displayName: string;
  freeTickets: number;
  adTickets: number;
  weeklyUploadCount: number;
  hasBonusUpload: boolean;
  ticketResetAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAuthState {
  tossUserKey: number | null;
  accessToken: string | null;
  user: IUser | null;
  isLoggedIn: boolean;
  authLinked?: boolean;
  profileNameDecrypted?: boolean;
}

/** appLogin() 응답 */
export interface ITossLoginResult {
  authorizationCode: string;
  referrer: string;
}

/** Edge Function 토큰 교환 응답 (`user`는 DB snake_case 행) */
export interface ITokenExchangeResponse {
  accessToken: string;
  tossUserKey: number;
  user: Record<string, unknown>;
  /** Supabase JWT가 Edge까지 전달되어 auth_user_id가 연결됐는지 */
  authLinked?: boolean;
  /** Edge에 토스 복호화 키/AAD가 있으면 name 복호화 성공 여부 */
  profileNameDecrypted?: boolean;
}
