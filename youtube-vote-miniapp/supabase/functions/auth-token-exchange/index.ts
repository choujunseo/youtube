import { createClient } from 'jsr:@supabase/supabase-js@2';

import { tryDecryptTossLoginField } from '../_shared/tossLoginDecrypt.ts';

/** 앱인토스 공식 Base URL: https://developers-apps-in-toss.toss.im/login/develop.html */
const APPS_IN_TOSS_API_BASE = 'https://apps-in-toss-api.toss.im';
const GENERATE_TOKEN_PATH =
  '/api-partner/v1/apps-in-toss/user/oauth2/generate-token';
const LOGIN_ME_PATH = '/api-partner/v1/apps-in-toss/user/oauth2/login-me';

const TOSS_CLIENT_ID = Deno.env.get('TOSS_CLIENT_ID') ?? '';
/** OAuth client secret (`TOSS_CLI_SECRET` 권장; 구 `TOSS_CLIENT_SECRET` 폴백) */
const TOSS_CLI_SECRET =
  Deno.env.get('TOSS_CLI_SECRET') ?? Deno.env.get('TOSS_CLIENT_SECRET') ?? '';
/** 콘솔에서 발급한 mTLS 인증서/키 (PEM). 줄바꿈은 \\n 으로 이스케이프해 Secrets에 저장 가능 */
const TOSS_MTLS_CERT_PEM = Deno.env.get('TOSS_MTLS_CERT_PEM') ?? '';
const TOSS_MTLS_KEY_PEM = Deno.env.get('TOSS_MTLS_KEY_PEM') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
/** 이메일로 받은 AES-256 키 (Base64 인코딩 문자열). 섹션 5 참고 */
const TOSS_USER_INFO_AES_KEY_BASE64 = Deno.env.get('TOSS_USER_INFO_AES_KEY_BASE64') ?? '';
/** 이메일로 받은 AAD(Additional Authenticated Data), UTF-8 문자열 */
const TOSS_USER_INFO_AAD = Deno.env.get('TOSS_USER_INFO_AAD') ?? '';

/** 웹뷰·브라우저에서 functions.invoke 시 프리플라이트·본문 응답 모두 CORS 필요 (apikey 헤더 누락 시 iOS Load failed) */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-region, prefer',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonRes(data: unknown, init?: ResponseInit): Response {
  const h = new Headers(init?.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    h.set(k, v);
  }
  if (!h.has('Content-Type')) {
    h.set('Content-Type', 'application/json');
  }
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    statusText: init?.statusText,
    headers: h,
  });
}

interface ITossSuccessWrapper<T> {
  resultType: 'SUCCESS' | 'FAIL';
  success?: T;
  error?: { errorCode?: string; reason?: string };
}

/** login-me success 필드 (민감 필드는 암호화 문자열로 옴) */
interface ITossLoginMeSuccess {
  userKey: number;
  scope?: string;
  agreedTerms?: unknown;
  name?: string | null;
  phone?: string | null;
  birthday?: string | null;
  ci?: string | null;
  di?: string | null;
  gender?: string | null;
  nationality?: string | null;
  email?: string | null;
}

function pemFromEnv(raw: string): string {
  if (!raw) return '';
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

function getTossHttpClient(): TossEdgeHttpClient | undefined {
  const cert = pemFromEnv(TOSS_MTLS_CERT_PEM);
  const key = pemFromEnv(TOSS_MTLS_KEY_PEM);
  if (!cert || !key) return undefined;
  return Deno.createHttpClient({ cert, key });
}

/**
 * generate-token 바디의 referrer는 실앱 `DEFAULT`, 샌드박스 `sandbox`(소문자)만 유효.
 * SDK 타입은 `SANDBOX` · 쿼리는 `appsintoss.{appName}` 형태일 수 있어 토스 스펙에 맞게 맞춤.
 * @see https://developers-apps-in-toss.toss.im/login/develop.html
 */
function normalizeReferrerForTossGenerateToken(referrer: string): string {
  const raw = referrer.trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  if (lower === 'sandbox') return 'sandbox';
  if (raw === 'DEFAULT' || lower === 'default') return 'DEFAULT';
  if (lower.startsWith('appsintoss.')) return 'DEFAULT';
  return raw;
}

function tossPartnerHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (TOSS_CLIENT_ID && TOSS_CLI_SECRET) {
    const basic = btoa(`${TOSS_CLIENT_ID}:${TOSS_CLI_SECRET}`);
    headers.Authorization = `Basic ${basic}`;
  }
  return headers;
}

