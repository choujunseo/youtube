import { NavLink } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import { useRankingAccessibleKst } from '@/hooks/useRankingWindowKst';

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface IFeverBannerProps {
  countdownMs: number | null;
}

export default function FeverBanner({ countdownMs }: IFeverBannerProps) {
  const rankingOpen = useRankingAccessibleKst();

  return (
    <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 to-amber-50 px-4 py-3">
      <p className="text-center text-sm font-semibold text-rose-700">피버 타임</p>
      {countdownMs != null ? (
        <p className="mt-1 text-center text-xs tabular-nums text-rose-600">
          라이브 집계 마감까지 {formatCountdown(countdownMs)}
        </p>
      ) : (
        <p className="mt-1 text-center text-xs text-rose-600">
          실시간 랭킹 탭은 일요일 23:30~24:00에만 열려요
        </p>
      )}
      <div className="mt-2 flex justify-center">
        {rankingOpen ? (
          <NavLink to="/ranking">
            <Button size="small" variant="weak">
              랭킹 보기
            </Button>
          </NavLink>
        ) : (
          <Button size="small" variant="weak" disabled className="opacity-50">
            랭킹 보기
          </Button>
        )}
      </div>
    </div>
  );
}
