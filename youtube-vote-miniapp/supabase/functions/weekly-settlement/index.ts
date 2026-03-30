/**
 * 운영 스케줄(pg_cron / Supabase Scheduled)에서 호출.
 * `try_run_weekly_settlement_kst` RPC 실행 → 정산 + mv_live_ranking 갱신.
 * (RPC는 KST 월요일 00:00~06:00 점검 창 안에서만 실제 처리)
 *
 * Secret: `CRON_SECRET` 설정 시 `Authorization: Bearer <CRON_SECRET>` 필수.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APPS_IN_TOSS_API_BASE = 'https://apps-in-toss-api.toss.im';
const DEFAULT_EXECUTE_PROMOTION_PATH = '/api-partner/v1/apps-in-toss/promotion/execute';

const TOSS_PROMOTION_EXECUTE_URL =
  Deno.env.get('TOSS_PROMOTION_EXECUTE_URL') ??
  `${APPS_IN_TOSS_API_BASE}${DEFAULT_EXECUTE_PROMOTION_PATH}`;
const TOSS_PROMOTION_CODE = Deno.env.get('TOSS_PROMOTION_CODE') ?? '';
const TOSS_CLIENT_ID = Deno.env.get('TOSS_CLIENT_ID') ?? '';
const TOSS_CLIENT_SECRET = Deno.env.get('TOSS_CLIENT_SECRET') ?? '';
const TOSS_MTLS_CERT_PEM = Deno.env.get('TOSS_MTLS_CERT_PEM') ?? '';
const TOSS_MTLS_KEY_PEM = Deno.env.get('TOSS_MTLS_KEY_PEM') ?? '';
const PAYOUT_DRY_RUN = Deno.env.get('PAYOUT_DRY_RUN') === 'true';

type SettlementResult = {
  applied?: boolean;
  week_id?: string;
  reason?: string;
  [key: string]: unknown;
};

type PayoutRow = {
  id: string;
  week_id: string;
  user_id: string;
  amount: number;
  payout_role: 'creator' | 'voter_1' | 'voter_2';
  idempotency_key: string;
  users: { toss_user_key: number } | null;
};

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

function tossPartnerHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (TOSS_CLIENT_ID && TOSS_CLIENT_SECRET) {
    headers.Authorization = `Basic ${btoa(`${TOSS_CLIENT_ID}:${TOSS_CLIENT_SECRET}`)}`;
  }
  return headers;
}

async function tossFetch(
  url: string,
  init: RequestInit,
  tossClient: TossEdgeHttpClient | undefined,
): Promise<Response> {
  if (tossClient) return await fetch(url, { ...init, client: tossClient });
  return await fetch(url, init);
}

async function settleIfNeeded(supabase: any): Promise<SettlementResult> {
  const { data, error } = await supabase.rpc('try_run_weekly_settlement_kst');
  if (error) throw new Error(error.message);
  return (data ?? {}) as SettlementResult;
}

async function enqueuePayoutsForWeek(
  supabase: any,
  weekId: string | undefined,
): Promise<unknown> {
  if (!weekId) return null;
  const { data, error } = await supabase.rpc('enqueue_weekly_prize_payouts', { p_week_id: weekId });
  if (error) throw new Error(`enqueue_weekly_prize_payouts failed: ${error.message}`);
  return data;
}

async function loadPendingPayouts(
  supabase: any,
): Promise<PayoutRow[]> {
  const { data, error } = await supabase
    .from('prize_payouts')
    .select(
      'id, week_id, user_id, amount, payout_role, idempotency_key, users!inner(toss_user_key)',
    )
    .in('status', ['pending', 'failed'])
    .order('requested_at', { ascending: true })
    .limit(30);

  if (error) throw new Error(`load pending payouts failed: ${error.message}`);
  return (data ?? []) as unknown as PayoutRow[];
}

async function markProcessing(supabase: any, payoutId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('prize_payouts')
    .update({ status: 'processing', error_message: null })
    .eq('id', payoutId)
    .in('status', ['pending', 'failed'])
    .select('id')
    .maybeSingle();
  return !error && Boolean(data?.id);
}

async function markPayoutDone(
  supabase: any,
  payoutId: string,
  ok: boolean,
  providerRef: string | null,
  errorMessage: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('prize_payouts')
    .update({
      status: ok ? 'succeeded' : 'failed',
      provider_ref: providerRef,
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    })
    .eq('id', payoutId);

  if (error) {
    throw new Error(`mark payout done failed: ${error.message}`);
  }
}

async function executePromotionPayout(
  payout: PayoutRow,
  tossClient: TossEdgeHttpClient | undefined,
): Promise<{ ok: boolean; providerRef: string | null; errorMessage: string | null }> {
  if (payout.amount <= 0) {
    return { ok: true, providerRef: 'zero-amount', errorMessage: null };
  }

  if (PAYOUT_DRY_RUN) {
    return { ok: true, providerRef: 'dry-run', errorMessage: null };
  }

  if (!TOSS_PROMOTION_CODE) {
    return { ok: false, providerRef: null, errorMessage: 'MISSING_TOSS_PROMOTION_CODE' };
  }
  if (!payout.users?.toss_user_key) {
    return { ok: false, providerRef: null, errorMessage: 'MISSING_TOSS_USER_KEY' };
  }

  const body = {
    promotionCode: TOSS_PROMOTION_CODE,
    userKey: payout.users.toss_user_key,
    amount: payout.amount,
    idempotencyKey: payout.idempotency_key,
  };

  const res = await tossFetch(
    TOSS_PROMOTION_EXECUTE_URL,
    {
      method: 'POST',
      headers: tossPartnerHeaders(),
      body: JSON.stringify(body),
    },
    tossClient,
  );

  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  const resultType = parsed?.resultType;
  if (!res.ok || (resultType && resultType !== 'SUCCESS')) {
    return {
      ok: false,
      providerRef: null,
      errorMessage: `PROMOTION_EXECUTE_FAILED(${res.status}): ${text.slice(0, 500)}`,
    };
  }

  const success = (parsed?.success ?? null) as Record<string, unknown> | null;
  const providerRef = String(success?.executionId ?? success?.id ?? parsed?.transactionId ?? 'ok');
  return { ok: true, providerRef, errorMessage: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tossClient = getTossHttpClient();

  try {
    const settlement = await settleIfNeeded(supabase);
    const weekId = typeof settlement.week_id === 'string' ? settlement.week_id : undefined;
    const enqueueResult = await enqueuePayoutsForWeek(supabase, weekId);

    const pending = await loadPendingPayouts(supabase);
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const payout of pending) {
      const locked = await markProcessing(supabase, payout.id);
      if (!locked) continue;

      processed += 1;
      try {
        const result = await executePromotionPayout(payout, tossClient);
        await markPayoutDone(supabase, payout.id, result.ok, result.providerRef, result.errorMessage);
        if (result.ok) succeeded += 1;
        else failed += 1;
      } catch (e) {
        failed += 1;
        const message = e instanceof Error ? e.message : 'UNKNOWN_PAYOUT_ERROR';
        await markPayoutDone(supabase, payout.id, false, null, message);
      }
    }

    return new Response(
      JSON.stringify({
        settlement,
        enqueueResult,
        payout: {
          dryRun: PAYOUT_DRY_RUN,
          attempted: pending.length,
          processed,
          succeeded,
          failed,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    tossClient?.close();
  }
});
