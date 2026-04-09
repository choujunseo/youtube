/** 앱인토스 통합 인앱 광고 adGroupId 유틸 */

function envTrim(name: string): string | undefined {
  const v = import.meta.env[name] as string | undefined;
  const t = v?.trim();
  return t || undefined;
}

function requiredAdGroupId(envName: string): string {
  const id = envTrim(envName);
  if (!id) {
    throw new Error(`${envName} is required for production build`);
  }
  return id;
}

/** 업로드 제출 시마다 시청하는 리워드 광고 그룹 */
export function uploadSubmitAdGroupId(): string {
  return requiredAdGroupId('VITE_AD_GROUP_UPLOAD');
}

/** 아이디어 부스트용 리워드 광고 그룹 */
export function boostAdGroupId(): string {
  return requiredAdGroupId('VITE_AD_GROUP_BOOST');
}

/** 투표권(리워드 광고 시청) 그룹 — 마이/모달 등 */
export function voteTicketAdGroupId(): string {
  return requiredAdGroupId('VITE_AD_GROUP_VOTE_TICKET');
}

/** 명예의 전당 진입·갱신 시 전면형 게이트 광고 그룹 */
export function hallOfFameGateAdGroupId(): string {
  return requiredAdGroupId('VITE_AD_GROUP_HALL_OF_FAME_GATE');
}

/** 피드 상단 배너 광고 그룹 */
export function feedTopBannerAdGroupId(): string {
  return requiredAdGroupId('VITE_AD_GROUP_FEED_TOP_BANNER');
}
