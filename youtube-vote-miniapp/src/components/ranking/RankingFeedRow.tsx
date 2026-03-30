import IdeaCard from '@/components/feed/IdeaCard';
import IdeaCardVoted from '@/components/feed/IdeaCardVoted';
import { computeVoteProbability } from '@/lib/ideaVoteProbability';
import { rankingRowToIdea } from '@/lib/rankingRowToIdea';
import type { ILiveRankingRow } from '@/types/ranking';
import type { IVote } from '@/types/vote';

const RANK_CLASS =
  'w-6 shrink-0 text-center text-sm font-bold tabular-nums leading-none text-blue-600';
const PREVIEW_TOP_VOTED = import.meta.env.VITE_RANKING_TOP_VOTED_PREVIEW === 'true';

interface IRankingFeedRowProps {
  row: ILiveRankingRow;
  myVote: IVote | undefined;
  onVote: (ideaId: string) => void;
  onReport: (ideaId: string) => void;
  reportingIdeaId: string | null;
}

/** 피드와 동일 카드·동일 액션. 순위만 `tagRowPrefix`로 추가 */
export default function RankingFeedRow(props: IRankingFeedRowProps) {
  const { row, myVote, onVote, onReport, reportingIdeaId } = props;
  const idea = rankingRowToIdea(row);
  const isPreviewTopVoted = PREVIEW_TOP_VOTED && row.rank === 1;
  const hasVote = myVote != null || isPreviewTopVoted;
  const probabilityRaw = computeVoteProbability(idea, myVote);
  const probability = isPreviewTopVoted ? (probabilityRaw ?? 37.21) : probabilityRaw;
  const rankPrefix = (
    <span className={RANK_CLASS} aria-label={`${row.rank}위`}>
      {row.rank}
    </span>
  );

  if (hasVote) {
    return (
      <IdeaCardVoted
        idea={idea}
        probability={probability}
        onSeeDetail={onVote}
        tagRowPrefix={rankPrefix}
        hideDetailButton
      />
    );
  }

  return (
    <IdeaCard
      idea={idea}
      onVote={onVote}
      onReport={onReport}
      isReporting={reportingIdeaId === row.ideaId}
      tagRowPrefix={rankPrefix}
    />
  );
}
