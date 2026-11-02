import type React from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { MdRadioButtonChecked, MdRadioButtonUnchecked } from 'react-icons/md';
import { useStore } from '../../contexts/store';
import Auto from '../../images/theme/auto.svg?react';
import Dark from '../../images/theme/dark.svg?react';
import Light from '../../images/theme/light.svg?react';
import type { AppConfig } from '../../lib/config';

const themeItems: {
  id: AppConfig['theme'];
  image: FC<React.SVGProps<SVGSVGElement>>;
}[] = [
  { id: 'auto', image: Auto },
  { id: 'light', image: Light },
  { id: 'dark', image: Dark }
];

export const ThemeSwitcher: FC = () => {
  const [{ appConfig }, dispatch] = useStore();
  const { t } = useTranslation();

  return (
    <div className="flex gap-1">
      {themeItems.map(item => (
        <button
          type="button"
          key={item.id}
          className="flex flex-1 select-none flex-col divide-y divide-stone-300 overflow-hidden rounded-md border border-stone-300 bg-white shadow transition hover:bg-stone-200 focus:outline-none focus:ring-2 dark:divide-stone-700 dark:border-stone-700 dark:bg-stone-950 dark:hover:bg-stone-800"
          onClick={() =>
            dispatch({
              type: 'set-app-config',
              payload: { ...appConfig, theme: item.id }
            })
          }
        >
          <item.image />
          <div className="flex w-full items-center gap-1 p-2">
            {appConfig.theme === item.id && (
              <MdRadioButtonChecked className="text-primary-700 dark:text-primary-400" />
            )}
            {appConfig.theme !== item.id && <MdRadioButtonUnchecked />}
            {t(`settings.${item.id}`)}
          </div>
        </button>
      ))}
    </div>
  );
};
