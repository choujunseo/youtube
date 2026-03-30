import { createClient } from 'jsr:@supabase/supabase-js@2';

type TossDisconnectReferrer = 'UNLINK' | 'WITHDRAWAL_TERMS' | 'WITHDRAWAL_TOSS';

interface TossDisconnectBody {
  userKey?: number | string;
  referrer?: TossDisconnectReferrer;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TOSS_WEBHOOK_SECRET = Deno.env.get('TOSS_WEBHOOK_SECRET') ?? '';

/**
 * Authorization: Basic … 디코드 값이 secret 단독이거나 "아무값:secret" 형태면 허용.
 */
function verifyBasicAuth(authorizationHeader: string | null): boolean {
  if (!authorizationHeader || !authorizationHeader.startsWith('Basic ')) {
    return false;
  }
  const encoded = authorizationHeader.slice('Basic '.length).trim();
  if (!encoded || !TOSS_WEBHOOK_SECRET) return false;

  try {
    const decoded = atob(encoded);
    if (decoded === TOSS_WEBHOOK_SECRET) return true;

    const colonIndex = decoded.indexOf(':');
    if (colonIndex >= 0) {
      const password = decoded.slice(colonIndex + 1);
      return password === TOSS_WEBHOOK_SECRET;
    }
    return false;
  } catch {
    return false;
  }
}

function isValidReferrer(value: unknown): value is TossDisconnectReferrer {
  return value === 'UNLINK' || value === 'WITHDRAWAL_TERMS' || value === 'WITHDRAWAL_TOSS';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return Response.json(
      { success: false, error: 'Method Not Allowed' },
      { status: 405, headers: CORS_HEADERS },
    );
  }

  if (!verifyBasicAuth(req.headers.get('Authorization'))) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  let body: TossDisconnectBody;
  try {
    body = (await req.json()) as TossDisconnectBody;
  } catch {
    return Response.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const userKeyRaw = body.userKey;
  const referrerRaw = body.referrer;

  const userKey = typeof userKeyRaw === 'string' ? Number(userKeyRaw) : userKeyRaw;
  if (!Number.isFinite(userKey)) {
    return Response.json(
      { success: false, error: 'userKey is required' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (!isValidReferrer(referrerRaw)) {
    return Response.json(
      { success: false, error: 'referrer is invalid' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json(
      { success: false, error: 'Server env is not configured' },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await admin
    .from('users')
    .update({
      toss_user_key: null,
      display_name: '탈퇴한 유저',
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      unlink_referrer: referrerRaw,
      auth_user_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('toss_user_key', userKey);

  if (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  return Response.json({ success: true }, { status: 200, headers: CORS_HEADERS });
});
