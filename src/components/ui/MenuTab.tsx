import type React from 'react';
import type { FC } from 'react';

interface MenuTabProps {
  items?: React.ReactNode[];
  index?: number;
  row?: boolean;
  onSetIndex?: (index: number) => void;
}

const itemClasses =
  'flex flex-1 justify-center rounded-lg p-2 transition hover:bg-white/60 disabled:bg-white disabled:font-bold disabled:text-primary-700 disabled:shadow-sm dark:hover:bg-stone-700/60 dark:disabled:bg-stone-700 dark:disabled:text-primary-300';

export const MenuTab: FC<MenuTabProps> = ({
  items = [],
  index = 0,
  row = false,
  onSetIndex = () => void 0
}) => (
  <nav
    className={
      row
        ? 'flex flex-row gap-1 overflow-auto rounded-xl bg-stone-200 p-1 dark:bg-stone-800'
        : 'flex flex-row gap-1 overflow-auto rounded-xl bg-stone-200 p-1 dark:bg-stone-800 sm:flex-col'
    }
  >
    {items.map((item, i) => (
      <button
        type="button"
        key={i}
        className={row ? itemClasses : `${itemClasses} sm:justify-start`}
        disabled={i === index}
        onClick={() => onSetIndex(i)}
      >
        {item}
      </button>
    ))}
  </nav>
);
