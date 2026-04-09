import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import type { ITokenExchangeResponse } from '@/types/user';

interface IEdgeErrorContext {
  functionName: 'auth-token-exchange' | 'toss-revoke-access' | 'withdraw-account';
  /** auth-token-exchange: appLogin()과 동일한 값이 Edge까지 전달됐는지 안내용 */
  referrer?: string;
}

/** 번들 이중 로드 시 instanceof 가 실패할 수 있어 name·context 로도 식별 */
function isFunctionsHttpLikeError(err: unknown): err is FunctionsHttpError {
  if (err instanceof FunctionsHttpError) return true;
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; context?: unknown };
  return e.name === 'FunctionsHttpError' && e.context instanceof Response;
}

/**
 * Edge 401 본문이 비었거나 JSON 이 아닐 때 clone().json() 만으로는 내용을 못 읽음 → text 후 파싱.
 */
async function parseEdgeFunctionErrorBody(res: Response): Promise<{
  message: string | undefined;
  errorCode: string | undefined;
}> {
  try {
    const text = (await res.clone().text()).trim();
    if (!text) return { message: undefined, errorCode: undefined };
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const errVal = json.error;
      const message =
        typeof errVal === 'string'
          ? errVal
          : errVal != null && typeof errVal !== 'object'
            ? String(errVal)
            : typeof json.message === 'string'
              ? json.message
              : typeof json.msg === 'string'
                ? json.msg
                : undefined;
      const ec = json.errorCode ?? json.code;
      const errorCode = typeof ec === 'string' ? ec : undefined;
      return { message, errorCode };
    } catch {
      return { message: text, errorCode: undefined };
    }
  } catch {
    return { message: undefined, errorCode: undefined };
  }
}

