/**
 * Supabase JWT만으로 public.users 탈퇴(soft-delete) 처리.
 * develop.md §6 의 remove-by-access-token 은 클라이언트에서 toss-revoke-access 로 먼저 시도하고,
 * 토스 토큰 없음·만료 시에만 이 함수로 DB 정리.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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
        error: !anonKey ? 'SUPABASE_ANON_KEY missing' : 'Server misconfigured',
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

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: rpcResult, error: rpcErr } = await admin.rpc('complete_user_withdraw', {
      p_user_id: user.id,
    });

    if (rpcErr) {
      console.error('withdraw-account complete_user_withdraw', rpcErr);
      return jsonResponse(req, 500, { error: rpcErr.message, errorCode: 'DB_WITHDRAW' });
    }

    const body = rpcResult as { ok?: boolean; error?: string } | null;
    if (!body?.ok) {
      const err = typeof body?.error === 'string' ? body.error : 'WITHDRAW_FAILED';
      return jsonResponse(req, 404, {
        error: err === 'USER_NOT_FOUND' ? '계정을 찾을 수 없어요.' : err,
        errorCode: err,
      });
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