async function tossFetch(
  url: string,
  init: RequestInit,
  tossClient: TossEdgeHttpClient | undefined,
): Promise<Response> {
  if (tossClient) {
    return await fetch(url, { ...init, client: tossClient });
  }
  return await fetch(url, init);
}

/**
 * 클라이언트가 supabase.functions.invoke 시 자동으로 실어 보내는
 * Authorization: Bearer <Supabase JWT> 로 auth.users.id(sub)를 조회한다.
 * RLS의 auth.uid()와 public.users.auth_user_id를 일치시키기 위함.
 */
async function getSupabaseAuthUserId(req: Request): Promise<string | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const jwt = header.slice('Bearer '.length).trim();
  if (!jwt || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user?.id) return null;
  return user.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const tossTlsClient = getTossHttpClient();

  try {
    const { authorizationCode, referrer } = await req.json() as {
      authorizationCode: string;
      referrer: string;
    };

    if (!authorizationCode) {
      return jsonRes({ error: 'authorizationCode is required' }, { status: 400 });
    }
    if (referrer == null || referrer === '') {
      return jsonRes({ error: 'referrer is required' }, { status: 400 });
    }

    if (!TOSS_CLIENT_ID.trim() || !TOSS_CLI_SECRET.trim()) {
      return jsonRes(
        {
          error:
            'TOSS_CLIENT_ID/TOSS_CLI_SECRET 미설정: Supabase Edge Secrets 또는 supabase/.edge-secrets.source.env → npm run secrets:edge 후 함수 재배포',
        },
        { status: 500 },
      );
    }

    const tossReferrer = normalizeReferrerForTossGenerateToken(referrer);
    if (tossReferrer !== referrer.trim()) {
      console.info('[auth-token-exchange] referrer normalized for generate-token', {
        from: referrer,
        to: tossReferrer,
      });
    }
    console.info('[auth-token-exchange]', {
      referrer: tossReferrer,
      codeLength: authorizationCode.length,
      hasMtls: Boolean(pemFromEnv(TOSS_MTLS_CERT_PEM) && pemFromEnv(TOSS_MTLS_KEY_PEM)),
    });

    // 1) 인가 코드 → AccessToken (공식 스펙: JSON body만, 콘솔 연동 시 Basic 선택)
    const tokenUrl = `${APPS_IN_TOSS_API_BASE}${GENERATE_TOKEN_PATH}`;
    const tokenRes = await tossFetch(
      tokenUrl,
      {
        method: 'POST',
        headers: tossPartnerHeaders(),
        body: JSON.stringify({
          authorizationCode,
          referrer: tossReferrer,
        }),
      },
      tossTlsClient,
    );

    const tokenJson = (await tokenRes.json()) as unknown;

    if (!tokenRes.ok) {
      return jsonRes(
        { error: 'Toss generate-token HTTP error', detail: tokenJson },
        { status: 502 },
      );
    }

    if (
      typeof tokenJson === 'object' &&
      tokenJson !== null &&
      'error' in tokenJson &&
      (tokenJson as { error?: string }).error === 'invalid_grant'
    ) {
      console.warn('[auth-token-exchange] toss generate-token invalid_grant', JSON.stringify(tokenJson));
      const raw = tokenJson as { error?: string; error_description?: string };
      const desc = raw.error_description?.trim();
      const error =
        desc && desc.length > 0
          ? `invalid_grant: ${desc}`
          : 'invalid_grant: 인가코드 만료·재사용, 미니앱·콘솔과 다른 Client ID/Secret, referrer 불일치 등 (실토스는 referrer=DEFAULT + 라이브 OAuth·mTLS)';
      return jsonRes({ error, code: 'invalid_grant', detail: tokenJson }, { status: 401 });
    }

    const tokenWrap = tokenJson as ITossSuccessWrapper<{
      accessToken: string;
      refreshToken?: string;
      tokenType?: string;
      expiresIn?: number;
      scope?: string;
    }>;

    if (tokenWrap.resultType !== 'SUCCESS' || !tokenWrap.success?.accessToken) {
      return jsonRes(
        {
          error: tokenWrap.error?.reason ?? 'Toss generate-token failed',
          errorCode: tokenWrap.error?.errorCode,
          detail: tokenJson,
        },
        { status: 502 },
      );
    }

    const accessToken = tokenWrap.success.accessToken;

    // 2) AccessToken → userKey (login-me)
    const meUrl = `${APPS_IN_TOSS_API_BASE}${LOGIN_ME_PATH}`;
    const meRes = await tossFetch(
      meUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
      tossTlsClient,
    );

    const meJson = (await meRes.json()) as unknown;

    if (!meRes.ok) {
      return jsonRes(
        { error: 'Toss login-me HTTP error', detail: meJson },
        { status: 502 },
      );
    }

    const meWrap = meJson as ITossSuccessWrapper<ITossLoginMeSuccess>;

    if (meWrap.resultType !== 'SUCCESS' || meWrap.success?.userKey == null) {
      return jsonRes(
        {
          error: meWrap.error?.reason ?? 'Toss login-me failed',
          errorCode: meWrap.error?.errorCode,
          detail: meJson,
        },
        { status: 502 },
      );
    }

    const profile = meWrap.success;
    const tossUserKey = profile.userKey;

    let decryptedDisplayName: string | null = null;
    if (TOSS_USER_INFO_AES_KEY_BASE64 && TOSS_USER_INFO_AAD) {
      decryptedDisplayName = await tryDecryptTossLoginField(
        profile.name,
        TOSS_USER_INFO_AES_KEY_BASE64,
        TOSS_USER_INFO_AAD,
      );
    }

    // 3) Supabase: toss_user_key 기준 upsert + (가능하면) auth_user_id 연결
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authUserId = await getSupabaseAuthUserId(req);

    // 동일 auth_user_id가 다른 행에 남아 있으면 uq_users_auth_user_id 위배 → 먼저 해제
    if (authUserId) {
      await supabase
        .from('users')
        .update({ auth_user_id: null })
        .eq('auth_user_id', authUserId);
    }

    const upsertPayload: Record<string, unknown> = {
      toss_user_key: tossUserKey,
      updated_at: new Date().toISOString(),
    };
    if (authUserId) {
      upsertPayload.auth_user_id = authUserId;
    }
    if (decryptedDisplayName?.trim()) {
      upsertPayload.display_name = decryptedDisplayName.trim().slice(0, 200);
    }

    const { data: user, error: upsertError } = await supabase
      .from('users')
      .upsert(upsertPayload, { onConflict: 'toss_user_key' })
      .select()
      .single();

    if (upsertError) {
      return jsonRes({ error: upsertError.message }, { status: 500 });
    }

    return jsonRes({
      accessToken,
      tossUserKey,
      user,
      authLinked: Boolean(authUserId),
      /** name 필드 복호화 성공 시 true (키/AAD 미설정이면 false) */
      profileNameDecrypted: Boolean(decryptedDisplayName?.trim()),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonRes({ error: message }, { status: 500 });
  } finally {
    tossTlsClient?.close();
  }
});
