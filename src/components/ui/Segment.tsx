import type React from 'react';
import type { FC } from 'react';

interface SegmentProps {
  items?: React.ReactNode[];
  index?: number;
  onChange?: (index: number) => void;
}

export const Segment: FC<SegmentProps> = ({
  items = [],
  index = 0,
  onChange = () => void 0
}) => (
  <div className="flex select-none divide-x divide-stone-300 overflow-hidden rounded-lg border border-stone-300 shadow transition dark:divide-stone-700 dark:border-stone-700">
    {items.map((item, i) => (
      <button
        type="button"
        key={i}
        className="flex-1 whitespace-nowrap bg-white px-1 py-2 transition hover:bg-stone-200 disabled:bg-primary-700 disabled:font-bold disabled:text-white dark:bg-stone-950 dark:hover:bg-stone-800 dark:disabled:bg-primary-700 dark:disabled:text-white"
        disabled={index === i}
        onClick={() => onChange(i)}
      >
        {item}
      </button>
    ))}
  </div>
);
