/**
 * develop.md §6 — 앱에서 토스 로그인 연결 끊기
 * POST https://apps-in-toss-api.toss.im/.../access/remove-by-access-token
 * Content-Type: application/json, Authorization: Bearer ${toss_access_token}
 *
 * Supabase 세션(JWT)으로 본인 확인 후, 성공 시 public.users 토스 연동 필드 정리.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTossMtlsConfigured, tossPartnerFetch } from '../_shared/tossMtlsClient.ts';

const TOSS_BASE = 'https://apps-in-toss-api.toss.im';
const REVOKE_PATH = '/api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-access-token';

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

type TossRevokeResult = {
  resultType?: string;
  error?: string;
  success?: unknown;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, 405, { error: 'Method not allowed', errorCode: 'METHOD' });
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
            ? 'SUPABASE_ANON_KEY missing — Edge JWT 검증용 anon 키 필요'
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

    const body = (await req.json()) as { tossAccessToken?: string };
    const tossAccessToken = body.tossAccessToken?.trim();
    if (!tossAccessToken) {
      return jsonResponse(req, 400, { error: 'tossAccessToken required', errorCode: 'BAD_REQUEST' });
    }

    const requireMtls = Deno.env.get('TOSS_PARTNER_REQUIRE_MTLS') === 'true';
    if (requireMtls && !isTossMtlsConfigured()) {
      return jsonResponse(req, 503, {
        error: 'mTLS not configured (set TOSS_MTLS_CERT_PEM + TOSS_MTLS_KEY_PEM or *_B64)',
        errorCode: 'CONFIG_MTLS',
      });
    }

    const revokeRes = await tossPartnerFetch(`${TOSS_BASE}${REVOKE_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tossAccessToken}`,
      },
      body: '{}',
    });

    let revokeJson: TossRevokeResult;
    try {
      revokeJson = (await revokeRes.json()) as TossRevokeResult;
    } catch {
      console.error('toss-revoke-access: non-JSON Toss response', revokeRes.status);
      return jsonResponse(req, 502, { error: 'Invalid Toss response', errorCode: 'TOSS_REVOKE' });
    }

    if (revokeJson.resultType !== 'SUCCESS') {
      const msg =
        typeof revokeJson.error === 'string'
          ? revokeJson.error
          : (revokeJson as { error?: { reason?: string } }).error?.reason ??
            `Toss revoke failed (HTTP ${revokeRes.status})`;
      console.error('toss-revoke-access partner error', revokeRes.status, revokeJson);
      const statusOut =
        revokeRes.status === 401 || revokeRes.status === 403 || msg.includes('invalid_grant') ? 401 : 502;
      return jsonResponse(req, statusOut, { error: msg, errorCode: 'TOSS_REVOKE' });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: upErr } = await admin
      .from('users')
      .update({
        is_deleted: true,
        display_name: '',
        toss_user_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', user.id);

    if (upErr) {
      console.error('toss-revoke-access users update', upErr);
      return jsonResponse(req, 500, { error: upErr.message, errorCode: 'DB_UPDATE' });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
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
