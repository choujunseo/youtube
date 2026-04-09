import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';

interface IUseTicketsResult {
  freeTickets: number;
  adTickets: number;
  totalTickets: number;
}

export function useTickets(): IUseTicketsResult {
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    const freeTickets = user?.freeTickets ?? 0;
    const adTickets = user?.adTickets ?? 0;
    const totalTickets = freeTickets + adTickets;

    return {
      freeTickets,
      adTickets,
      totalTickets,
    };
  }, [user]);
}
