import { Button, Paragraph, useToast } from '@toss/tds-mobile';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandPageHeader from '@/components/common/BrandPageHeader';
import { useInsertIdeaMutation, useMyDailyIdeaUploadCountQuery } from '@/hooks/queries';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { uploadSubmitAdGroupId } from '@/lib/adGroupIds';
import {
  clearUploadDraft,
  readUploadDraft,
  writeUploadDraft,
} from '@/lib/uploadDraftStorage';
import {
  findFirstProfaneUgcField,
  profanityRejectionMessage,
  textContainsProfanity,
} from '@/lib/profanityCheck';
import {
  MAX_DAILY_IDEA_UPLOADS,
  UPLOAD_DESC_MAX,
  UPLOAD_TAG_MAX_COUNT,
  UPLOAD_TAG_MAX_LEN,
  UPLOAD_TITLE_MAX,
} from '@/lib/uploadLimits';
import { patchUserAfterIdeaUpload } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';

function getKstTodayKey(now = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeTagInput(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const userId = user?.id ?? null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  /** 0: 아직 복원 전(저장 스킵). 복원 후 1+ 로만 localStorage에 씀 — 빈 state로 초안을 지우는 레이스 방지 */
  const [hydrationToken, setHydrationToken] = useState(0);

  const hydratedKeyRef = useRef<string>('');
  const draftScopeKey = useMemo(() => `kst-day:${getKstTodayKey()}`, []);

  const myDailyCountQuery = useMyDailyIdeaUploadCountQuery(userId);
  const myCount = myDailyCountQuery.data ?? 0;

  const insertMutation = useInsertIdeaMutation();
  const submitAdGroupId = useMemo(() => uploadSubmitAdGroupId(), []);
  const { isSupported: adSupported, isLoaded: adLoaded, showRewarded } = useRewardedAd(submitAdGroupId);
  const [uploadFlowBusy, setUploadFlowBusy] = useState(false);

  const atUploadCap = myCount >= MAX_DAILY_IDEA_UPLOADS;
  const canFillForm = !atUploadCap;

  const profanityNoticeSlot = useMemo(() => {
    const f = findFirstProfaneUgcField({ title, description, tags });
    if (f === 'title') return 'title';
    if (f === 'description') return 'description';
    if (f === 'tag') return 'tags';
    const draft = normalizeTagInput(tagDraft);
    if (draft.length > 0 && textContainsProfanity(draft)) return 'tags';
    return null;
  }, [title, description, tags, tagDraft]);

  const hasProfanityInUploadForm = profanityNoticeSlot != null;

  useEffect(() => {
    if (!userId) return;
    const k = `${userId}:${draftScopeKey}`;
    if (hydratedKeyRef.current === k) return;
    hydratedKeyRef.current = k;
    const draft = readUploadDraft(userId, draftScopeKey);
    if (draft) {
      setTitle(draft.title);
      setDescription(draft.description);
      setTags(draft.tags);
      setTagDraft(draft.tagDraft);
    } else {
      setTitle('');
      setDescription('');
      setTags([]);
      setTagDraft('');
    }
    setHydrationToken((n) => n + 1);
  }, [draftScopeKey, userId]);

  useEffect(() => {
    if (hydrationToken === 0 || !userId) return;
    const t = window.setTimeout(() => {
      writeUploadDraft(userId, draftScopeKey, {
        title,
        description,
        tags,
        tagDraft,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [title, description, tags, tagDraft, draftScopeKey, userId, hydrationToken]);

  const addTag = useCallback(() => {
    const v = normalizeTagInput(tagDraft);
    if (!v) return;
    if (v.length > UPLOAD_TAG_MAX_LEN) {
      openToast(`태그는 ${UPLOAD_TAG_MAX_LEN}자 이하로 입력해 주세요.`, { higherThanCTA: true, duration: 2600 });
      return;
    }
    if (tags.length >= UPLOAD_TAG_MAX_COUNT) {
      openToast(`태그는 최대 ${UPLOAD_TAG_MAX_COUNT}개까지 추가할 수 있어요.`, {
        higherThanCTA: true,
        duration: 2600,
      });
      return;
    }
    if (tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
      openToast('이미 추가한 태그예요.', { higherThanCTA: true, duration: 2200 });
      return;
    }
    if (textContainsProfanity(v)) {
      openToast(profanityRejectionMessage('tag'), { higherThanCTA: true, duration: 3200 });
      return;
    }
    setTags((prev) => [...prev, v]);
    setTagDraft('');
  }, [openToast, tagDraft, tags]);

  const removeTag = useCallback((label: string) => {
    setTags((prev) => prev.filter((t) => t !== label));
  }, []);

  const handleSubmit = async () => {
    if (!userId) {
      openToast('로그인 정보를 확인할 수 없어요.', { higherThanCTA: true, duration: 2600 });
      return;
    }

    if (atUploadCap) {
      openToast('최대 업로드 개수 도달', { higherThanCTA: true, duration: 2600 });
      return;
    }

    const t = title.trim();
    const d = description.trim();
    const creatorNickname = user?.displayName?.trim() ?? '';
    if (!creatorNickname) {
      openToast('닉네임 설정 후 업로드할 수 있어요. 다시 로그인해 주세요.', {
        higherThanCTA: true,
        duration: 2800,
      });
      return;
    }
    if (t.length === 0 || t.length > UPLOAD_TITLE_MAX) {
      openToast(`제목은 1~${UPLOAD_TITLE_MAX}자로 입력해 주세요.`, { higherThanCTA: true, duration: 2600 });
      return;
    }
    if (d.length === 0 || d.length > UPLOAD_DESC_MAX) {
      openToast(`설명은 1~${UPLOAD_DESC_MAX}자로 입력해 주세요.`, { higherThanCTA: true, duration: 2600 });
      return;
    }

    if (tags.length === 0 || tags.length > UPLOAD_TAG_MAX_COUNT) {
      openToast(`태그를 1~${UPLOAD_TAG_MAX_COUNT}개 추가해 주세요.`, { higherThanCTA: true, duration: 2800 });
      return;
    }

    const profaneField = findFirstProfaneUgcField({ title: t, description: d, tags });
    if (profaneField != null) {
      openToast(profanityRejectionMessage(profaneField), { higherThanCTA: true, duration: 3200 });
      return;
    }

    if (!adSupported) {
      openToast('이 환경에서는 리워드 광고를 재생할 수 없어요.', { higherThanCTA: true, duration: 2800 });
      return;
    }
    if (!adLoaded) {
      openToast('광고를 불러오는 중이에요. 잠시 후 다시 눌러 주세요.', { higherThanCTA: true, duration: 2600 });
      return;
    }

    setUploadFlowBusy(true);
    try {
      const earned = await showRewarded();
      if (!earned) {
        openToast(
          '리워드를 받지 못해 업로드하지 않았어요. 광고를 끝까지 시청해 주세요. 작성 내용은 그대로 두었어요.',
          { higherThanCTA: true, duration: 3600 },
        );
        return;
      }

      await insertMutation.mutateAsync({
        creatorId: userId,
        title: t,
        description: d,
        categoryTags: tags,
      });
      await patchUserAfterIdeaUpload(userId);
      updateUser({
        weeklyUploadCount: (user?.weeklyUploadCount ?? 0) + 1,
      });
      openToast('아이디어가 등록됐어요!', { higherThanCTA: true, duration: 2600 });
      setTitle('');
      setDescription('');
      setTags([]);
      setTagDraft('');
      clearUploadDraft(userId, draftScopeKey);
      navigate('/my/ideas');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '등록에 실패했어요.';
      openToast(msg, { higherThanCTA: true, duration: 3000 });
    } finally {
      setUploadFlowBusy(false);
    }
  };

  if (myDailyCountQuery.isLoading) {
    return (
      <main className="flex min-h-[calc(100svh-64px)] flex-col bg-gray-50 p-4">
        <div className="mx-auto w-full max-w-md space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </main>
    );
  }

  if (myDailyCountQuery.isError) {
    return (
      <main className="flex min-h-[calc(100svh-64px)] flex-col bg-gray-50 p-4">
        <p className="text-center text-sm text-gray-500">오늘 업로드 횟수를 불러오지 못했어요.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100svh-64px)] flex-col bg-gray-50">
      <BrandPageHeader
        title="아이디어 업로드"
        subtitle={`오늘 ${myCount}/2회 작성 완료`}
      />

      <section className="space-y-4 px-4 pb-8 pt-4">
        <div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-2">
              <Paragraph typography="t7" fontWeight="medium" color="#4E5968">
                {`제목 (${UPLOAD_TITLE_MAX}자 이하)`}
              </Paragraph>
            </div>
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-200"
              value={title}
              maxLength={UPLOAD_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 조회수 0에서 100만까지 실험"
              disabled={!canFillForm}
            />
          </div>
          {profanityNoticeSlot === 'title' ? (
            <p role="alert" className="mt-2 px-1 text-sm font-semibold text-red-600">
              부적절한 단어가 포함되어있어요
            </p>
          ) : null}
        </div>

        <div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-2">
              <Paragraph typography="t7" fontWeight="medium" color="#4E5968">
                {`설명 (${UPLOAD_DESC_MAX}자 이하) · ${description.length}/${UPLOAD_DESC_MAX}`}
              </Paragraph>
            </div>
            <textarea
              className="min-h-24 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-200"
              value={description}
              maxLength={UPLOAD_DESC_MAX}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="어떤 아이디어인지 한눈에 알 수 있게 짧게 적어 주세요."
              disabled={!canFillForm}
            />
          </div>
          {profanityNoticeSlot === 'description' ? (
            <p role="alert" className="mt-2 px-1 text-sm font-semibold text-red-600">
              부적절한 단어가 포함되어있어요
            </p>
          ) : null}
        </div>

        <div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-1">
              <Paragraph typography="t7" fontWeight="medium" color="#4E5968">
                {`태그 (1~${UPLOAD_TAG_MAX_COUNT}개)`}
              </Paragraph>
            </div>
            <div className="mb-3">
              <Paragraph typography="t7" fontWeight="regular" color="#8B95A1">
                {`주제를 나타내는 짧은 단어를 직접 정해 주세요. 태그당 최대 ${UPLOAD_TAG_MAX_LEN}자예요.`}
              </Paragraph>
            </div>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-200"
                value={tagDraft}
                maxLength={UPLOAD_TAG_MAX_LEN}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="예) 쇼츠, 먹방"
                disabled={!canFillForm || tags.length >= UPLOAD_TAG_MAX_COUNT}
              />
              <Button
                type="button"
                size="medium"
                variant="weak"
                disabled={!canFillForm || tags.length >= UPLOAD_TAG_MAX_COUNT}
                onClick={addTag}
              >
                추가
              </Button>
            </div>
            {tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1 text-xs text-slate-700"
                  >
                    #{label}
                    <button
                      type="button"
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-base text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                      aria-label={`${label} 태그 삭제`}
                      onClick={() => removeTag(label)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {profanityNoticeSlot === 'tags' ? (
            <p role="alert" className="mt-2 px-1 text-sm font-semibold text-red-600">
              부적절한 단어가 포함되어있어요
            </p>
          ) : null}
        </div>

        <div className="flex justify-center pt-2">
          <Button
            loading={uploadFlowBusy || insertMutation.isPending}
            disabled={
              !userId ||
              (!atUploadCap && (!adSupported || !adLoaded)) ||
              hasProfanityInUploadForm
            }
            onClick={() => void handleSubmit()}
          >
            업로드하기
          </Button>
        </div>
      </section>
    </main>
  );
}
