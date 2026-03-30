import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';

interface IUseTicketsResult {
  freeTickets: number;
  adTickets: number;
  totalTickets: number;
  isWeeklyResetDue: boolean;
}

export function useTickets(): IUseTicketsResult {
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    const freeTickets = user?.freeTickets ?? 0;
    const adTickets = user?.adTickets ?? 0;
    const totalTickets = freeTickets + adTickets;
    const resetAtMs = user?.ticketResetAt ? new Date(user.ticketResetAt).getTime() : Number.NaN;
    const isWeeklyResetDue = Number.isFinite(resetAtMs) ? Date.now() >= resetAtMs : false;

    return {
      freeTickets,
      adTickets,
      totalTickets,
      isWeeklyResetDue,
    };
  }, [user?.adTickets, user?.freeTickets, user?.ticketResetAt]);
}
