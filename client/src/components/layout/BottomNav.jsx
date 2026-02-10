import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', icon: '\u23F1', label: 'Workout' },
  { to: '/history', icon: '\uD83D\uDCCB', label: 'History' },
  { to: '/program', icon: '\u2699', label: 'Program' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around py-4 px-6 bg-nav border-t border-border">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] no-underline min-w-[44px] min-h-[44px] ${
              isActive ? 'text-accent' : 'text-text-muted'
            }`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
