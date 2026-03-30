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

/** 로컬: contactsViral 없이 sendViral 이벤트만 시뮬레이션 */
export function mockContactsViral(
  _moduleId: string,
  onEvent: (event: {
    type: 'sendViral';
    data: { rewardAmount: number; rewardUnit: string };
  }) => void,
  _onError: (err: unknown) => void,
): () => void {
  const t = window.setTimeout(() => {
    onEvent({ type: 'sendViral', data: { rewardAmount: 1, rewardUnit: 'MOCK' } });
  }, 320);
  return () => window.clearTimeout(t);
}

export const MockGoogleAdMob = {
  loadFullScreenAd: Object.assign(
    (args: { onEvent?: (event: { type: 'loaded' }) => void }) => {
      window.setTimeout(() => {
        args.onEvent?.({ type: 'loaded' });
      }, 120);
      return () => {};
    },
    {
      isSupported: () => true,
    },
  ),
  showFullScreenAd: Object.assign(
    (args: {
      onEvent?: (
        event:
          | { type: 'requested' }
          | { type: 'show' }
          | { type: 'impression' }
          | { type: 'userEarnedReward'; data: { unitType: string; unitAmount: number } }
          | { type: 'dismissed' },
      ) => void;
    }) => {
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
    {
      isSupported: () => true,
    },
  ),
  loadAppsInTossAdMob: Object.assign(
    (_args: unknown) => {
      return () => {};
    },
    {
      isSupported: () => true,
    },
  ),
  showAppsInTossAdMob: (_args: unknown) => undefined,
};
