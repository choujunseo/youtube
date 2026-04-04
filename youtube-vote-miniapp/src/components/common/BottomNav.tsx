import { NavLink } from 'react-router-dom';

const navItems: Array<{ to: string; label: string }> = [
  { to: '/feed', label: '피드' },
  { to: '/hall-of-fame', label: '명예의 전당' },
  { to: '/upload', label: '업로드' },
  { to: '/my', label: 'My' },
];

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-50 mx-auto flex h-16 w-full max-w-md border-t border-gray-100 bg-white/95 backdrop-blur">
      {navItems.map((item) => {
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
