export type IIdeaCategory = 'entertainment' | 'education' | 'vlog' | 'shorts' | 'etc';

/** `ideas` 테이블 행 */
export interface IIdea {
  id: string;
  creatorId: string;
  /** 피드 RPC 등에서만 채워질 수 있음. 없으면 빈 문자열 */
  creatorDisplayName: string;
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
