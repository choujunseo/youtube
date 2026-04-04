import type { ReactNode } from 'react';
import { Button } from '@toss/tds-mobile';
import IdeaTagChips from '@/components/feed/IdeaTagChips';
import type { IIdea } from '@/types/idea';

interface IIdeaCardVotedProps {
  idea: IIdea;
  probability: number | null;
  onSeeDetail: (ideaId: string) => void;
  tagRowPrefix?: ReactNode;
  tagRowSuffix?: ReactNode;
  hideDetailButton?: boolean;
}

/** 투표 후 피드 카드: 순위 미노출 · 확률·총 표 */
export default function IdeaCardVoted(props: IIdeaCardVotedProps) {
  const { idea, probability, onSeeDetail, tagRowPrefix, tagRowSuffix, hideDetailButton = false } = props;

  const tagsBoost = (
    <>
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
        투표 완료
      </span>
      <IdeaTagChips idea={idea} tone="muted" />
      {idea.isBoosted ? (
        <span className="rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-500">BOOST</span>
      ) : null}
    </>
  );

  const nickname = idea.creatorDisplayName.trim();
  const topRowMain = (
    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
      <p
        className="min-w-0 truncate text-xs font-medium text-gray-900"
        title={nickname || undefined}
      >
        {nickname || '—'}
      </p>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{tagsBoost}</div>
    </div>
  );

  return (
    <article className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-white p-4 shadow-sm">
      <div className="mb-2 flex items-start gap-2">
        {tagRowPrefix ? (
          <>
            {tagRowPrefix}
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
              {topRowMain}
              {tagRowSuffix ? <div className="shrink-0">{tagRowSuffix}</div> : null}
            </div>
          </>
        ) : (
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            {topRowMain}
            {tagRowSuffix ? <div className="shrink-0">{tagRowSuffix}</div> : null}
          </div>
        )}
      </div>

      <h3 className="mb-2 text-base font-semibold text-gray-900">{idea.title}</h3>
      <p className="mb-3 text-sm leading-5 text-gray-600">{idea.description}</p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-3 ring-1 ring-blue-100">
          <p className="text-xs text-gray-500">총 투표</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">{idea.totalVoteCount}</p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-blue-100">
          <p className="text-xs text-gray-500">내 당첨 확률</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-blue-700">
            {probability == null ? '-' : `${probability.toFixed(2)}%`}
          </p>
        </div>
      </div>

      {hideDetailButton ? null : (
        <div className="flex justify-center">
          <Button size="small" variant="weak" onClick={() => onSeeDetail(idea.id)}>
            상세보기
          </Button>
        </div>
      )}
    </article>
  );
}
