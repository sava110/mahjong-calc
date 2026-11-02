import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MdCalculate,
  MdHelp,
  MdSettings,
  MdTableView,
  MdUpdate
} from 'react-icons/md';
import { useStore } from '../contexts/store';

// Screen buttons are in the bottom navigation on small screens
const buttonClasses = {
  default:
    'flex items-center gap-1 p-1 hover:bg-white/10 rounded-lg transition',
  active:
    'flex items-center gap-1 p-1 bg-primary-600 hover:bg-primary-500 rounded-lg transition',
  screen:
    'hidden md:flex items-center gap-1 p-1 hover:bg-white/10 rounded-lg transition',
  screenActive:
    'hidden md:flex items-center gap-1 p-1 bg-primary-600 hover:bg-primary-500 rounded-lg transition'
} as const;

export const Header: FC = () => {
  const [showUpdateButton, setShowUpdateButton] = useState(false);
  const { t } = useTranslation();
  const [{ currentScreen }, dispatch] = useStore();
  useEffect(() => {
    (async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        registration?.addEventListener('updatefound', () => {
          setShowUpdateButton(true);
        });
      }
    })();
  }, []);
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b-2 border-primary-600 bg-stone-900 p-2 pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))] text-white">
      <button
        type="button"
        disabled={currentScreen === 'main'}
        className="flex items-center gap-2 overflow-hidden"
        onClick={() =>
          dispatch({ type: 'set-current-screen', payload: 'main' })
        }
      >
        <img src="/favicon.svg" alt="" className="h-8 w-8 shrink-0" />
        <h1 className="truncate text-xl font-bold tracking-wide">
          {t('header.title')}
        </h1>
      </button>
      <div className="flex items-center gap-1">
        {showUpdateButton && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-emerald-600 p-1 transition hover:bg-emerald-500"
            onClick={() => location.reload()}
          >
            <MdUpdate size="1.8rem" />
            <div className="hidden sm:block">{t('header.update')}</div>
          </button>
        )}
        <button
          type="button"
          className={
            currentScreen === 'main'
              ? buttonClasses.active
              : buttonClasses.default
          }
          onClick={() =>
            dispatch({ type: 'set-current-screen', payload: 'main' })
          }
        >
          <MdCalculate size="1.8rem" />
          <div className="whitespace-nowrap">{t('header.calculator')}</div>
        </button>
        <a
          href="https://github.com/sava110/mahjong-calc/blob/main/doc/how-to-use.md"
          target="_blank"
          rel="noreferrer"
          className={buttonClasses.default}
        >
          <MdHelp size="1.8rem" />
          <div className="hidden sm:block">{t('header.help')}</div>
        </a>
        <button
          type="button"
          className={
            currentScreen === 'scoring-table'
              ? buttonClasses.screenActive
              : buttonClasses.screen
          }
          onClick={() =>
            dispatch({
              type: 'set-current-screen',
              payload:
                currentScreen === 'scoring-table' ? 'main' : 'scoring-table'
            })
          }
        >
          <MdTableView size="1.8rem" />
          <div>{t('header.scoring-table')}</div>
        </button>
        <button
          type="button"
          className={
            currentScreen === 'settings'
              ? buttonClasses.screenActive
              : buttonClasses.screen
          }
          onClick={() =>
            dispatch({
              type: 'set-current-screen',
              payload: currentScreen === 'settings' ? 'main' : 'settings'
            })
          }
        >
          <MdSettings size="1.8rem" />
          <div>{t('header.settings')}</div>
        </button>
      </div>
    </header>
  );
};
