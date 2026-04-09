/**
 * Toss appLogin authorizationCode -> generate-token -> login-me -> public.users upsert.
 * 공개 닉네임(display_name)은 앱에서만 설정 — login-me의 암호화 실명(§5)은 DB에 넣지 않음.
 * 재로그인 시 기존 users.display_name(사용자가 입력한 닉네임)만 유지.
 *
 * Secrets: SUPABASE_*, TOSS_CLIENT_ID, TOSS_CLI_SECRET, TOSS_MTLS_* (선택 mTLS).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTossMtlsConfigured, tossPartnerFetch } from '../_shared/tossMtlsClient.ts';

const TOSS_BASE = 'https://apps-in-toss-api.toss.im';
const TOSS_APP_NAME = (Deno.env.get('TOSS_APP_NAME') ?? 'idea-league').trim() || 'idea-league';
const ALLOWED_ORIGINS = new Set([
  `https://${TOSS_APP_NAME}.apps.tossmini.com`,
  `https://${TOSS_APP_NAME}.private-apps.tossmini.com`,
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')?.trim();
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (!origin) {
    headers['Access-Control-Allow-Origin'] = '*';
    return headers;
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  return headers;
}

type TossTokenSuccess = {
  resultType: string;
  success?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
    tokenType?: string;
  };
  error?: { errorCode?: string; reason?: string };
};

type TossMeSuccess = {
  resultType: string;
  success?: {
    userKey: number;
    scope?: string;
    agreedTerms?: unknown;
    name?: string | null;
    [key: string]: unknown;
  };
  error?: { errorCode?: string; reason?: string };
};

type TUserGender = 'male' | 'female' | 'other' | 'unknown';

function normalizeGender(raw: unknown): TUserGender | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v === 'male' || v === 'm' || v === 'man' || v === '남' || v === '남자' || v === '남성') return 'male';
  if (v === 'female' || v === 'f' || v === 'woman' || v === '여' || v === '여자' || v === '여성') return 'female';
  if (v === 'other' || v === 'etc' || v === 'nonbinary' || v === 'non-binary') return 'other';
  if (v === 'unknown' || v === 'na' || v === 'n/a' || v === '미상') return 'unknown';
  return null;
}

function toDecade(age: number): number | null {
  if (!Number.isFinite(age)) return null;
  const n = Math.floor(age);
  if (n < 1 || n > 120) return null;
  const decade = Math.floor(n / 10) * 10;
  if (decade < 10) return 10;
  if (decade > 90) return 90;
  return decade;
}

function toNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : null;
}

function extractAgeDecadeFromMe(success: Record<string, unknown>): number | null {
  const directAgeKeys = ['age', 'userAge'];
  for (const key of directAgeKeys) {
    const n = toNumber(success[key]);
    if (n != null) {
      const d = toDecade(n);
      if (d != null) return d;
    }
  }

  const ageRangeKeys = ['ageRange', 'age_group', 'ageGroup'];
  for (const key of ageRangeKeys) {
    const raw = success[key];
    if (typeof raw !== 'string') continue;
    const m = raw.match(/(\d{2})/);
    if (m?.[1]) {
      const d = toDecade(Number(m[1]));
      if (d != null) return d;
    }
  }

  const yearKeys = ['birthYear', 'birth_year'];
  for (const key of yearKeys) {
    const year = toNumber(success[key]);
    if (year == null) continue;
    const nowYear = new Date().getFullYear();
    const age = nowYear - Math.floor(year) + 1;
    const d = toDecade(age);
    if (d != null) return d;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(req, 401, { error: 'Missing Authorization', errorCode: 'UNAUTHORIZED' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return jsonResponse(req, 500, {
        error:
          !anonKey
            ? 'SUPABASE_ANON_KEY missing — Edge에서 JWT 검증용 anon 키가 비어 있습니다. 호스팅은 자동 주입, 로컬은 supabase/.edge-secrets 또는 secrets 확인'
            : 'Server misconfigured',
        errorCode: 'CONFIG',
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user?.id) {
      return jsonResponse(req, 401, { error: 'Invalid Supabase session', errorCode: 'AUTH' });
    }

    const body = (await req.json()) as { authorizationCode?: string; referrer?: string };
    const authorizationCode = body.authorizationCode?.trim();
    const referrer = (body.referrer ?? 'DEFAULT').trim() || 'DEFAULT';
    if (!authorizationCode) {
      return jsonResponse(req, 400, { error: 'authorizationCode required', errorCode: 'BAD_REQUEST' });
    }

    const requireMtls = Deno.env.get('TOSS_PARTNER_REQUIRE_MTLS') === 'true';
    if (requireMtls && !isTossMtlsConfigured()) {
      return jsonResponse(req, 503, {
        error: 'mTLS not configured (set TOSS_MTLS_CERT_PEM + TOSS_MTLS_KEY_PEM or *_B64)',
        errorCode: 'CONFIG_MTLS',
      });
    }

    const clientId = Deno.env.get('TOSS_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('TOSS_CLI_SECRET') ?? Deno.env.get('TOSS_CLIENT_SECRET') ?? '';
    const basic =
      clientId && clientSecret
        ? `Basic ${btoa(`${clientId}:${clientSecret}`)}`
        : '';

    const tokenRes = await tossPartnerFetch(
      `${TOSS_BASE}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(basic ? { Authorization: basic } : {}),
        },
        body: JSON.stringify({ authorizationCode, referrer }),
      },
    );

    const tokenJson = (await tokenRes.json()) as TossTokenSuccess;
    if (!tokenRes.ok || tokenJson.resultType !== 'SUCCESS' || !tokenJson.success?.accessToken) {
      const msg =
        tokenJson.error?.reason ??
        (typeof (tokenJson as { error?: string }).error === 'string'
          ? (tokenJson as { error: string }).error
          : 'generate-token failed');
      return jsonResponse(req, 401, { error: msg, errorCode: tokenJson.error?.errorCode ?? 'TOKEN' });
    }

    const accessToken = tokenJson.success.accessToken;

    const meRes = await tossPartnerFetch(
      `${TOSS_BASE}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const meJson = (await meRes.json()) as TossMeSuccess;
    if (!meRes.ok || meJson.resultType !== 'SUCCESS' || meJson.success?.userKey == null) {
      const msg = meJson.error?.reason ?? 'login-me failed';
      return jsonResponse(req, 401, { error: msg, errorCode: meJson.error?.errorCode ?? 'PROFILE' });
    }

    const tossUserKey = Number(meJson.success.userKey);
    const meSuccess = meJson.success as Record<string, unknown>;
    const parsedGender =
      normalizeGender(meSuccess.gender) ??
      normalizeGender(meSuccess.sex) ??
      normalizeGender(meSuccess.userGender);
    const parsedAgeDecade = extractAgeDecadeFromMe(meSuccess);
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: cooldownRow, error: cdReadErr } = await admin
      .from('toss_withdraw_cooldowns')
      .select('withdrawn_at')
      .eq('toss_user_key', tossUserKey)
      .maybeSingle();

    if (cdReadErr) {
      console.error('toss_withdraw_cooldowns select', cdReadErr);
      return jsonResponse(req, 500, { error: cdReadErr.message, errorCode: 'DB_COOLDOWN_READ' });
    }

    if (cooldownRow?.withdrawn_at) {
      const wdMs = new Date(String(cooldownRow.withdrawn_at)).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (!Number.isNaN(wdMs) && Date.now() - wdMs < thirtyDaysMs) {
        return jsonResponse(req, 403, {
          error: '탈퇴 후 30일이 지나야 동일 토스 계정으로 다시 가입할 수 있어요.',
          errorCode: 'WITHDRAW_COOLDOWN',
        });
      }
    }

    const { data: linkedByTossKey, error: linkedReadErr } = await admin
      .from('users')
      .select('id, display_name')
      .eq('toss_user_key', tossUserKey)
      .maybeSingle();

    if (linkedReadErr) {
      console.error('users select by toss_user_key', linkedReadErr);
      return jsonResponse(req, 500, { error: linkedReadErr.message, errorCode: 'DB_USER_LOOKUP' });
    }

    // 기존 토스 계정: users.id(PK) 유지, auth_user_id만 현재 세션으로 재매핑
    if (linkedByTossKey?.id) {
      const relinkPatch = {
        auth_user_id: user.id,
        is_deleted: false,
        updated_at: new Date().toISOString(),
        ...(parsedGender ? { gender: parsedGender } : {}),
        ...(parsedAgeDecade != null ? { age_decade: parsedAgeDecade } : {}),
      };

      const { error: relinkErr } = await admin.from('users').update(relinkPatch).eq('id', linkedByTossKey.id);

      if (relinkErr) {
        console.error('users relink by toss_user_key', relinkErr);
        return jsonResponse(req, 500, { error: relinkErr.message, errorCode: 'DB_RELINK' });
      }

      const { data: relinked, error: readErr } = await admin
        .from('users')
        .select('*')
        .eq('id', linkedByTossKey.id)
        .single();

      if (readErr || !relinked) {
        console.error('users relink select', readErr);
        return jsonResponse(req, 500, { error: readErr?.message ?? 'relinked user row not found', errorCode: 'DB_RELINK_READ' });
      }

      return new Response(
        JSON.stringify({
          accessToken,
          tossUserKey,
          user: relinked,
          authLinked: true,
          profileNameDecrypted: false,
        }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    // 신규: 첫 연동 — id = auth.users id, auth_user_id 동일
    const { data: existingRow } = await admin
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    const displayName = (existingRow?.display_name != null ? String(existingRow.display_name) : '').trim();

    const upsertRow = {
      id: user.id,
      auth_user_id: user.id,
      toss_user_key: tossUserKey,
      display_name: displayName,
      ...(parsedGender ? { gender: parsedGender } : {}),
      ...(parsedAgeDecade != null ? { age_decade: parsedAgeDecade } : {}),
      is_deleted: false,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error: upErr } = await admin
      .from('users')
      .upsert(upsertRow, { onConflict: 'id' })
      .select()
      .single();

    if (upErr) {
      console.error('users upsert', upErr);
      return jsonResponse(req, 500, { error: upErr.message, errorCode: 'DB_UPSERT' });
    }

    return new Response(
      JSON.stringify({
        accessToken,
        tossUserKey,
        user: upserted,
        authLinked: true,
        profileNameDecrypted: false,
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : 'Internal error';
    return jsonResponse(req, 500, { error: msg, errorCode: 'INTERNAL' });
  }
});

function jsonResponse(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}
