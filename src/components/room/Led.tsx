import type { FC } from 'react';

interface LedProps {
  value: number;
  // Show + / − / ± in front, for point differences
  signed?: boolean;
  className?: string;
}

// Digits on a seven-segment display, as on the score displays of automatic
// tables. Unlit segments show faintly behind the digits. DSEG7 has no comma,
// plus or minus sign, so the sign is set in the regular font.
export const Led: FC<LedProps> = ({ value, signed = false, className }) => {
  const digits = String(Math.abs(value));
  const sign = signed
    ? value > 0
      ? '+'
      : value < 0
        ? '−'
        : '±'
    : value < 0
      ? '−'
      : '';
  return (
    <span className={`led ${className ?? ''}`}>
      {sign !== '' && <span className="led-sign">{sign}</span>}
      <span className="led-digits">
        <span aria-hidden className="led-unlit">
          {digits.replace(/[0-9]/g, '8')}
        </span>
        {digits}
      </span>
    </span>
  );
};
