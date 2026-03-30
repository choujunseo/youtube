/** 다음 배너/카피 갱신 시 버전만 올리면 다시 한 번 노출 */
const STORAGE_KEY = 'idea_league_open_event_v1';

export function hasSeenOpenEvent(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markOpenEventSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}
