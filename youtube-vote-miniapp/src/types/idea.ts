export type IIdeaCategory = 'entertainment' | 'education' | 'vlog' | 'shorts' | 'etc';

/** `ideas` 테이블 행 */
export interface IIdea {
  id: string;
  creatorId: string;
  weekId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  category: IIdeaCategory;
  /** 사용자 지정 태그(최대 4). 비어 있으면 UI에서 `category` 라벨만 표시 */
  categoryTags: string[];
  totalVoteCount: number;
  totalWeightedShares: number;
  isBoosted: boolean;
  boostExpiresAt: string | null;
  createdAt: string;
}

export interface IIdeaPage {
  items: IIdea[];
  nextOffset: number | null;
}
