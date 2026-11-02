import type { FC } from 'react';

interface PinInputProps {
  id?: string;
  value: string;
  onChange: (pin: string) => void;
}

// Four digits with the numeric keypad on phones
export const PinInput: FC<PinInputProps> = ({ id, value, onChange }) => (
  <input
    id={id}
    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] dark:border-stone-700 dark:bg-stone-950"
    type="text"
    inputMode="numeric"
    pattern="[0-9]{4}"
    maxLength={4}
    autoComplete="off"
    placeholder="0000"
    value={value}
    onChange={e => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
  />
);
