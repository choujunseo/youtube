import { check } from 'korcen';

/**
 * 한국어 부적절 표현 검사.
 * - 엔진: `korcen` (Apache-2.0) — 리소스·도구 큐레이션은
 *   https://github.com/Tanat05/korean-profanity-resources README 참고.
 * - 클라이언트 1차만 수행; 우회 방지용 서버 검증은 별도 권장.
 */
export function textContainsProfanity(text: string): boolean {
  const s = text.trim();
  if (!s) return false;
  return Boolean(check(s));
}

export type TUgcProfanityField = 'title' | 'description' | 'tag';

export function findFirstProfaneUgcField(input: {
  title: string;
  description: string;
  tags: string[];
}): TUgcProfanityField | null {
  if (textContainsProfanity(input.title)) return 'title';
  if (textContainsProfanity(input.description)) return 'description';
  for (const tag of input.tags) {
    if (textContainsProfanity(tag)) return 'tag';
  }
  return null;
}

export function profanityRejectionMessage(field: TUgcProfanityField): string {
  switch (field) {
    case 'title':
      return '제목에 부적절한 표현이 포함되어 있어요. 수정 후 다시 시도해 주세요.';
    case 'description':
      return '설명에 부적절한 표현이 포함되어 있어요. 수정 후 다시 시도해 주세요.';
    case 'tag':
      return '태그에 부적절한 표현이 포함되어 있어요. 수정 후 다시 시도해 주세요.';
    default:
      return '부적절한 표현이 포함되어 있어요. 수정 후 다시 시도해 주세요.';
  }
}
