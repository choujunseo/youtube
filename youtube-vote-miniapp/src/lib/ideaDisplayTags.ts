import { IDEA_CATEGORY_LABEL } from '@/lib/ideaCategoryLabel';
import type { IIdea } from '@/types/idea';

/** 태그가 있으면 그대로, 없으면(구 데이터) 기존 단일 카테고리 라벨 */
export function getIdeaDisplayTags(idea: IIdea): string[] {
  if (idea.categoryTags.length > 0) return idea.categoryTags;
  return [IDEA_CATEGORY_LABEL[idea.category]];
}