/** 응답 본문을 읽지 못한 HTTP 401 — 세분화 힌트만이라도 표시 */
function supplementOpaqueEdge401(ctx?: IEdgeErrorContext): string {
  const base = [
    'Edge Function이 HTTP 401을 반환했습니다.',
    '응답 본문이 비어 있거나, 웹뷰·게이트웨이 때문에 JSON 을 읽지 못했을 수 있어요.',
    'Supabase 대시보드 → Edge Functions → 해당 함수 → Logs 에서 실제 error 메시지를 확인하세요.',
    '',
  ];
  if (ctx?.functionName === 'auth-token-exchange') {
    return [
      ...base,
      '[auth-token-exchange] 이럴 때가 많아요:',
      '• Supabase 세션 JWT 무효 → Edge의 getUser 실패 (anon 키·URL 짝, 익명 로그인, 세션 만료)',
      '• 토스 generate-token 거절 → 콘솔 Client ID/Secret, referrer(SANDBOX/DEFAULT), 인가코드 1회용·만료, invalid_grant',
      '• Authorization 헤더 누락 → 클라이언트가 Bearer access_token 을 붙였는지',
      ctx.referrer != null && ctx.referrer !== ''
        ? `• 이번 요청 referrer: "${ctx.referrer}"`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (ctx?.functionName === 'toss-revoke-access') {
    return [
      ...base,
      '[toss-revoke-access]',
      '• Supabase JWT 무효',
      '• Toss accessToken 만료·이미 해제됨',
    ].join('\n');
  }
  if (ctx?.functionName === 'withdraw-account') {
    return [
      ...base,
      '[withdraw-account]',
      '• Supabase JWT 무효·만료',
      '• 함수 배포 여부 (supabase functions deploy withdraw-account)',
    ].join('\n');
  }
  return [...base, '• 호출한 함수 이름·배포·시크릿(TOSS_*, SUPABASE_*)을 확인하세요.'].join('\n');
}

function formatAnonymousSignInError(message: string): string {
  const low = message.toLowerCase();
  const looksBadKey =
    low.includes('invalid api key') || (low.includes('jwt') && low.includes('invalid'));
  if (looksBadKey) {
    return [
      `Supabase 익명 로그인 실패: ${message}`,
      '',
      '[API 키]',
      '• VITE_SUPABASE_ANON_KEY = 대시보드 Settings → API의 anon public 키 (같은 프로젝트 ref의 URL과 짝)',
      '• 플레이스홀더·service_role·다른 프로젝트 키는 사용할 수 없습니다.',
    ].join('\n');
  }
  if (
    low.includes('anonymous') &&
    (low.includes('disabled') || low.includes('not enabled') || low.includes('enable'))
  ) {
    return [
      `Supabase 익명 로그인 실패: ${message}`,
      '',
      '[Anonymous provider]',
      '• Authentication → Providers → Anonymous sign-in 을 켠 뒤 저장했는지 확인하세요.',
    ].join('\n');
  }
  if (low.includes('signup') && low.includes('disabled')) {
    return [
      `Supabase 익명 로그인 실패: ${message}`,
      '',
      '[가입 정책]',
      '• Authentication → Providers 에서 익명이 허용되는지, 필요 시 "Sign ups" 관련 제한을 확인하세요.',
    ].join('\n');
  }
  return [
    `Supabase 익명 로그인 실패: ${message}`,
    '',
    '[일반]',
    '• 네트워크·프로젝트 일시 오류일 수 있어요. 잠시 후 재시도하세요.',
    '• 위 메시지에 api key / jwt / anonymous 가 보이면 Settings·Providers 를 점검하세요.',
  ].join('\n');
}

function formatEdgeHttpError(
  status: number,
  error: string,
  errorCode: string | undefined,
  ctx?: IEdgeErrorContext,
): string {
  const code = (errorCode ?? '').toUpperCase();
  const low = error.toLowerCase();

  if (
    status === 401 &&
    ctx &&
    (low.includes('non-2xx') || low.includes('edge function returned a non-2xx'))
  ) {
    return supplementOpaqueEdge401(ctx);
  }

  if (code === 'UNAUTHORIZED' && low.includes('missing authorization')) {
    return [
      '[요청 헤더] Authorization 이 없습니다.',
      error,
      '',
      '클라이언트에서 Supabase 세션 access_token 을 Bearer 로 넣는지 확인하세요.',
    ].join('\n');
  }

  const looksJwtRejected =
    code === 'AUTH' ||
    (status === 401 &&
      (low.includes('invalid supabase session') ||
        low.includes('invalid jwt') ||
        low.includes('jwt expired') ||
        low.includes('malformed jwt')));

  if (looksJwtRejected) {
    const jwtHint = low.includes('invalid jwt')
      ? 'invalid jwt 는 게이트웨이(verify_jwt)가 먼저 거절했거나, 프로젝트(ref) 불일치·만료된 access_token 일 때 흔합니다.'
      : 'JWT 를 Edge(anon 키)가 검증하지 못했습니다.';
    return [
      '[Supabase 세션·JWT]',
      jwtHint,
      `서버/게이트웨이 메시지: ${error}`,
      '',
      '확인 (순서대로):',
      '• supabase/config.toml 에서 auth-token-exchange·toss-revoke-access·withdraw-account 의 verify_jwt 가 true 이면, 배포를 다시 하기 전까지 게이트웨이가 JWT 를 먼저 검사합니다. 이 레포는 함수 안 getUser 검증만 쓰도록 false 권장. 변경 후 supabase functions deploy 로 재배포',
      '• 앱 .env 의 VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY 와 Edge secrets 의 SUPABASE_URL·SUPABASE_ANON_KEY 가 같은 Supabase 프로젝트인지 (다른 프로젝트 anon 키면 invalid jwt)',
      '• Edge 에 올린 SUPABASE_ANON_KEY 가 오타·옛 값·다른 브랜치 시크릿이 아닌지 (`supabase secrets list` / 대시보드 API 키와 재대조)',
      '• 클라이언트 세션 만료: 익명 로그인 직후 곧바로 invoke 하는지, 오래 켜 둔 탭에서는 로그인 재시도',
      '• Authorization: Bearer 뒤에 붙는 값이 Supabase Auth 의 access_token 전체인지(잘림·따옴표·공백 없음)',
    ].join('\n');
  }

  if (
    code === 'BAD_REQUEST' ||
    low.includes('authorizationcode required') ||
    low.includes('authorization code required')
  ) {
    return [
      '[요청 본문] authorizationCode 가 비어 있거나 잘못 전달됐습니다.',
      error,
      '',
      '토스 appLogin() 성공 직후의 authorizationCode 를 그대로 보내는지 확인하세요.',
    ].join('\n');
  }

  if (code === 'CONFIG') {
    return [
      '[Edge 서버 설정] Supabase/토스 시크릿이 배포 환경에 없거나 잘못됐을 수 있습니다.',
      error,
      '',
      '확인:',
      '• 호스팅 Edge: auth-token-exchange 배포 여부',
      '• SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY(Edge용) — secrets 반영 여부',
      '• TOSS_CLIENT_ID, TOSS_CLI_SECRET(또는 TOSS_CLIENT_SECRET)',
    ].join('\n');
  }

  if (code === 'CONFIG_MTLS') {
    return [
      '[mTLS] 파트너 API용 클라이언트 인증서가 필요한데 설정되지 않았습니다.',
      error,
      '',
      '확인:',
      '• TOSS_MTLS_CERT_PEM · TOSS_MTLS_KEY_PEM (또는 *_B64)',
      '• TOSS_PARTNER_REQUIRE_MTLS=true 인 경우 콘솔에서 발급한 인증서와 짝이 맞는지',
    ].join('\n');
  }

  if (low.includes('invalid_grant')) {
    const refLine = ctx?.referrer
      ? `• referrer: "${ctx.referrer}" — appLogin()이 준 값과 동일해야 합니다. 샌드박스/실서비스 혼동 주의.`
      : '• appLogin()이 반환한 referrer(DEFAULT / SANDBOX)를 수정 없이 전달했는지';
    const prefix =
      ctx?.functionName === 'toss-revoke-access'
        ? '[토스 연결 끊기] 저장된 Toss accessToken 이 이미 무효이거나 만료됐을 수 있습니다.'
        : '[토스 OAuth·인가코드] invalid_grant — 인가 코드로 토큰을 발급받지 못했습니다.';
    return [
      prefix,
      `서버 메시지: ${error}`,
      '',
      '가능한 원인:',
      '• 인가 코드는 1회용 — 같은 코드로 두 번 교환하거나, 재시도가 겹치면 실패합니다.',
      '• 인가 코드 만료 — appLogin 직후 가능한 한 바로 교환되는지 확인하세요.',
      refLine,
      '• Edge 시크릿의 TOSS_CLIENT_ID / TOSS_CLI_SECRET 이 이 미니앱(샌드박스·라이브) 콘솔 등록과 일치하는지',
      '• mTLS 필수 환경에서 인증서 누락·불일치',
    ].join('\n');
  }

  if (code === 'TOKEN' && ctx?.functionName === 'auth-token-exchange') {
    return [
      '[토스 generate-token] 액세스 토큰 발급에 실패했습니다.',
      error,
      '',
      'invalid_grant 가 아닌 경우에도 Client ID/Secret·referrer·mTLS·토스 API 상태를 점검하세요.',
    ].join('\n');
  }

  if (code === 'PROFILE') {
    return [
      '[토스 login-me] 유저 프로필(userKey 등) 조회에 실패했습니다.',
      error,
      '',
      'generate-token 은 성공했을 수 있습니다. 토큰 스코프·토스 API 응답을 확인하세요.',
    ].join('\n');
  }

  if (code === 'WITHDRAW_COOLDOWN') {
    return error;
  }

  if (code === 'DB_RELINK' || code === 'DB_RELINK_READ') {
    return [
      '[DB] 토스 계정 재연결 중 오류가 났어요.',
      error,
      '',
      '잠시 후 다시 시도해 주세요. 계속되면 Supabase Edge 로그를 확인하세요.',
    ].join('\n');
  }

  if (code === 'DB_UPSERT') {
    return [
      '[DB] public.users upsert 실패',
      error,
      '',
      'Supabase에서 테이블·RLS·제약 조건·컬럼 타입을 확인하세요.',
    ].join('\n');
  }

  if (ctx?.functionName === 'toss-revoke-access' && code === 'TOSS_REVOKE') {
    return [
      '[토스 revoke API] 연결 끊기 요청이 토스에서 거절되었거나 응답이 비정상입니다.',
      error,
      '',
      '토큰 만료·이미 해제됨·잘못된 Bearer 등을 의심하세요.',
    ].join('\n');
  }

  if (code === 'INTERNAL') {
    return [
      '[Edge 내부 오류]',
      error,
      '',
      'Supabase Edge Function 로그에서 스택/예외를 확인하세요.',
    ].join('\n');
  }

  const tag = errorCode ? ` [${errorCode}]` : '';
  return `${error}${tag}${status ? `\n(HTTP ${status})` : ''}`;
}

function withEdgeNetworkHint(base: string): string {
  const lower = base.toLowerCase();
  const looksNetwork =
    lower.includes('load failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('fetch failed');
  if (!looksNetwork) return base;
  return [
    base,
    '',
    'Edge Function 요청이 네트워크 단계에서 끊긴 경우가 많아요.',
    '• VITE_SUPABASE_URL: https://프로젝트ref.supabase.co (끝에 / 없음, 오타 확인)',
    '• 대시보드 → Edge Functions 배포 여부 (auth-token-exchange, toss-revoke-access, withdraw-account)',
    '• 폰 토스 웹뷰: PC localhost가 아닌 위 Supabase 클라우드 URL·anon key 사용',
    '• VPN·기업망·iCloud 비공개 릴레이 끄고 재시도',
  ].join('\n');
}

async function messageFromFunctionsInvokeError(
  err: unknown,
  ctx?: IEdgeErrorContext,
): Promise<string> {
  if (err instanceof FunctionsFetchError) {
    const c = err.context;
    if (c instanceof Error) {
      return withEdgeNetworkHint(`${err.message}: ${c.message}`);
    }
    if (c && typeof c === 'object' && 'message' in c) {
      return withEdgeNetworkHint(`${err.message}: ${String((c as { message: unknown }).message)}`);
    }
    return withEdgeNetworkHint(err.message);
  }
  if (isFunctionsHttpLikeError(err)) {
    const res = err.context as Response;
    const { message: bodyMsg, errorCode } = await parseEdgeFunctionErrorBody(res);
    if (bodyMsg) {
      return formatEdgeHttpError(res.status, bodyMsg, errorCode, ctx);
    }
    if (res.status === 401) {
      return supplementOpaqueEdge401(ctx);
    }
    return formatEdgeHttpError(
      res.status,
      err.message || `HTTP ${res.status}`,
      errorCode,
      ctx,
    );
  }
  if (err instanceof Error) return err.message;
  return 'Token exchange failed';
}

/**
 * RLS(auth.uid)와 `public.users.auth_user_id`를 맞추기 위해,
 * Edge 호출 전에 Supabase Auth 세션이 있어야 한다.
 * Dashboard → Authentication → Providers → Anonymous sign-in 활성화 필요.
 */
export async function ensureSupabaseAuthSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    const { error: userErr } = await supabase.auth.getUser();
    if (!userErr) return;
    await supabase.auth.signOut();
  }

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(formatAnonymousSignInError(error.message));
  }
}

