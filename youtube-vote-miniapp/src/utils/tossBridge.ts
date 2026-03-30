import {
  appLogin,
  contactsViral,
  GoogleAdMob,
  loadFullScreenAd,
  showFullScreenAd,
} from '@apps-in-toss/web-framework';
import { mockAppLogin, MockGoogleAdMob, mockContactsViral } from '@/mocks/tossSdkMock';

const isMockMode = import.meta.env.DEV;
const isContactsViralMock =
  import.meta.env.DEV || import.meta.env.VITE_IS_MOCK === 'true';

export async function bridgeAppLogin() {
  return isMockMode ? mockAppLogin() : appLogin();
}

export function getGoogleAdMob() {
  return isMockMode ? MockGoogleAdMob : GoogleAdMob;
}

function isFn(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

interface ILoadFullScreenAdParams {
  options: { adGroupId: string };
  onEvent: (event: { type: 'loaded' }) => void;
  onError: (err: unknown) => void;
}

type ShowEvent =
  | { type: 'requested' }
  | { type: 'show' }
  | { type: 'impression' }
  | { type: 'clicked' }
  | { type: 'dismissed' }
  | { type: 'failedToShow' }
  | { type: 'userEarnedReward'; data: { unitType: string; unitAmount: number } };

interface IShowFullScreenAdParams {
  options: { adGroupId: string };
  onEvent: (event: ShowEvent) => void;
  onError: (err: unknown) => void;
}

function resolveIntegratedAdApi() {
  if (isMockMode) {
    return {
      loadFullScreenAd: MockGoogleAdMob.loadFullScreenAd,
      showFullScreenAd: MockGoogleAdMob.showFullScreenAd,
    };
  }
  return { loadFullScreenAd, showFullScreenAd };
}

export function isIntegratedAdSupported(): boolean {
  try {
    const { loadFullScreenAd, showFullScreenAd } = resolveIntegratedAdApi();
    if (!isFn(loadFullScreenAd) || !isFn(showFullScreenAd)) return false;

    const loadSupported = (loadFullScreenAd as Record<string, unknown>).isSupported;
    const showSupported = (showFullScreenAd as Record<string, unknown>).isSupported;

    const canLoad = isFn(loadSupported) ? (loadSupported as () => boolean)() : true;
    const canShow = isFn(showSupported) ? (showSupported as () => boolean)() : true;
    return canLoad && canShow;
  } catch {
    return false;
  }
}

export function preloadIntegratedRewardAd(
  adGroupId: string,
  onLoaded: () => void,
  onError: (err: unknown) => void,
): () => void {
  try {
    const { loadFullScreenAd } = resolveIntegratedAdApi();
    if (!isFn(loadFullScreenAd)) return () => {};

    const unregister = (loadFullScreenAd as (params: ILoadFullScreenAdParams) => unknown)({
      options: { adGroupId },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          onLoaded();
        }
      },
      onError,
    });
    return isFn(unregister) ? unregister : () => {};
  } catch (err) {
    onError(err);
    return () => {};
  }
}

/**
 * 통합 광고 show 호출 후, 실제 보상 획득(userEarnedReward) 여부를 반환.
 */
export async function showIntegratedRewardAd(adGroupId: string): Promise<boolean> {
  try {
    const { showFullScreenAd } = resolveIntegratedAdApi();
    if (!isFn(showFullScreenAd)) return false;

    return await new Promise<boolean>((resolve) => {
      let earned = false;
      let settled = false;

      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      (showFullScreenAd as (params: IShowFullScreenAdParams) => unknown)({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === 'userEarnedReward') {
            earned = true;
          }
          if (event.type === 'failedToShow') {
            settle(false);
          }
          if (event.type === 'dismissed') {
            settle(earned);
          }
        },
        onError: () => settle(false),
      });

      // 안전 장치: 환경 이슈로 dismissed가 누락되면 실패 처리
      window.setTimeout(() => settle(false), 25_000);
    });
  } catch {
    return false;
  }
}

/**
 * 하위 호환용 래퍼 (기존 호출부 유지).
 * 현재는 통합 광고 API의 adGroupId를 받는다.
 */
export type TContactsViralEvent =
  | { type: 'sendViral'; data: { rewardAmount: number; rewardUnit: string } }
  | {
      type: 'close';
      data: {
        closeReason: 'clickBackButton' | 'noReward';
        sentRewardAmount?: number;
        sendableRewardsCount?: number;
        sentRewardsCount: number;
        rewardUnit?: string;
      };
    };

/**
 * 토스 공유 리워드(contactsViral). 콘솔에 등록한 moduleId 필요.
 * @returns cleanup — 종료 후 호출 권장
 */
export function openContactsViral(
  moduleId: string,
  onEvent: (event: TContactsViralEvent) => void,
  onError: (error: unknown) => void,
): () => void {
  const id = moduleId.trim();
  if (!id) {
    onError(new Error('EMPTY_MODULE_ID'));
    return () => {};
  }

  if (isContactsViralMock) {
    return mockContactsViral(id, onEvent, onError);
  }

  try {
    const cleanup = contactsViral({
      options: { moduleId: id },
      onEvent: onEvent as (e: unknown) => void,
      onError,
    });
    return typeof cleanup === 'function' ? cleanup : () => {};
  } catch (err) {
    onError(err);
    return () => {};
  }
}

export async function watchRewardedTicketAd(adGroupId = 'ticket-recharge'): Promise<boolean> {
  const onError = () => undefined;
  if (!isIntegratedAdSupported()) return false;
  const loaded = await new Promise<boolean>((resolve) => {
    let unregister: () => void = () => {};
    unregister = preloadIntegratedRewardAd(
      adGroupId,
      () => {
        unregister();
        resolve(true);
      },
      () => {
        unregister();
        resolve(false);
      },
    );
    window.setTimeout(() => {
      unregister();
      resolve(false);
    }, 8_000);
  });
  if (!loaded) {
    onError();
    return false;
  }
  return showIntegratedRewardAd(adGroupId);
}
