import type React from 'react';
import type { FC } from 'react';

const buttonClasses = {
  none: 'inline-flex items-center gap-1 px-2 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 hover:bg-stone-200 dark:hover:bg-stone-800 disabled:hover:bg-white dark:disabled:hover:bg-stone-950 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg shadow-sm select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition',
  danger:
    'inline-flex items-center gap-1 px-2 py-2 border border-red-300 dark:border-red-700 bg-red-500 hover:bg-red-600 disabled:hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg shadow-sm select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition'
} as const;

interface ButtonProps {
  id?: string | undefined;
  children?: React.ReactNode;
  color?: 'none' | 'danger' | undefined;
  disabled?: boolean | undefined;
  title?: string | undefined;
  onClick?: (() => void) | undefined;
}
export const Button: FC<ButtonProps> = ({
  id,
  children,
  color = 'none',
  disabled,
  title,
  onClick = () => void 0
}) => (
  <button
    type="button"
    id={id}
    className={buttonClasses[color]}
    disabled={disabled}
    title={title}
    onClick={onClick}
  >
    {children}
  </button>
);