/**
 * Toss authorizationCode를 Edge Function을 통해 accessToken + userKey로 교환.
 * Edge Function은 S2S로 Toss 서버와 통신하므로 클라이언트에 secret이 노출되지 않음.
 * invoke 시 현재 Supabase 세션 JWT가 헤더로 전달되어 `users.auth_user_id`에 연결된다.
 */
export async function exchangeToken(
  authorizationCode: string,
  referrer: string,
): Promise<ITokenExchangeResponse> {
  await ensureSupabaseAuthSession();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error(
      [
        '[Supabase] access_token 이 없습니다.',
        '익명 로그인(ensureSupabaseAuthSession) 직후 세션이 비어 있으면 발생할 수 있어요.',
        '브라우저 저장소·시크릿 모드·다른 탭에서 signOut 했는지도 확인하세요.',
      ].join('\n'),
    );
  }

  const edgeCtx: IEdgeErrorContext = { functionName: 'auth-token-exchange', referrer };

  const { data, error } = await supabase.functions.invoke<ITokenExchangeResponse>(
    'auth-token-exchange',
    {
      body: { authorizationCode, referrer },
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (error) {
    throw new Error(await messageFromFunctionsInvokeError(error, edgeCtx));
  }

  if (!data?.accessToken || data.tossUserKey == null) {
    const maybe = data as { error?: string; errorCode?: string } | null;
    if (maybe?.error) {
      throw new Error(formatEdgeHttpError(200, maybe.error, maybe.errorCode, edgeCtx));
    }
    throw new Error(
      [
        '[토큰 교환] 응답에 accessToken 또는 tossUserKey 가 없습니다.',
        'Edge auth-token-exchange 가 2xx 를 줬지만 본문 형식이 예상과 다를 수 있어요. 배포 버전·로그를 확인하세요.',
      ].join('\n'),
    );
  }

  return data;
}

/**
 * develop.md §6 — 파트너 API remove-by-access-token (Authorization: Bearer Toss accessToken).
 * 성공 시 Edge가 동일 Supabase 유저의 users 행에서 토스 연동을 정리한다.
 */
export async function revokeTossAccessByToken(tossAccessToken: string): Promise<void> {
  await ensureSupabaseAuthSession();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const supaJwt = session?.access_token;
  if (!supaJwt) {
    throw new Error(
      [
        '[Supabase] access_token 이 없습니다.',
        '연결 끊기 전에 익명 세션이 있어야 합니다. 로그인 상태·저장소를 확인하세요.',
      ].join('\n'),
    );
  }

  const revokeCtx: IEdgeErrorContext = { functionName: 'toss-revoke-access' };

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
    errorCode?: string;
  }>('toss-revoke-access', {
    body: { tossAccessToken },
    headers: { Authorization: `Bearer ${supaJwt}` },
  });

  if (error) {
    throw new Error(await messageFromFunctionsInvokeError(error, revokeCtx));
  }

  if (!data?.ok) {
    const msg = data?.error;
    if (msg) {
      throw new Error(formatEdgeHttpError(200, msg, data?.errorCode, revokeCtx));
    }
    throw new Error(
      [
        '[토스 연결 끊기] Edge 응답에 ok 가 없습니다.',
        'toss-revoke-access 배포·로그를 확인하세요.',
      ].join('\n'),
    );
  }
}

