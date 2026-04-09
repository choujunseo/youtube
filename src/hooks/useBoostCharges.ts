import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useBoostCharges(): number {
  const user = useAuthStore((s) => s.user);
  return useMemo(() => user?.boostCharges ?? 0, [user?.boostCharges]);
}
