export interface IUser {
  /** 영구 사용자 PK (ideas.user_id 등 FK). 재연결 시 Supabase auth.uid() 와 다를 수 있음 */
  id: string;
  /** 현재 Supabase 세션 사용자 id (익명 JWT sub). 없으면 id 와 동일한 초기 가입 레거시 */
  authUserId?: string;
  tossUserKey: number;
  displayName: string;
  gender?: 'male' | 'female' | 'other' | 'unknown' | null;
  ageDecade?: number | null;
  freeTickets: number;
  adTickets: number;
  /** 광고 충전 후 내 아이디어에서 소모하는 부스트 횟수 (구버전 persist에는 없을 수 있음) */
  boostCharges?: number;
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
