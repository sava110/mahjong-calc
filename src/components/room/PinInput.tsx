import type { FC } from 'react';
import { NormalizedInput } from './NormalizedInput';

interface PinInputProps {
  id?: string;
  value: string;
  onChange: (pin: string) => void;
}

const normalizePin = (s: string) =>
  s
    .normalize('NFKC')
    .replace(/[^0-9]/g, '')
    .slice(0, 4);

// Four digits with the numeric keypad on phones
export const PinInput: FC<PinInputProps> = ({ id, value, onChange }) => (
  <NormalizedInput
    id={id}
    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] dark:border-stone-700 dark:bg-stone-950"
    type="text"
    inputMode="numeric"
    pattern="[0-9]{4}"
    maxLength={4}
    placeholder="0000"
    value={value}
    normalize={normalizePin}
    onChange={onChange}
  />
);
