/**
 * pending payout_logs → 토스 프로모션 S2S 지급(mTLS) → completed / failed.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTossMtlsConfigured } from '../_shared/tossMtlsClient.ts';
import { grantTossPromotionPoints } from '../_shared/tossPromotionServer.ts';
import { sendTossSmartMessage } from '../_shared/tossSendSmartMessage.ts';

const TOSS_APP_NAME = (Deno.env.get('TOSS_APP_NAME') ?? 'idea-league').trim() || 'idea-league';
const ALLOWED_ORIGINS = new Set([
  `https://${TOSS_APP_NAME}.apps.tossmini.com`,
  `https://${TOSS_APP_NAME}.private-apps.tossmini.com`,
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')?.trim();
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-payout-worker-secret',
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

function resolvePromotionCode(reason: string): string | undefined {
  if (reason === 'GRADUATION_CREATOR' || reason === 'GRADUATION_600_CREATOR') {
    return Deno.env.get('TOSS_PROMOTION_CODE_CREATOR')?.trim();
  }
  if (reason === 'GRADUATION_VOTER' || reason === 'GRADUATION_600_FIRST_VOTER') {
    return Deno.env.get('TOSS_PROMOTION_CODE_VOTER')?.trim();
  }
  if (reason === 'FIRST_GLOBAL_VOTE_PROMO') {
    return Deno.env.get('TOSS_PROMOTION_CODE_FIRST_VOTE')?.trim();
  }
  return undefined;
}

function resolveAmount(row: { reason: string; amount: number }): number {
  if (row.amount > 0) return row.amount;
  if (row.reason === 'GRADUATION_CREATOR' || row.reason === 'GRADUATION_600_CREATOR') return 3000;
  if (row.reason === 'GRADUATION_600_FIRST_VOTER') return 1000;
  return 0;
}

function isGraduationSmartReason(reason: string): boolean {
  return (
    reason === 'GRADUATION_CREATOR' ||
    reason === 'GRADUATION_600_CREATOR' ||
    reason === 'GRADUATION_VOTER' ||
    reason === 'GRADUATION_600_FIRST_VOTER'
  );
}

function graduationSmartRole(
  reason: string,
): 'creator' | 'voter' | null {
  if (reason === 'GRADUATION_CREATOR' || reason === 'GRADUATION_600_CREATOR') return 'creator';
  if (reason === 'GRADUATION_VOTER' || reason === 'GRADUATION_600_FIRST_VOTER') return 'voter';
  return null;
}

function notificationCopy(
  row: {
    reason: string;
    amount: number;
    vote_sequence: number | null;
  },
  ideaTitle = '',
): { title: string; body: string } {
  const amt = resolveAmount(row);
  const label = (ideaTitle || '아이디어').slice(0, 200);
  if (row.reason === 'GRADUATION_CREATOR' || row.reason === 'GRADUATION_600_CREATOR') {
    return {
      title: '아이디어가 졸업했어요',
      body: `「${label}」이 600표를 달성했어요. 창작자 보상 ${amt.toLocaleString('ko-KR')}원이 토스 포인트로 지급됐어요.`,
    };
  }
  if (row.reason === 'FIRST_GLOBAL_VOTE_PROMO') {
    return {
      title: '첫 투표 보상',
      body: `첫 투표 프로모션 ${amt.toLocaleString('ko-KR')}원이 토스 포인트로 지급됐어요.`,
    };
  }
  if (row.reason === 'GRADUATION_VOTER' || row.reason === 'GRADUATION_600_FIRST_VOTER') {
    const seq = row.vote_sequence != null ? `${row.vote_sequence}번째 투표` : '투표';
    return {
      title: '투표한 아이디어가 졸업했어요',
      body: `「${label}」이 600표를 달성했어요. ${seq} 보상 ${amt.toLocaleString('ko-KR')}원이 토스 포인트로 지급됐어요.`,
    };
  }
  return {
    title: '보상 지급',
    body: `보상 ${amt.toLocaleString('ko-KR')}원이 토스 포인트로 지급됐어요.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  const secret = Deno.env.get('PAYOUT_WORKER_SECRET') ?? '';
  const hdr = req.headers.get('x-payout-worker-secret');
  if (secret && hdr !== secret) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response('Server misconfigured', { status: 500, headers: corsHeaders(req) });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  /** 한 번에 너무 많이 호출하면 토스 측 지연·타임아웃이 늘 수 있어 40~80 정도 권장 */
  const limit = 60;

  const { data: rows, error: qErr } = await admin
    .from('payout_logs')
    .select('id, idea_id, user_id, reason, amount, status, vote_sequence')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (qErr) {
    console.error(qErr);
    return new Response(qErr.message, { status: 500, headers: corsHeaders(req) });
  }

  const mtlsOk = isTossMtlsConfigured();

  let processed = 0;
  const skipSmartMessage = Deno.env.get('TOSS_SMART_MESSAGE_SKIP') === 'true';

  for (const row of rows ?? []) {
    let creatorIdeaTitle: string | null = null;

    if (row.reason === 'GRADUATION_600_CREATOR' || row.reason === 'GRADUATION_CREATOR') {
      const { data: ideaRow, error: ideaErr } = await admin
        .from('ideas')
        .select('creator_payout_forfeited, title')
        .eq('id', row.idea_id)
        .maybeSingle();
      creatorIdeaTitle = ideaRow?.title?.trim() ?? null;
      if (ideaErr) {
        console.error(ideaErr);
        continue;
      }
      if (ideaRow?.creator_payout_forfeited === true) {
        await admin
          .from('payout_logs')
          .update({ status: 'failed', processed_at: new Date().toISOString() })
          .eq('id', row.id);
        processed += 1;
        continue;
      }
    }

    const amount = resolveAmount(row);
    if (amount < 1) {
      await admin
        .from('payout_logs')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('id', row.id);
      processed += 1;
      continue;
    }

    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('toss_user_key, is_deleted')
      .eq('id', row.user_id)
      .maybeSingle();

    if (userErr || !userRow || userRow.is_deleted || userRow.toss_user_key == null) {
      console.error('payout user lookup', userErr, row.id);
      await admin
        .from('payout_logs')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('id', row.id);
      processed += 1;
      continue;
    }

    const promotionCode = resolvePromotionCode(row.reason);
    if (!promotionCode) {
      console.error(
        'missing TOSS_PROMOTION_CODE_CREATOR|VOTER|FIRST_VOTE for',
        row.reason,
      );
      await admin
        .from('payout_logs')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('id', row.id);
      processed += 1;
      continue;
    }

    if (!mtlsOk) {
      console.error('[payout-worker] mTLS not configured, id=', row.id);
      await admin
        .from('payout_logs')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('id', row.id);
      processed += 1;
      continue;
    }

    const grant = await grantTossPromotionPoints(
      String(userRow.toss_user_key),
      promotionCode,
      amount,
    );
    const tossOk = grant.ok;
    const tossMsg = grant.errorMessage;

    if (!tossOk) {
      console.error('Toss promotion failed', row.id, tossMsg);
      await admin
        .from('payout_logs')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('id', row.id);
      processed += 1;
      continue;
    }

    const { error: uErr } = await admin
      .from('payout_logs')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (uErr) {
      console.error(uErr);
      await admin
        .from('payout_logs')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('id', row.id);
      processed += 1;
      continue;
    }

    let ideaTitleForNotif = '';
    if (isGraduationSmartReason(row.reason)) {
      if (creatorIdeaTitle != null) {
        ideaTitleForNotif = (creatorIdeaTitle || '아이디어').slice(0, 200);
      } else {
        const { data: ir } = await admin
          .from('ideas')
          .select('title')
          .eq('id', row.idea_id)
          .maybeSingle();
        ideaTitleForNotif = (ir?.title?.trim() || '아이디어').slice(0, 200);
      }
    }

    const { title, body } = notificationCopy(
      {
        reason: row.reason,
        amount: row.amount,
        vote_sequence: row.vote_sequence,
      },
      ideaTitleForNotif,
    );

    const gradRole = graduationSmartRole(row.reason);
    await admin.from('user_notifications').insert({
      user_id: row.user_id,
      kind: gradRole ? 'graduation_payout' : 'payout',
      title,
      body,
      payload: {
        idea_id: row.idea_id,
        payout_log_id: row.id,
        reason: row.reason,
        amount,
        vote_sequence: row.vote_sequence,
        ...(gradRole ? { graduation_role: gradRole, idea_title: ideaTitleForNotif } : {}),
      },
      payout_log_id: row.id,
    });

    if (gradRole && !skipSmartMessage && mtlsOk) {
      const templateCode =
        gradRole === 'creator'
          ? Deno.env.get('TOSS_SMART_TEMPLATE_GRADUATION_CREATOR')?.trim()
          : Deno.env.get('TOSS_SMART_TEMPLATE_GRADUATION_VOTER')?.trim();
      if (templateCode) {
        const smart = await sendTossSmartMessage(String(userRow.toss_user_key), templateCode);
        if (!smart.ok) {
          console.error('[payout-worker] smart message failed', row.id, smart.errorMessage);
        }
      }
    }

    processed += 1;
  }

  return new Response(JSON.stringify({ ok: true, processed, batch: (rows ?? []).length }), {
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
});
