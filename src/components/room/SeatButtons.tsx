import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { Room } from '../../lib/room/types';
import { seatName } from './format';

interface SeatButtonsProps {
  room: Room;
  selected: number[];
  disabled?: number[];
  onToggle: (seat: number) => void;
}

// Large toggle buttons, one per seat
export const SeatButtons: FC<SeatButtonsProps> = ({
  room,
  selected,
  disabled = [],
  onToggle
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={
        room.rule.players === 4
          ? 'grid grid-cols-2 gap-2'
          : 'grid grid-cols-3 gap-2'
      }
    >
      {room.seats.map((_, seat) => (
        <button
          key={seat}
          type="button"
          aria-pressed={selected.includes(seat)}
          disabled={disabled.includes(seat)}
          className={
            selected.includes(seat)
              ? 'truncate rounded-lg border border-primary-700 bg-primary-700 px-2 py-3 font-bold text-white shadow-sm transition'
              : 'truncate rounded-lg border border-stone-300 bg-white px-2 py-3 shadow-sm transition hover:bg-stone-100 disabled:opacity-30 dark:border-stone-700 dark:bg-stone-950 dark:hover:bg-stone-800'
          }
          onClick={() => onToggle(seat)}
        >
          {seatName(room, seat, t)}
        </button>
      ))}
    </div>
  );
};
