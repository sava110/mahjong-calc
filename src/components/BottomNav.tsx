import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { MdCalculate, MdGroups, MdSettings, MdTableView } from 'react-icons/md';
import { useStore } from '../contexts/store';
import type { AppState } from '../lib/store/state';

const navItems: {
  id: AppState['currentScreen'];
  icon: IconType;
  label: string;
}[] = [
  { id: 'main', icon: MdCalculate, label: 'header.calculator' },
  { id: 'scoring-table', icon: MdTableView, label: 'header.scoring-table' },
  { id: 'room', icon: MdGroups, label: 'header.room' },
  { id: 'settings', icon: MdSettings, label: 'header.settings' }
];

const itemClasses = {
  default:
    'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-stone-400 transition active:bg-white/10',
  active:
    'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold text-primary-400'
} as const;

// Tab bar for small screens, where it is easier to reach than the header
export const BottomNav: FC = () => {
  const [{ currentScreen }, dispatch] = useStore();
  const { t } = useTranslation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-stone-700 bg-stone-900/95 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur md:hidden">
      {navItems.map(item => (
        <button
          key={item.id}
          type="button"
          aria-current={currentScreen === item.id ? 'page' : undefined}
          className={
            currentScreen === item.id ? itemClasses.active : itemClasses.default
          }
          onClick={() => {
            if (currentScreen === item.id) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
            dispatch({ type: 'set-current-screen', payload: item.id });
            window.scrollTo({ top: 0 });
          }}
        >
          <item.icon size="1.6rem" />
          <div>{t(item.label)}</div>
        </button>
      ))}
    </nav>
  );
};
