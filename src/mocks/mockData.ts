export interface IIdeaCard {
  id: string;
  title: string;
  description: string;
  category: 'entertainment' | 'education' | 'vlog' | 'shorts' | 'etc';
  voteCount: number;
  weightedShare: number;
  isBoosted: boolean;
}

export const mockIdeas: IIdeaCard[] = [
  {
    id: 'idea-1',
    title: '30일 안에 10만 구독자 도전 브이로그',
    description: '매일 성장 지표를 공개하고 실험형 콘텐츠로 실제 성과를 검증합니다.',
    category: 'vlog',
    voteCount: 382,
    weightedShare: 721,
    isBoosted: true,
  },
  {
    id: 'idea-2',
    title: '유튜브 알고리즘 해부: 추천탭 역공학',
    description: 'CTR, 시청지속시간, 재방문율을 실제 사례로 분석한 교육형 시리즈입니다.',
    category: 'education',
    voteCount: 295,
    weightedShare: 588,
    isBoosted: false,
  },
  {
    id: 'idea-3',
    title: '조회수 0에서 시작하는 쇼츠 실험실',
    description: '썸네일/오프닝/자막 변수를 바꿔가며 쇼츠 성장 공식을 찾습니다.',
    category: 'shorts',
    voteCount: 441,
    weightedShare: 642,
    isBoosted: true,
  },
];
