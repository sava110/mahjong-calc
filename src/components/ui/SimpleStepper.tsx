import type React from 'react';
import type { FC } from 'react';
import { MdAdd, MdRemove } from 'react-icons/md';

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
    className="flex flex-1 items-center justify-center bg-white p-3 text-primary-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-white dark:bg-stone-950 dark:text-primary-400 dark:hover:bg-stone-800 dark:disabled:text-stone-700 dark:disabled:hover:bg-stone-950"
  >
    {children}
  </button>
);

interface SimpleStepperProps {
  canDecrement?: boolean;
  canIncrement?: boolean;
  onChange?: (delta: 1 | -1) => void;
}
export const SimpleStepper: FC<SimpleStepperProps> = ({
  canDecrement = true,
  canIncrement = true,
  onChange = () => void 0
}) => (
  <div className="flex flex-1 select-none divide-x divide-stone-300 overflow-hidden rounded-lg border border-stone-300 shadow transition dark:divide-stone-700 dark:border-stone-700">
    <StepperButton disabled={!canDecrement} onClick={() => onChange(-1)}>
      <MdRemove />
    </StepperButton>
    <StepperButton disabled={!canIncrement} onClick={() => onChange(1)}>
      <MdAdd />
    </StepperButton>
  </div>
);
