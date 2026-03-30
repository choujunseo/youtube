import { getIdeaDisplayTags } from '@/lib/ideaDisplayTags';
import type { IIdea } from '@/types/idea';

interface IIdeaTagChipsProps {
  idea: IIdea;
  /** 피드 비투표 카드는 강조 톤, 나머지는 muted */
  tone?: 'accent' | 'muted';
}

const TONE_CLASS: Record<NonNullable<IIdeaTagChipsProps['tone']>, string> = {
  accent: 'rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600',
  muted: 'rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600',
};

export default function IdeaTagChips(props: IIdeaTagChipsProps) {
  const { idea, tone = 'muted' } = props;
  const tags = getIdeaDisplayTags(idea);
  const cls = TONE_CLASS[tone];

  return (
    <>
      {tags.map((label, i) => (
        <span key={`${i}-${label}`} className={cls}>
          #{label}
        </span>
      ))}
    </>
  );
}
