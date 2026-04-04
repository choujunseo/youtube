import { createClient } from 'jsr:@supabase/supabase-js@2';

interface IPayoutLog {
  id: string;
  user_id: string;
  idea_id: string;
  amount: number;
  reason: string;
  status: string;
  attempts: number;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TOSS_PROMOTION_EXECUTE_URL = Deno.env.get('TOSS_PROMOTION_EXECUTE_URL') ?? '';
const TOSS_PROMOTION_GET_KEY_URL = Deno.env.get('TOSS_PROMOTION_GET_KEY_URL') ?? '';
const TOSS_PROMOTION_RESULT_URL = Deno.env.get('TOSS_PROMOTION_RESULT_URL') ?? '';
const TOSS_SMART_MESSAGE_SEND_URL = Deno.env.get('TOSS_SMART_MESSAGE_SEND_URL')
  ?? 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/messenger/send-message';
const TOSS_TEMPLATE_CODE_IDEA_GRADUATED_CREATOR = Deno.env.get('TOSS_TEMPLATE_CODE_IDEA_GRADUATED_CREATOR') ?? '';
const TOSS_TEMPLATE_CODE_IDEA_GRADUATED_VOTER = Deno.env.get('TOSS_TEMPLATE_CODE_IDEA_GRADUATED_VOTER') ?? '';
const TOSS_CLIENT_ID = Deno.env.get('TOSS_CLIENT_ID') ?? '';
const TOSS_CLI_SECRET =
  Deno.env.get('TOSS_CLI_SECRET') ?? Deno.env.get('TOSS_CLIENT_SECRET') ?? '';
const TOSS_MTLS_CERT_PEM = Deno.env.get('TOSS_MTLS_CERT_PEM') ?? '';
const TOSS_MTLS_KEY_PEM = Deno.env.get('TOSS_MTLS_KEY_PEM') ?? '';
const PAYOUT_DRY_RUN = (Deno.env.get('PAYOUT_DRY_RUN') ?? 'false').toLowerCase() === 'true';
const PAYOUT_WORKER_SECRET = Deno.env.get('PAYOUT_WORKER_SECRET') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-worker-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resolvePromotionCode(reason: string): string {
  switch (reason) {
    case 'MILESTONE_FIRST_VOTE_PROMO_5':
      return Deno.env.get('TOSS_PROMOTION_CODE_FIRST_VOTE_5') ?? '';
    case 'MILESTONE_600_CREATOR':
      return Deno.env.get('TOSS_PROMOTION_CODE_MILESTONE_600_CREATOR') ?? '';
    case 'MILESTONE_600_RANK_1':
      return Deno.env.get('TOSS_PROMOTION_CODE_MILESTONE_600_RANK_1') ?? '';
    case 'MILESTONE_600_RANK_150':
      return Deno.env.get('TOSS_PROMOTION_CODE_MILESTONE_600_RANK_150') ?? '';
    case 'MILESTONE_600_RANK_300':
      return Deno.env.get('TOSS_PROMOTION_CODE_MILESTONE_600_RANK_300') ?? '';
    case 'MILESTONE_600_RANK_450':
      return Deno.env.get('TOSS_PROMOTION_CODE_MILESTONE_600_RANK_450') ?? '';
    case 'MILESTONE_600_RANK_600':
      return Deno.env.get('TOSS_PROMOTION_CODE_MILESTONE_600_RANK_600') ?? '';
    case 'MILESTONE_600_GENERAL_1':
      return Deno.env.get('TOSS_PROMOTION_CODE_MILESTONE_600_GENERAL_1') ?? '';
    default:
      return '';
  }
}

function buildTxKey(payoutLogId: string): string {
  return `payout-log:${payoutLogId}`;
}

function pemFromEnv(raw: string): string {
  if (!raw) return '';
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

function tossPartnerHeaders(userKey: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-toss-user-key': userKey,
  };
  if (TOSS_CLIENT_ID && TOSS_CLI_SECRET) {
    headers.Authorization = `Basic ${btoa(`${TOSS_CLIENT_ID}:${TOSS_CLI_SECRET}`)}`;
  }
  return headers;
}

function isAuthorized(req: Request): boolean {
  if (!PAYOUT_WORKER_SECRET) return true;
  const value = req.headers.get('x-worker-secret') ?? '';
  return value === PAYOUT_WORKER_SECRET;
}

function resolveNotificationTemplateCode(reason: string): string {
  if (reason === 'MILESTONE_600_CREATOR') return TOSS_TEMPLATE_CODE_IDEA_GRADUATED_CREATOR;
  if (reason.startsWith('MILESTONE_600_')) return TOSS_TEMPLATE_CODE_IDEA_GRADUATED_VOTER;
  return '';
}

function parseVoteRank(reason: string): string {
  const rank = reason.replace('MILESTONE_600_RANK_', '');
  if (/^\d+$/.test(rank)) return rank;
  return '';
}

function buildGraduationInAppCopy(
  reason: string,
  ideaTitle: string,
  amount: number,
): { title: string; body: string } {
  const idea = ideaTitle.trim() || '아이디어';
  const amountStr = `${amount.toLocaleString('ko-KR')}원`;
  if (reason === 'MILESTONE_600_CREATOR') {
    return {
      title: '졸업 축하 보상이 지급됐어요',
      body: `「${idea}」이(가) 600표를 달성해 창작자 보상 ${amountStr}이 지급됐어요.`,
    };
  }
  const rank = parseVoteRank(reason);
  if (rank) {
    return {
      title: '졸업 투표 보상이 지급됐어요',
      body: `「${idea}」 졸업 투표 ${rank}번째 달성 보상 ${amountStr}이 지급됐어요.`,
    };
  }
  if (reason === 'MILESTONE_600_GENERAL_1') {
    return {
      title: '졸업 이벤트 보상이 지급됐어요',
      body: `「${idea}」 졸업을 기념해 보상 ${amountStr}이 지급됐어요.`,
    };
  }
  return {
    title: '졸업 관련 보상이 지급됐어요',
    body: `「${idea}」과(와) 관련해 ${amountStr}이 지급됐어요.`,
  };
}

async function executePromotion(
  getKeyUrl: string,
  executeUrl: string,
  resultUrl: string,
  promotionCode: string,
  tossUserKey: string,
  payoutLog: IPayoutLog,
): Promise<{ ok: boolean; txKey: string; response: unknown; error?: string }> {
  const txKey = buildTxKey(payoutLog.id);
  const cert = pemFromEnv(TOSS_MTLS_CERT_PEM);
  const key = pemFromEnv(TOSS_MTLS_KEY_PEM);
  const client = cert && key ? Deno.createHttpClient({ cert, key }) : undefined;

  const commonInit = {
    method: 'POST',
    headers: tossPartnerHeaders(tossUserKey),
  } as RequestInit;

  const getKeyRes = await fetch(getKeyUrl, {
    ...commonInit,
    body: JSON.stringify({}),
    ...(client ? { client } : {}),
  });

  const getKeyJson = await getKeyRes.json().catch(() => null);
  const issuedKey = typeof getKeyJson === 'object' && getKeyJson && 'success' in getKeyJson
    ? (getKeyJson as { success?: { key?: string } }).success?.key ?? ''
    : '';
  if (!getKeyRes.ok || !issuedKey) {
    client?.close();
    return {
      ok: false,
      txKey,
      response: { step: 'get-key', detail: getKeyJson },
      error: `GET_KEY_FAILED_${getKeyRes.status}`,
    };
  }

  const body = {
    promotionCode,
    key: issuedKey,
    amount: payoutLog.amount,
  };

  const res = await fetch(executeUrl, {
    ...commonInit,
    body: JSON.stringify(body),
    ...(client ? { client } : {}),
  });

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    client?.close();
    return {
      ok: false,
      txKey,
      response: { step: 'execute-promotion', detail: parsed, key: issuedKey },
      error: `PROMOTION_HTTP_${res.status}`,
    };
  }

