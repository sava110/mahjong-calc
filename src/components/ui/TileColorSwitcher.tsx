import type React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { MdRadioButtonChecked, MdRadioButtonUnchecked } from 'react-icons/md';
import { useStore } from '../../contexts/store';
import AutoInverted from '../../images/tile-color/auto-inverted.svg?react';
import Auto from '../../images/tile-color/auto.svg?react';
import Dark from '../../images/tile-color/dark.svg?react';
import Light from '../../images/tile-color/light.svg?react';
import type { AppConfig } from '../../lib/config';

const themeItems: {
  id: AppConfig['tileColor'];
  image: FC<React.SVGProps<SVGSVGElement>>;
}[] = [
  { id: 'auto', image: Auto },
  { id: 'auto-inverted', image: AutoInverted },
  { id: 'light', image: Light },
  { id: 'dark', image: Dark }
];

export const TileColorSwitcher: FC = () => {
  const [{ appConfig }, dispatch] = useStore();
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-1 md:flex">
      {themeItems.map(item => (
        <button
          type="button"
          key={item.id}
          className="flex flex-1 select-none flex-col divide-y divide-stone-300 overflow-hidden rounded-md border border-stone-300 bg-white shadow transition hover:bg-stone-200 focus:outline-none focus:ring-2 dark:divide-stone-700 dark:border-stone-700 dark:bg-stone-950 dark:hover:bg-stone-800"
          onClick={() =>
            dispatch({
              type: 'set-app-config',
              payload: { ...appConfig, tileColor: item.id }
            })
          }
        >
          <item.image />
          <div className="flex w-full items-center gap-1 p-2">
            <div className="basis-4">
              {appConfig.tileColor === item.id && (
                <MdRadioButtonChecked className="text-primary-700 dark:text-primary-400" />
              )}
              {appConfig.tileColor !== item.id && <MdRadioButtonUnchecked />}
            </div>
            <div className="truncate">{t(`settings.${item.id}`)}</div>
          </div>
        </button>
      ))}
    </div>
  );
};
