import {
  appLogin,
  generateHapticFeedback,
  getTossShareLink,
  GoogleAdMob,
  TossAds,
  share,
} from '@apps-in-toss/web-framework';
import { voteTicketAdGroupId } from '@/lib/adGroupIds';
import { mockAppLogin, MockGoogleAdMob } from '@/mocks/tossSdkMock';

const isMockMode = import.meta.env.DEV;

/**
 * 로그인만 `DEV === 목`으로 묶지 않음.
 * `granite dev` + 토스 웹뷰에서도 `import.meta.env.DEV`가 true라, 목이면 가짜 authorizationCode로
 * auth-token-exchange가 항상 실패하고 토스 로그인 시트도 뜨지 않음.
 */
/** 토스 앱 WebView에서만 실제 햅틱. 로컬 브라우저 등에서는 조용히 무시. */
export function fireTossHaptic(
  type:
    | 'tickWeak'
    | 'tap'
    | 'tickMedium'
    | 'softMedium'
    | 'basicWeak'
    | 'basicMedium'
    | 'success'
    | 'error'
    | 'wiggle'
    | 'confetti',
): void {
  void generateHapticFeedback({ type }).catch(() => undefined);
}

export async function bridgeAppLogin() {
  const useMockLogin =
    import.meta.env.VITE_IS_MOCK === 'true' ||
    import.meta.env.VITE_USE_MOCK_APP_LOGIN === 'true';
  return useMockLogin ? mockAppLogin() : appLogin();
}

export function getGoogleAdMob() {
  return isMockMode ? MockGoogleAdMob : GoogleAdMob;
}

interface ITossBannerAttachOptions {
  theme?: 'auto' | 'light' | 'dark';
  tone?: 'blackAndWhite' | 'grey';
  variant?: 'card' | 'expanded';
  callbacks?: {
    onAdRendered?: (payload: { slotId: string; adGroupId: string }) => void;
    onAdViewable?: (payload: { slotId: string; adGroupId: string }) => void;
    onAdClicked?: (payload: { slotId: string; adGroupId: string }) => void;
    onAdImpression?: (payload: { slotId: string; adGroupId: string }) => void;
    onAdFailedToRender?: (payload: { error?: { message?: string } }) => void;
    onNoFill?: (payload: { slotId: string; adGroupId: string }) => void;
  };
}

type TTossBannerHandle = { destroy: () => void };

function getTossAdsApi() {
  return TossAds as unknown as {
    initialize?: ((options?: unknown) => void) & { isSupported?: () => boolean };
    attachBanner?: (
      adGroupId: string,
      target: string | HTMLElement,
      options?: ITossBannerAttachOptions,
    ) => TTossBannerHandle;
  };
}

export function isBannerAdSupported(): boolean {
  try {
    const ads = getTossAdsApi();
    const initSupported = ads.initialize?.isSupported;
    const attachSupported = (ads.attachBanner as unknown as { isSupported?: () => boolean })?.isSupported;
    const canInit = isFn(initSupported) ? initSupported() : Boolean(ads.initialize);
    const canAttach = isFn(attachSupported) ? attachSupported() : isFn(ads.attachBanner);
    return Boolean(canInit && canAttach);
  } catch {
    return false;
  }
}

// TossAds.initialize는 앱 생명주기 내 딱 1회만 호출해야 함 (공식 가이드).
// 모듈 레벨 싱글턴으로 중복 호출을 방지한다.
type BannerInitState = 'idle' | 'pending' | 'done' | 'failed';
let _bannerInitState: BannerInitState = 'idle';
const _bannerInitQueue: Array<(ok: boolean) => void> = [];

