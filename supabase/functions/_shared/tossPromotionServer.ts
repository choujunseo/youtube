/**
 * 앱인토스 파트너 프로모션 S2S API (mTLS).
 * @see https://developers-apps-in-toss.toss.im/bedrock/reference/framework/비게임/promotion.md
 */
import { isTossMtlsConfigured, tossPartnerFetch } from './tossMtlsClient.ts';

const BASE = 'https://apps-in-toss-api.toss.im';

interface ITossPromotionEnvelope<T> {
  resultType: string;
  success?: T;
  error?: { errorCode?: string; reason?: string };
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export interface IGrantTossPromotionResult {
  ok: boolean;
  /** execution-result 가 SUCCESS 가 아닐 때 */
  errorMessage?: string;
}

/**
 * get-key → execute-promotion → execution-result 폴링(최대 ~20초).
 */
export async function grantTossPromotionPoints(
  tossUserKey: string,
  promotionCode: string,
  amount: number,
): Promise<IGrantTossPromotionResult> {
  if (!isTossMtlsConfigured()) {
    return { ok: false, errorMessage: 'mTLS not configured' };
  }
  if (!promotionCode.trim()) {
    return { ok: false, errorMessage: 'promotionCode empty' };
  }
  if (amount < 1) {
    return { ok: false, errorMessage: 'amount must be >= 1' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-toss-user-key': String(tossUserKey),
  };

  const keyRes = await tossPartnerFetch(
    `${BASE}/api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key`,
    { method: 'POST', headers, body: '{}' },
  );
  const keyText = await keyRes.text();
  const keyJson = parseJson<ITossPromotionEnvelope<{ key: string }>>(keyText);
  if (
    !keyRes.ok ||
    !keyJson ||
    keyJson.resultType !== 'SUCCESS' ||
    typeof keyJson.success?.key !== 'string'
  ) {
    return { ok: false, errorMessage: keyText.slice(0, 500) || `get-key HTTP ${keyRes.status}` };
  }
  const promoKey = keyJson.success.key;

  const exRes = await tossPartnerFetch(
    `${BASE}/api-partner/v1/apps-in-toss/promotion/execute-promotion`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ promotionCode, key: promoKey, amount }),
    },
  );
  const exText = await exRes.text();
  const exJson = parseJson<ITossPromotionEnvelope<{ key?: string }>>(exText);
  if (!exRes.ok || !exJson || exJson.resultType !== 'SUCCESS') {
    return { ok: false, errorMessage: exText.slice(0, 500) || `execute HTTP ${exRes.status}` };
  }

  const maxAttempts = 40;
  const delayMs = 500;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    const rRes = await tossPartnerFetch(
      `${BASE}/api-partner/v1/apps-in-toss/promotion/execution-result`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ promotionCode, key: promoKey }),
      },
    );
    const rText = await rRes.text();
    const rJson = parseJson<ITossPromotionEnvelope<string>>(rText);
    if (!rRes.ok || !rJson || rJson.resultType !== 'SUCCESS') {
      continue;
    }
    const st = rJson.success;
    if (st === 'SUCCESS') return { ok: true };
    if (st === 'FAILED') {
      return { ok: false, errorMessage: 'execution-result FAILED' };
    }
  }

  return { ok: false, errorMessage: 'execution-result timeout (still PENDING)' };
}
