import type { ReactNode } from 'react';
import { Button } from '@toss/tds-mobile';
import IdeaTagChips from '@/components/feed/IdeaTagChips';
import type { IIdea } from '@/types/idea';

interface IIdeaCardProps {
  idea: IIdea;
  onVote: (ideaId: string) => void;
  onReport: (ideaId: string) => void;
  /** 이 카드에서 투표 RPC 진행 중 */
  voteLoading?: boolean;
  isReporting?: boolean;
  isVoted?: boolean;
  /** 랭킹 등: 태그 줄 맨 왼쪽(고정 폭) */
  tagRowPrefix?: ReactNode;
  /** 랭킹 등: 태그 줄 맨 오른쪽 배지 */
  tagRowSuffix?: ReactNode;
}

/** 투표 전 피드 카드: 투표수 숫자 블라인드 · 마일스톤 상태 배지 노출 */
export default function IdeaCard(props: IIdeaCardProps) {
  const {
    idea,
    onVote,
    onReport,
    voteLoading = false,
    isReporting = false,
    isVoted = false,
    tagRowPrefix,
    tagRowSuffix,
  } = props;

  const tagsBoost = (
    <>
      <IdeaTagChips idea={idea} tone="accent" />
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
        {nickname || '알 수 없음'}
      </p>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{tagsBoost}</div>
    </div>
  );

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
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

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 justify-start">
          {!isVoted && idea.totalVoteCount === 0 ? (
            <span
              className="inline-flex h-8 w-fit max-w-[5.75rem] shrink-0 items-center justify-center rounded-full bg-red-50 px-2 text-[11px] font-semibold leading-none text-red-500"
            >
              최초 발굴
            </span>
          ) : null}
        </div>
        <div className="flex justify-center">
          <Button
            size="small"
            variant={isVoted ? 'weak' : 'fill'}
            disabled={isVoted || voteLoading}
            loading={voteLoading}
            onClick={() => onVote(idea.id)}
          >
            {isVoted ? '투표 완료' : '투표하기'}
          </Button>
        </div>
        <div className="flex min-w-0 justify-end">
          <button
            type="button"
            className="text-sm text-gray-400 underline underline-offset-2 disabled:opacity-60"
            onClick={() => onReport(idea.id)}
            disabled={isReporting}
          >
            {isReporting ? '제출 중' : '신고'}
          </button>
        </div>
      </div>
    </article>
  );
}
