/**
 * 토스 프로모션 get-key 엔드포인트 가용성 확인(클라이언트 인증서 없음 → TLS/401 등 예상).
 * 실제 지급 테스트는 mTLS + 유효 x-toss-user-key + 콘솔 프로모션 코드가 필요합니다.
 *
 * 실행: node scripts/toss-promotion-api-smoke.mjs
 */
const url = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key';

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-toss-user-key': '0',
    },
    body: '{}',
  });
  const text = await res.text();
  console.log('HTTP', res.status, text.slice(0, 200));
} catch (e) {
  console.log('fetch error (mTLS 필요 시 정상):', e instanceof Error ? e.message : e);
}
