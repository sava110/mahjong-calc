import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameState } from '../../lib/room/game';
import type { Room } from '../../lib/room/types';
import { formatPoints, formatSigned, seatName } from './format';

interface DeltaPreviewProps {
  room: Room;
  state: GameState;
  deltas: number[];
}

// Score changes before confirming an input
export const DeltaPreview: FC<DeltaPreviewProps> = ({
  room,
  state,
  deltas
}) => {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-1 rounded-xl bg-stone-200 p-3 dark:bg-stone-800">
      <h3 className="text-sm font-bold">{t('room.preview')}</h3>
      {deltas.map((d, seat) => (
        <div key={seat} className="flex items-center gap-2 text-sm">
          <div className="flex-1 truncate">{seatName(room, seat, t)}</div>
          <div
            className={
              d > 0
                ? 'w-20 text-right font-bold text-emerald-700 tabular-nums dark:text-emerald-400'
                : d < 0
                  ? 'w-20 text-right font-bold text-primary-700 tabular-nums dark:text-primary-400'
                  : 'w-20 text-right text-stone-500 tabular-nums'
            }
          >
            {formatSigned(d)}
          </div>
          <div className="w-20 text-right tabular-nums">
            {formatPoints((state.scores[seat] ?? 0) + d)}
          </div>
        </div>
      ))}
    </section>
  );
};