  const resultRes = await fetch(resultUrl, {
    ...commonInit,
    body: JSON.stringify({ promotionCode, key: issuedKey }),
    ...(client ? { client } : {}),
  });
  const resultJson = await resultRes.json().catch(() => null);
  client?.close();

  const executionStatus = typeof resultJson === 'object' && resultJson && 'success' in resultJson
    ? (resultJson as { success?: string }).success
    : null;
  if (!resultRes.ok || executionStatus !== 'SUCCESS') {
    return {
      ok: false,
      txKey,
      response: { step: 'execution-result', detail: resultJson, key: issuedKey },
      error: `EXECUTION_RESULT_${executionStatus ?? resultRes.status}`,
    };
  }

  return {
    ok: true,
    txKey,
    response: {
      executePromotion: parsed,
      executionResult: resultJson,
      key: issuedKey,
    },
  };
}

async function sendGraduationNotification(args: {
  tossUserKey: string;
  templateSetCode: string;
  ideaTitle: string;
  reason: string;
  amount: number;
}): Promise<{ ok: boolean; response: unknown; error?: string }> {
  const cert = pemFromEnv(TOSS_MTLS_CERT_PEM);
  const key = pemFromEnv(TOSS_MTLS_KEY_PEM);
  const client = cert && key ? Deno.createHttpClient({ cert, key }) : undefined;
  const voteRank = parseVoteRank(args.reason);
  const payload = {
    templateSetCode: args.templateSetCode,
    context: {
      ideaTitle: args.ideaTitle || '아이디어',
      milestoneVoteCount: '600',
      rewardAmount: String(args.amount),
      voteRank,
    },
  };

  const res = await fetch(TOSS_SMART_MESSAGE_SEND_URL, {
    method: 'POST',
    headers: tossPartnerHeaders(args.tossUserKey),
    body: JSON.stringify(payload),
    ...(client ? { client } : {}),
  });
  const json = await res.json().catch(() => null);
  client?.close();

  if (!res.ok) {
    return { ok: false, response: json, error: `SEND_MESSAGE_HTTP_${res.status}` };
  }
  const resultType = typeof json === 'object' && json && 'resultType' in json
    ? (json as { resultType?: string }).resultType
    : null;
  if (resultType !== 'SUCCESS') {
    return { ok: false, response: json, error: `SEND_MESSAGE_${resultType ?? 'UNKNOWN'}` };
  }
  return { ok: true, response: json };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return Response.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: CORS_HEADERS });
  }

  if (!isAuthorized(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ success: false, error: 'Missing Supabase env' }, { status: 500, headers: CORS_HEADERS });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: claimed, error: claimError } = await admin.rpc('claim_payout_logs_for_processing', {
    p_batch_size: 20,
    p_stale_seconds: 300,
  });

  if (claimError) {
    return Response.json({ success: false, error: claimError.message }, { status: 500, headers: CORS_HEADERS });
  }

  const logs = (claimed ?? []) as IPayoutLog[];
  const results: Array<{ id: string; status: 'paid' | 'failed'; reason?: string }> = [];

  for (const log of logs) {
    const promotionCode = resolvePromotionCode(log.reason);
    if (!promotionCode) {
      await admin.rpc('mark_payout_log_failed', {
        p_payout_log_id: log.id,
        p_error: 'PROMOTION_CODE_NOT_CONFIGURED',
        p_provider_response: { reason: log.reason },
      });
      results.push({ id: log.id, status: 'failed', reason: 'PROMOTION_CODE_NOT_CONFIGURED' });
      continue;
    }

    if (PAYOUT_DRY_RUN) {
      await admin.rpc('mark_payout_log_paid', {
        p_payout_log_id: log.id,
        p_provider_tx_key: `${buildTxKey(log.id)}:dry-run`,
        p_provider_response: { dryRun: true, promotionCode, reason: log.reason },
      });
      results.push({ id: log.id, status: 'paid' });
      continue;
    }

    if (!TOSS_PROMOTION_GET_KEY_URL || !TOSS_PROMOTION_EXECUTE_URL || !TOSS_PROMOTION_RESULT_URL) {
      await admin.rpc('mark_payout_log_failed', {
        p_payout_log_id: log.id,
        p_error: 'MISSING_TOSS_PROMOTION_API_URLS',
        p_provider_response: { reason: log.reason },
      });
      results.push({ id: log.id, status: 'failed', reason: 'MISSING_TOSS_PROMOTION_API_URLS' });
      continue;
    }

    const { data: userRow } = await admin
      .from('users')
      .select('toss_user_key')
      .eq('id', log.user_id)
      .maybeSingle();
    const tossUserKey = userRow?.toss_user_key ? String(userRow.toss_user_key) : '';
    if (!tossUserKey) {
      await admin.rpc('mark_payout_log_failed', {
        p_payout_log_id: log.id,
        p_error: 'MISSING_TOSS_USER_KEY',
        p_provider_response: { userId: log.user_id },
      });
      results.push({ id: log.id, status: 'failed', reason: 'MISSING_TOSS_USER_KEY' });
      continue;
    }

    try {
      const execResult = await executePromotion(
        TOSS_PROMOTION_GET_KEY_URL,
        TOSS_PROMOTION_EXECUTE_URL,
        TOSS_PROMOTION_RESULT_URL,
        promotionCode,
        tossUserKey,
        log,
      );
      if (execResult.ok) {
        const templateSetCode = resolveNotificationTemplateCode(log.reason);
        const { data: ideaRow } = await admin
          .from('ideas')
          .select('title')
          .eq('id', log.idea_id)
          .maybeSingle();
        const ideaTitle = (ideaRow?.title as string | undefined) ?? '';
        let notification: Record<string, unknown> | null = null;
        let smartMessageDelivered = false;
        if (templateSetCode) {
          const sent = await sendGraduationNotification({
            tossUserKey,
            templateSetCode,
            ideaTitle,
            reason: log.reason,
            amount: log.amount,
          });
          smartMessageDelivered = sent.ok;
          notification = sent.ok
            ? { success: true, templateSetCode, response: sent.response }
            : { success: false, templateSetCode, error: sent.error, response: sent.response };
        }

        await admin.rpc('mark_payout_log_paid', {
          p_payout_log_id: log.id,
          p_provider_tx_key: execResult.txKey,
          p_provider_response: {
            promotion: execResult.response,
            notification,
          },
        });

        if (templateSetCode && smartMessageDelivered) {
          const copy = buildGraduationInAppCopy(log.reason, ideaTitle, log.amount);
          const { error: inboxErr } = await admin.from('user_notifications').insert({
            user_id: log.user_id,
            kind: 'MILESTONE_600_GRADUATION',
            title: copy.title,
            body: copy.body,
            payout_log_id: log.id,
            payload: {
              idea_id: log.idea_id,
              reason: log.reason,
              template_set_code: templateSetCode,
            },
          });
          if (inboxErr) {
            console.error('user_notifications insert failed', inboxErr.message);
          }
        }
        results.push({ id: log.id, status: 'paid' });
      } else {
        await admin.rpc('mark_payout_log_failed', {
          p_payout_log_id: log.id,
          p_error: execResult.error ?? 'PROMOTION_EXECUTE_FAILED',
          p_provider_response: execResult.response,
        });
        results.push({ id: log.id, status: 'failed', reason: execResult.error });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PROMOTION_EXECUTE_EXCEPTION';
      await admin.rpc('mark_payout_log_failed', {
        p_payout_log_id: log.id,
        p_error: message,
        p_provider_response: {},
      });
      results.push({ id: log.id, status: 'failed', reason: message });
    }
  }

  return Response.json(
    {
      success: true,
      dryRun: PAYOUT_DRY_RUN,
      claimedCount: logs.length,
      processed: results,
    },
    { status: 200, headers: CORS_HEADERS },
  );
});
