const STORAGE_KEY = 'idea_league_guest_feed_v1';

/** 로그인 전 피드 RPC용 가짜 user_id. 로그인 시 본인 id로 바뀌며, RPC는 본인 작성·본인 투표 완료 아이디어를 제외함. */
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
