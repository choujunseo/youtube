/**
 * 앱인토스 스마트 발송(기능성 메시지) S2S API (mTLS).
 * @see https://developers-apps-in-toss.toss.im/smart-message/develop.md
 */
import { isTossMtlsConfigured, tossPartnerFetch } from './tossMtlsClient.ts';

const BASE = 'https://apps-in-toss-api.toss.im';

interface ITossSmartMessageResponse {
  resultType: string;
  result?: {
    msgCount?: number;
    sentPushCount?: number;
    sentInboxCount?: number;
  };
  error?: { errorCode?: string; reason?: string };
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export interface ISendTossSmartMessageResult {
  ok: boolean;
  errorMessage?: string;
}

/**
 * `context`는 템플릿에 변수가 있을 때만 채움. 고정 문구만이면 `{}` 로 호출.
 */
export async function sendTossSmartMessage(
  tossUserKey: string,
  templateSetCode: string,
  context: Record<string, string> = {},
): Promise<ISendTossSmartMessageResult> {
  if (!isTossMtlsConfigured()) {
    return { ok: false, errorMessage: 'mTLS not configured' };
  }
  const code = templateSetCode.trim();
  if (!code) {
    return { ok: false, errorMessage: 'templateSetCode empty' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-toss-user-key': String(tossUserKey),
  };

  const res = await tossPartnerFetch(`${BASE}/api-partner/v1/apps-in-toss/messenger/send-message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ templateSetCode: code, context }),
  });

  const text = await res.text();
  const json = parseJson<ITossSmartMessageResponse>(text);
  if (!res.ok || !json || json.resultType !== 'SUCCESS') {
    const reason = json?.error?.reason ?? text.slice(0, 500);
    return {
      ok: false,
      errorMessage: reason || `send-message HTTP ${res.status}`,
    };
  }

  return { ok: true };
}
