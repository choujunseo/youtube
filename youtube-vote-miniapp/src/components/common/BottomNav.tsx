import { NavLink } from 'react-router-dom';
import { useRankingAccessibleKst } from '@/hooks/useRankingWindowKst';

const navItems: Array<{ to: string; label: string; rankingOnly?: boolean }> = [
  { to: '/feed', label: '피드' },
  { to: '/ranking', label: '실시간 랭킹', rankingOnly: true },
  { to: '/upload', label: '업로드' },
  { to: '/my', label: 'My' },
];

export default function BottomNav() {
  const rankingOpen = useRankingAccessibleKst();

  return (
    <nav className="sticky bottom-0 z-50 mx-auto flex h-16 w-full max-w-md border-t border-gray-100 bg-white/95 backdrop-blur">
      {navItems.map((item) => {
        if (item.rankingOnly && !rankingOpen) {
          return (
            <span
              key={item.to}
              className="flex flex-1 cursor-default select-none items-center justify-center text-sm font-medium text-gray-300"
              aria-hidden
            >
              {item.label}
            </span>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 items-center justify-center text-sm font-medium ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`
            }
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
