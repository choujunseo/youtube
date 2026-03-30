-- 사용자 정의 태그(최대 4개). 기존 category 컬럼은 하위 호환용으로 유지.

ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS category_tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.ideas
  DROP CONSTRAINT IF EXISTS ideas_category_tags_max_4;

ALTER TABLE public.ideas
  ADD CONSTRAINT ideas_category_tags_max_4
  CHECK (cardinality(category_tags) <= 4);

COMMENT ON COLUMN public.ideas.category_tags IS '사용자 지정 태그, 최대 4개';
