import type React from 'react';
import type { FC } from 'react';
import { MdAdd, MdRefresh, MdRemove } from 'react-icons/md';

interface StepperButtonProps {
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}
const StepperButton: FC<StepperButtonProps> = ({
  children,
  disabled = false,
  onClick = () => void 0
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex basis-1/4 items-center justify-center bg-white p-3 text-primary-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-white dark:bg-stone-950 dark:text-primary-400 dark:hover:bg-stone-800 dark:disabled:text-stone-700 dark:disabled:hover:bg-stone-950"
  >
    {children}
  </button>
);

interface StepperProps {
  value?: number;
  defaultValue?: number;
  canDecrement?: boolean;
  canIncrement?: boolean;
  onChange?: (value: number) => void;
}
export const Stepper: FC<StepperProps> = ({
  value = 0,
  defaultValue = 0,
  canDecrement = true,
  canIncrement = true,
  onChange = () => void 0
}) => (
  <div className="flex flex-1 select-none divide-x divide-stone-300 overflow-hidden rounded-lg border border-stone-300 shadow transition dark:divide-stone-700 dark:border-stone-700">
    <StepperButton disabled={!canDecrement} onClick={() => onChange(value - 1)}>
      <MdRemove />
    </StepperButton>
    <div className="relative flex basis-1/2 items-center justify-center bg-white font-bold transition dark:bg-stone-950">
      {value !== defaultValue && (
        <button
          type="button"
          className="absolute inset-y-0 left-0 flex items-center justify-center px-1 text-stone-500 transition hover:text-stone-900 dark:hover:text-stone-100"
          onClick={() => onChange(defaultValue)}
        >
          <MdRefresh />
        </button>
      )}
      {value}
    </div>
    <StepperButton disabled={!canIncrement} onClick={() => onChange(value + 1)}>
      <MdAdd />
    </StepperButton>
  </div>
);
