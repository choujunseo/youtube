interface IMockLoginResult {
  authorizationCode: string;
  referrer: string;
}

export async function mockAppLogin(): Promise<IMockLoginResult> {
  return {
    authorizationCode: `mock-auth-${Date.now()}`,
    referrer: 'mock-local',
  };
}


type MockLoadEvent = { type: 'loaded' };
type MockShowEvent =
  | { type: 'requested' }
  | { type: 'show' }
  | { type: 'impression' }
  | { type: 'userEarnedReward'; data: { unitType: string; unitAmount: number } }
  | { type: 'dismissed' }
  | { type: 'failedToShow' };

export const MockGoogleAdMob = {
  /** 레거시 — tossBridge 내부에서 더 이상 사용하지 않음 */
  loadFullScreenAd: Object.assign(
    (args: { onEvent?: (event: MockLoadEvent) => void }) => {
      window.setTimeout(() => args.onEvent?.({ type: 'loaded' }), 120);
      return () => {};
    },
    { isSupported: () => true },
  ),
  showFullScreenAd: Object.assign(
    (args: { onEvent?: (event: MockShowEvent) => void }) => {
      window.setTimeout(() => args.onEvent?.({ type: 'requested' }), 20);
      window.setTimeout(() => args.onEvent?.({ type: 'show' }), 80);
      window.setTimeout(() => args.onEvent?.({ type: 'impression' }), 140);
      window.setTimeout(
        () => args.onEvent?.({ type: 'userEarnedReward', data: { unitType: 'ticket', unitAmount: 1 } }),
        280,
      );
      window.setTimeout(() => args.onEvent?.({ type: 'dismissed' }), 360);
      return () => {};
    },
    { isSupported: () => true },
  ),

  /** 공식 v2.0 API 목 구현 — tossBridge가 실제로 사용하는 함수 */
  loadAppsInTossAdMob: Object.assign(
    (args: { options?: unknown; onEvent?: (event: MockLoadEvent) => void; onError?: (e: unknown) => void }) => {
      const tid = window.setTimeout(() => args.onEvent?.({ type: 'loaded' }), 120);
      return () => window.clearTimeout(tid);
    },
    { isSupported: () => true },
  ),
  showAppsInTossAdMob: Object.assign(
    (args: { options?: unknown; onEvent?: (event: MockShowEvent) => void; onError?: (e: unknown) => void }) => {
      window.setTimeout(() => args.onEvent?.({ type: 'requested' }), 20);
      window.setTimeout(() => args.onEvent?.({ type: 'show' }), 80);
      window.setTimeout(() => args.onEvent?.({ type: 'impression' }), 140);
      window.setTimeout(
        () => args.onEvent?.({ type: 'userEarnedReward', data: { unitType: 'ticket', unitAmount: 1 } }),
        280,
      );
      window.setTimeout(() => args.onEvent?.({ type: 'dismissed' }), 360);
      return () => {};
    },
    { isSupported: () => true },
  ),
};