export function initBannerAds(onInitialized?: () => void, onFailed?: (err: unknown) => void): void {
  if (_bannerInitState === 'done') {
    onInitialized?.();
    return;
  }
  if (_bannerInitState === 'failed') {
    onFailed?.(new Error('TOSS_BANNER_INIT_FAILED'));
    return;
  }
  if (_bannerInitState === 'pending') {
    _bannerInitQueue.push((ok) =>
      ok ? onInitialized?.() : onFailed?.(new Error('TOSS_BANNER_INIT_FAILED')),
    );
    return;
  }

  // idle → 실제 초기화 시작
  _bannerInitState = 'pending';

  const flush = (ok: boolean) => {
    _bannerInitQueue.splice(0).forEach((cb) => cb(ok));
  };

  try {
    const ads = getTossAdsApi();
    if (!isFn(ads.initialize)) {
      _bannerInitState = 'failed';
      flush(false);
      onFailed?.(new Error('TOSS_BANNER_INIT_UNSUPPORTED'));
      return;
    }
    const isSupported = ads.initialize.isSupported;
    if (isFn(isSupported) && !isSupported()) {
      _bannerInitState = 'failed';
      flush(false);
      onFailed?.(new Error('TOSS_BANNER_NOT_SUPPORTED'));
      return;
    }
    ads.initialize({
      callbacks: {
        onInitialized: () => {
          _bannerInitState = 'done';
          flush(true);
          onInitialized?.();
        },
        onInitializationFailed: (error: unknown) => {
          _bannerInitState = 'failed';
          flush(false);
          onFailed?.(error);
        },
      },
    });
  } catch (err) {
    _bannerInitState = 'failed';
    flush(false);
    onFailed?.(err);
  }
}

export function attachBannerAd(
  adGroupId: string,
  target: HTMLElement,
  options?: ITossBannerAttachOptions,
): () => void {
  try {
    const ads = getTossAdsApi();
    if (!isFn(ads.attachBanner)) return () => {};
    const handle = ads.attachBanner(adGroupId, target, options);
    return isFn(handle?.destroy) ? handle.destroy : () => {};
  } catch {
    return () => {};
  }
}

function isFn(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

type LoadAdEvent =
  | { type: 'loaded' }
  | { type: 'userEarnedReward'; data?: { unitType: string; unitAmount: number } };

interface ILoadAdParams {
  options: { adGroupId: string };
  onEvent: (event: LoadAdEvent) => void;
  onError: (err: unknown) => void;
}

type ShowAdEvent =
  | { type: 'requested' }
  | { type: 'show' }
  | { type: 'impression' }
  | { type: 'clicked' }
  | { type: 'dismissed' }
  | { type: 'failedToShow' }
  | { type: 'userEarnedReward'; data: { unitType: string; unitAmount: number } };

interface IShowAdParams {
  options: { adGroupId: string };
  onEvent: (event: ShowAdEvent) => void;
  onError: (err: unknown) => void;
}

/** 공식 v2.0 API: GoogleAdMob.loadAppsInTossAdMob / showAppsInTossAdMob */
function resolveIntegratedAdApi() {
  if (isMockMode) {
    return {
      loadAd: MockGoogleAdMob.loadAppsInTossAdMob,
      showAd: MockGoogleAdMob.showAppsInTossAdMob,
    };
  }
  return {
    loadAd: GoogleAdMob.loadAppsInTossAdMob,
    showAd: GoogleAdMob.showAppsInTossAdMob,
  };
}

export function isIntegratedAdSupported(): boolean {
  try {
    const { loadAd, showAd } = resolveIntegratedAdApi();
    if (!isFn(loadAd) || !isFn(showAd)) return false;

    const loadSupported = (loadAd as unknown as Record<string, unknown>).isSupported;
    const showSupported = (showAd as unknown as Record<string, unknown>).isSupported;

    const canLoad = isFn(loadSupported) ? (loadSupported as () => boolean)() : true;
    const canShow = isFn(showSupported) ? (showSupported as () => boolean)() : true;
    return canLoad && canShow;
  } catch {
    return false;
  }
}

/**
 * v1.0 SDK는 userEarnedReward를 loadFullScreenAd의 onEvent(로드 쪽)에서 발생시킨다.
 * v2.0 SDK는 showFullScreenAd의 onEvent(쇼 쪽)에서 발생시킨다.
 * 두 경우를 모두 커버하기 위해 로드 쪽에서 받은 보상 상태를 adGroupId 단위로 보관한다.
 */
const _earnedOnLoadSide = new Map<string, boolean>();

export function preloadIntegratedRewardAd(
  adGroupId: string,
  onLoaded: () => void,
  onError: (err: unknown) => void,
): () => void {
  _earnedOnLoadSide.delete(adGroupId);
  try {
    const { loadAd } = resolveIntegratedAdApi();
    if (!isFn(loadAd)) return () => {};

    const unregister = (loadAd as (params: ILoadAdParams) => unknown)({
      options: { adGroupId },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          onLoaded();
        }
        // 일부 SDK 버전에서 userEarnedReward가 로드 쪽 onEvent로 오는 경우를 대비해 캡처
        if (event.type === 'userEarnedReward') {
          _earnedOnLoadSide.set(adGroupId, true);
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
    const { showAd } = resolveIntegratedAdApi();
    if (!isFn(showAd)) return false;

    return await new Promise<boolean>((resolve) => {
      let settled = false;

      const isEarned = () => _earnedOnLoadSide.get(adGroupId) === true;

      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        _earnedOnLoadSide.delete(adGroupId);
        resolve(value);
      };

      (showAd as (params: IShowAdParams) => unknown)({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === 'userEarnedReward') {
            // 쇼 쪽 userEarnedReward → 즉시 확정 (공식 v2.0 패턴)
            _earnedOnLoadSide.set(adGroupId, true);
            settle(true);
          }
          if (event.type === 'failedToShow') {
            settle(false);
          }
          if (event.type === 'dismissed') {
            // 로드 쪽에서 미리 캡처된 경우 즉시 확정,
            // 아직 안 왔으면 800ms 대기 후 재확인
            if (isEarned()) {
              settle(true);
            } else {
              window.setTimeout(() => settle(isEarned()), 800);
            }
          }
        },
        onError: () => settle(false),
      });

      // 안전 장치: dismissed·userEarnedReward가 영영 안 오는 경우에만 발동.
      // 광고 최대 길이 60초 + 여유 → 65초 (Toss 커뮤니티 스태프 Albert 권장값)
      window.setTimeout(() => settle(false), 65_000);
    });
  } catch {
    return false;
  }
}