/** 앱에서 토스 로그인 해제: 토큰이 있으면 §6 API 호출 후 스토어 초기화 */
export async function unlinkTossLogin(): Promise<void> {
  const tossAccessToken = useAuthStore.getState().accessToken;
  if (tossAccessToken) {
    await revokeTossAccessByToken(tossAccessToken);
  }
  useAuthStore.getState().clearAuth();
}

/**
 * develop.md §6 로그인 연결 끊기(remove-by-access-token) + 서비스 탈퇴(DB soft-delete).
 * ensureSupabaseAuthSession 을 쓰지 않음 — 만료 시 새 익명 세션이 생기면 잘못된 행을 지울 수 있음.
 */
export async function withdrawAccount(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const supaJwt = session?.access_token;
  if (!supaJwt) {
    throw new Error('로그인 세션이 없어요. 탈퇴를 진행할 수 없어요.');
  }

  const { error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    throw new Error('세션이 만료됐어요. 다시 로그인한 뒤 탈퇴를 시도해 주세요.');
  }

  const tossAccessToken = useAuthStore.getState().accessToken?.trim() ?? '';
  const withdrawCtx: IEdgeErrorContext = { functionName: 'withdraw-account' };

  let dbHandled = false;
  if (tossAccessToken) {
    try {
      await revokeTossAccessByToken(tossAccessToken);
      dbHandled = true;
    } catch {
      /* 토스 토큰 만료·invalid_grant 등 — withdraw-account 로 DB만 정리 */
    }
  }

  if (!dbHandled) {
    const {
      data: { session: s2 },
    } = await supabase.auth.getSession();
    const jwt = s2?.access_token;
    if (!jwt) {
      throw new Error('세션이 끊겼어요. 탈퇴를 처음부터 다시 시도해 주세요.');
    }

    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      error?: string;
      errorCode?: string;
    }>('withdraw-account', {
      body: {},
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (error) {
      throw new Error(await messageFromFunctionsInvokeError(error, withdrawCtx));
    }
    if (!data?.ok) {
      const msg = (data as { error?: string } | null)?.error;
      throw new Error(
        msg
          ? formatEdgeHttpError(200, msg, (data as { errorCode?: string }).errorCode, withdrawCtx)
          : '탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.',
      );
    }
  }

  await supabase.auth.signOut();
  useAuthStore.getState().clearAuth();
}

/**
 * toss_user_key로 users 행 조회.
 */
export async function fetchUserByTossKey(tossUserKey: number) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('toss_user_key', tossUserKey)
    .single();

  if (error) {
    throw new Error(`fetchUser failed: ${error.message}`);
  }

  return data;
}
