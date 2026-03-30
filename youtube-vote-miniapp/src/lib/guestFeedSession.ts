const STORAGE_KEY = 'idea_league_guest_feed_v1';

/** 로그인 전 피드 RPC(`fetch_feed_ideas_page`)용 안정적인 가짜 user_id. DB `users`에 없어도 됨(미노출만 필터). */
export function getGuestFeedUserId(): string {
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
