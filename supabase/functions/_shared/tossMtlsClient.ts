/**
 * 앱인토스 파트너 API(https://apps-in-toss-api.toss.im)용 mTLS 클라이언트.
 * @see https://developers-apps-in-toss.toss.im/development/integration-process.md
 *
 * 인증서는 콘솔 mTLS 탭에서 발급. 시크릿은 PEM 문자열 또는 Base64(한 줄) 중 하나로 설정.
 */

function normalizePem(raw: string): string {
  return raw.trim().replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
}

function pemFromEnv(name: string): string | undefined {
  const v = Deno.env.get(name);
  if (!v?.trim()) return undefined;
  return normalizePem(v);
}

function pemFromBase64Env(name: string): string | undefined {
  const v = Deno.env.get(name)?.replace(/\s/g, '') ?? '';
  if (!v) return undefined;
  try {
    return normalizePem(atob(v));
  } catch {
    console.error(`[tossMtls] invalid base64 for ${name}`);
    return undefined;
  }
}

function loadTlsPemPair(): { cert: string; key: string } | null {
  const cert =
    pemFromEnv('TOSS_MTLS_CERT_PEM') ??
    pemFromBase64Env('TOSS_MTLS_CERT_B64');
  const key =
    pemFromEnv('TOSS_MTLS_KEY_PEM') ??
    pemFromBase64Env('TOSS_MTLS_KEY_B64');
  if (!cert || !key) return null;
  return { cert, key };
}

let httpClient: Deno.HttpClient | null | undefined;

/** mTLS 재료가 있으면 `Deno.HttpClient`, 없으면 `null` (평문 fetch). */
export function getTossPartnerHttpClient(): Deno.HttpClient | null {
  if (httpClient !== undefined) return httpClient;
  const pair = loadTlsPemPair();
  if (!pair) {
    httpClient = null;
    return null;
  }
  const caPem = pemFromEnv('TOSS_MTLS_CA_PEM');
  const opts: Deno.CreateHttpClientOptions = { cert: pair.cert, key: pair.key };
  if (caPem) opts.caCerts = [caPem];
  try {
    httpClient = Deno.createHttpClient(opts);
  } catch (e) {
    console.error('[tossMtls] createHttpClient failed', e);
    httpClient = null;
  }
  return httpClient;
}

export function isTossMtlsConfigured(): boolean {
  return getTossPartnerHttpClient() != null;
}

/** 파트너 API 호출. mTLS 시크릿이 있으면 `fetch(..., { client })` 사용. */
export async function tossPartnerFetch(input: URL | string, init?: RequestInit): Promise<Response> {
  const client = getTossPartnerHttpClient();
  if (client) {
    return await fetch(input, init ? { ...init, client } : { client });
  }
  return await fetch(input, init);
}
