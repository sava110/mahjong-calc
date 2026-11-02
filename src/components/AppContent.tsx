import { type FC, useState } from 'react';
import { useStore } from '../contexts/store';
import type { AppState } from '../lib/store/state';
import { Calculator } from './Calculator';
import { ScoringTable } from './ScoringTable';
import { Settings } from './Settings';

// Screens further right in the header slide in from the right
const screenOrder: Record<AppState['currentScreen'], number> = {
  main: 0,
  'scoring-table': 1,
  settings: 2
};

const animationClasses = {
  none: '',
  forward: 'motion-safe:animate-page-forward',
  back: 'motion-safe:animate-page-back'
} as const;

const AppContent: FC = () => {
  const [{ currentScreen }] = useStore();
  const [prevScreen, setPrevScreen] = useState(currentScreen);
  const [direction, setDirection] =
    useState<keyof typeof animationClasses>('none');
  if (prevScreen !== currentScreen) {
    setPrevScreen(currentScreen);
    setDirection(
      screenOrder[currentScreen] > screenOrder[prevScreen] ? 'forward' : 'back'
    );
  }
  return (
    <div className="relative flex-1 overflow-x-clip bg-neutral-100 text-neutral-900 transition dark:bg-neutral-900 dark:text-neutral-100">
      <div key={currentScreen} className={animationClasses[direction]}>
        {currentScreen === 'main' && <Calculator />}
        {currentScreen === 'scoring-table' && <ScoringTable />}
        {currentScreen === 'settings' && <Settings />}
      </div>
    </div>
  );
};
export default AppContent;