/** 전면형 광고(톨게이트): load → show 순서 준수, 보상 여부와 무관하게 노출/종료만 확인 */
export async function showIntegratedFullScreenGateAd(adGroupId: string): Promise<boolean> {
  try {
    const { loadAd, showAd } = resolveIntegratedAdApi();
    if (!isFn(loadAd) || !isFn(showAd)) return false;

    // Step 1: load
    const loaded = await new Promise<boolean>((resolve) => {
      let cleanup: () => void = () => {};
      const rawUnregister = (loadAd as (params: ILoadAdParams) => unknown)({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            cleanup();
            resolve(true);
          }
        },
        onError: () => { cleanup(); resolve(false); },
      });
      cleanup = isFn(rawUnregister) ? (rawUnregister as () => void) : () => {};
      window.setTimeout(() => { cleanup(); resolve(false); }, 10_000);
    });

    if (!loaded) return false;

    // Step 2: show
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      (showAd as (params: IShowAdParams) => unknown)({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === 'failedToShow') settle(false);
          if (event.type === 'dismissed') settle(true);
        },
        onError: () => settle(false),
      });

      window.setTimeout(() => settle(false), 65_000);
    });
  } catch {
    return false;
  }
}

/**
 * 하위 호환용 래퍼 (기존 호출부 유지).
 * 현재는 통합 광고 API의 adGroupId를 받는다.
 */

export async function watchRewardedTicketAd(adGroupId = voteTicketAdGroupId()): Promise<boolean> {
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

/** UUID 앞 8자리를 대문자로 변환한 공유 코드 */
export function ideaShareCode(ideaId: string): string {
  return ideaId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export interface IShareIdeaOptions {
  ideaId: string;
  title: string;
}

/**
 * 1) 아이디어 코드(8자리)를 클립보드에 복사
 * 2) getTossShareLink로 Toss 공유 링크 생성 후 share()로 공유 시트 띄우기
 *    — SDK 미지원 환경(브라우저 등)에서는 클립보드 복사만 수행
 */
export async function shareIdea(options: IShareIdeaOptions): Promise<void> {
  const code = ideaShareCode(options.ideaId);
  const appName = (import.meta.env.VITE_TOSS_APP_NAME as string | undefined)?.trim() ?? 'idea-league';
  const ogImageUrl = (import.meta.env.VITE_OG_SHARE_IMAGE_URL as string | undefined)?.trim()
    ?? `${window.location.origin}/share-og.png`;

  await navigator.clipboard.writeText(code);

  try {
    const deepLink = `intoss://${appName}`;
    const tossLink = (await getTossShareLink(deepLink, ogImageUrl)).trim();
    await share({
      message: [
        `내 아이디어 「${options.title}」에 투표해 줘!`,
        `My>아이디어 찾기에서 아래 코드를 입력해주세요`,
        '',
        code,
        '',
        tossLink,
      ].join('\n'),
    });
  } catch {
    // SDK 미지원 환경 — 클립보드 복사만으로 fallback (이미 완료)
  }
}
