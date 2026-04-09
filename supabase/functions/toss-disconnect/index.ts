/**
 * develop.md §7 콜백: GET ?userKey=&referrer= | POST JSON { userKey, referrer }
 * Basic Auth = 콘솔과 동일 (TOSS_WEBHOOK_USER / TOSS_WEBHOOK_PASSWORD)
 *
 * 콘솔 "테스트"는 브라우저에서 fetch(credentials 포함)로 호출한다.
 * Origin이 *.toss.im 이 아닌 내부/스테이징 URL이면 이전처럼 Allow-Origin:* + credentials 조합이 되어 브라우저가 전부 "failed to fetch"로 막는다.
 * → 유효한 Origin 헤더가 오면 그 값을 그대로 에코(실서버 토스→가맹점 호출은 보통 Origin 없음 → * 유지).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const KNOWN_REFERRERS = new Set(['UNLINK', 'WITHDRAWAL_TERMS', 'WITHDRAWAL_TOSS']);
const TOSS_APP_NAME = (Deno.env.get('TOSS_APP_NAME') ?? 'idea-league').trim() || 'idea-league';
const ALLOWED_ORIGINS = new Set([
  `https://${TOSS_APP_NAME}.apps.tossmini.com`,
  `https://${TOSS_APP_NAME}.private-apps.tossmini.com`,
]);

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')?.trim();
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, accept, accept-language',
    'Access-Control-Max-Age': '86400',
  };
  if (!origin) {
    h['Access-Control-Allow-Origin'] = '*';
    return h;
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h.Vary = 'Origin';
  }
  return h;
}

function unauthorized(req: Request) {
  return new Response('Unauthorized', { status: 401, headers: corsFor(req) });
}

function maskTossUserKey(value: unknown): string {
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!raw) return '***';
  if (raw.length <= 4) return `${raw.slice(0, 1)}***`;
  return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsFor(req) });
  }

  const user = Deno.env.get('TOSS_WEBHOOK_USER') ?? '';
  const pass = Deno.env.get('TOSS_WEBHOOK_PASSWORD') ?? '';
  const auth = req.headers.get('Authorization');
  if (!user || !pass || !auth?.startsWith('Basic ')) {
    return unauthorized(req);
  }
  const decoded = atob(auth.slice(6));
  const colon = decoded.indexOf(':');
  const u = colon >= 0 ? decoded.slice(0, colon) : decoded;
  const p = colon >= 0 ? decoded.slice(colon + 1) : '';
  if (u !== user || p !== pass) {
    return unauthorized(req);
  }

  let userKey: number | null = null;
  let referrer = '';

  if (req.method === 'GET') {
    const url = new URL(req.url);
    userKey = Number(url.searchParams.get('userKey'));
    referrer = url.searchParams.get('referrer') ?? '';
  } else if (req.method === 'POST') {
    try {
      const j = (await req.json()) as { userKey?: number; referrer?: string };
      userKey = j.userKey != null ? Number(j.userKey) : null;
      referrer = j.referrer ?? '';
    } catch {
      return new Response('Bad JSON', { status: 400, headers: corsFor(req) });
    }
  } else {
    return new Response('Method not allowed', { status: 405, headers: corsFor(req) });
  }

  if (!Number.isFinite(userKey)) {
    return new Response('userKey required', { status: 400, headers: corsFor(req) });
  }
  const maskedUserKey = maskTossUserKey(userKey);

  if (referrer && !KNOWN_REFERRERS.has(referrer)) {
    console.warn('toss-disconnect: unknown referrer (still unlinking)', { referrer, userKey: maskedUserKey });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response('Server misconfigured', { status: 500, headers: corsFor(req) });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { error } = await admin
    .from('users')
    .update({
      is_deleted: true,
      display_name: '',
      toss_user_key: null,
      updated_at: new Date().toISOString(),
    })
    .eq('toss_user_key', userKey!);

  if (error) {
    console.error('toss-disconnect update', { userKey: maskedUserKey, referrer, error });
    return new Response(error.message, { status: 500, headers: corsFor(req) });
  }

  console.log('toss-disconnect ok', { userKey: maskedUserKey, referrer });

  return new Response(
    JSON.stringify({ ok: true, userKeyMasked: maskedUserKey, referrer }),
    { headers: { ...corsFor(req), 'Content-Type': 'application/json' } },
  );
});
