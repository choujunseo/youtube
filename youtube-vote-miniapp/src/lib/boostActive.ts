import type { IIdea } from '@/types/idea';

export function isBoostActive(idea: Pick<IIdea, 'isBoosted' | 'boostExpiresAt'>): boolean {
  if (!idea.isBoosted) return false;
  if (!idea.boostExpiresAt) return true;
  return new Date(idea.boostExpiresAt).getTime() > Date.now();
}
