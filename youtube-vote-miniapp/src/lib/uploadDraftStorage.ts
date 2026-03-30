import {
  UPLOAD_DESC_MAX,
  UPLOAD_TAG_MAX_COUNT,
  UPLOAD_TAG_MAX_LEN,
  UPLOAD_TITLE_MAX,
} from '@/lib/uploadLimits';

const STORAGE_VERSION = 1 as const;
const PREFIX = 'ideaLeague.uploadDraft';

export interface IUploadDraftSnapshot {
  title: string;
  description: string;
  tags: string[];
  tagDraft: string;
}

interface IStoredPayload extends IUploadDraftSnapshot {
  v: typeof STORAGE_VERSION;
  weekId: string;
}

function key(userId: string, weekId: string): string {
  return `${PREFIX}.v${STORAGE_VERSION}:${userId}:${weekId}`;
}

function sanitizeDraft(
  weekId: string,
  raw: unknown,
): IUploadDraftSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== STORAGE_VERSION || typeof o.weekId !== 'string' || o.weekId !== weekId) {
    return null;
  }
  const title = typeof o.title === 'string' ? o.title.slice(0, UPLOAD_TITLE_MAX) : '';
  const description =
    typeof o.description === 'string' ? o.description.slice(0, UPLOAD_DESC_MAX) : '';
  let tags: string[] = [];
  if (Array.isArray(o.tags)) {
    tags = o.tags
      .filter((x): x is string => typeof x === 'string')
      .map((t) => t.slice(0, UPLOAD_TAG_MAX_LEN).trim())
      .filter(Boolean)
      .slice(0, UPLOAD_TAG_MAX_COUNT);
  }
  const tagDraft =
    typeof o.tagDraft === 'string' ? o.tagDraft.slice(0, UPLOAD_TAG_MAX_LEN) : '';
  return { title, description, tags, tagDraft };
}

/** 활성 주차·유저별 업로드 초안 읽기 (주차 불일치 시 무시) */
export function readUploadDraft(userId: string, weekId: string): IUploadDraftSnapshot | null {
  try {
    const raw = localStorage.getItem(key(userId, weekId));
    if (!raw) return null;
    return sanitizeDraft(weekId, JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeUploadDraft(
  userId: string,
  weekId: string,
  snapshot: IUploadDraftSnapshot,
): void {
  try {
    const payload: IStoredPayload = {
      v: STORAGE_VERSION,
      weekId,
      title: snapshot.title.slice(0, UPLOAD_TITLE_MAX),
      description: snapshot.description.slice(0, UPLOAD_DESC_MAX),
      tags: snapshot.tags
        .map((t) => t.slice(0, UPLOAD_TAG_MAX_LEN).trim())
        .filter(Boolean)
        .slice(0, UPLOAD_TAG_MAX_COUNT),
      tagDraft: snapshot.tagDraft.slice(0, UPLOAD_TAG_MAX_LEN),
    };
    const empty =
      payload.title.trim() === '' &&
      payload.description.trim() === '' &&
      payload.tags.length === 0 &&
      payload.tagDraft.trim() === '';
    if (empty) {
      localStorage.removeItem(key(userId, weekId));
      return;
    }
    localStorage.setItem(key(userId, weekId), JSON.stringify(payload));
  } catch {
    // 저장 공간 부족 등 — 무시
  }
}

export function clearUploadDraft(userId: string, weekId: string): void {
  try {
    localStorage.removeItem(key(userId, weekId));
  } catch {
    // ignore
  }
}
