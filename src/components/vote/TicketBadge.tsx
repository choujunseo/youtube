interface ITicketBadgeProps {
  freeTickets: number;
  adTickets: number;
}

/** 보유 투표권 합산만 표시(무료/광고 구분 없음) */
export default function TicketBadge(props: ITicketBadgeProps) {
  const { freeTickets, adTickets } = props;
  const total = freeTickets + adTickets;

  return (
    <div className="inline-flex rounded-2xl bg-slate-100 px-3 py-2">
      <span className="text-sm font-semibold tabular-nums text-slate-800">티켓 {total}</span>
    </div>
  );
}
