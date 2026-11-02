import type React from 'react';
import type { FC } from 'react';

interface CheckboxProps {
  id: string;
  checked?: boolean;
  children?: React.ReactNode;
  onChange?: (checked: boolean) => void;
}

export const Checkbox: FC<CheckboxProps> = ({
  id,
  checked = false,
  children,
  onChange = () => void 0
}) => (
  <div className="flex items-center gap-2">
    <input
      id={id}
      className="h-6 w-6 rounded-md border border-stone-300 bg-white shadow transition checked:bg-primary-700 hover:bg-stone-200 checked:hover:bg-primary-700 dark:border-stone-700 dark:bg-stone-950 dark:checked:bg-primary-600 dark:hover:bg-stone-800 dark:checked:hover:bg-primary-700"
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
    <label htmlFor={id} className="py-1">
      {children}
    </label>
  </div>
);
