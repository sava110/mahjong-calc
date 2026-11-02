import { type FC, useEffect } from 'react';
import type React from 'react';

interface SheetProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}

// Bottom sheet for input on small screens, a centered dialog on larger ones
export const Sheet: FC<SheetProps> = ({ title, children, footer, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="close"
        className="absolute inset-0 cursor-default bg-black/50 [-webkit-tap-highlight-color:transparent]"
        onClick={onClose}
      />
      {/* biome-ignore lint/a11y/useSemanticElements: positioned by the flex container, which <dialog> styles get in the way of */}
      <div
        role="dialog"
        aria-modal="true"
        className="motion-safe:animate-sheet-in relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-stone-100 text-stone-900 shadow-xl sm:max-w-lg sm:rounded-2xl dark:bg-stone-900 dark:text-stone-100"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-2xl leading-none text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
        {footer !== undefined && (
          <div className="flex gap-2 border-t border-stone-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-stone-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
