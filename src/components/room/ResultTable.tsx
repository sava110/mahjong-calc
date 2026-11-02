import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinalResult } from '../../lib/room/game';
import type { Room } from '../../lib/room/types';
import { formatPoints, formatResultPoint, seatName } from './format';

interface ResultTableProps {
  room: Room;
  results: FinalResult[];
}

export const ResultTable: FC<ResultTableProps> = ({ room, results }) => {
  const { t } = useTranslation();
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-xs text-stone-500">
          <th className="py-1 text-left font-normal">{t('room.rank')}</th>
          <th className="py-1 text-left font-normal">{t('room.player')}</th>
          <th className="py-1 text-right font-normal">{t('room.score')}</th>
          <th className="py-1 text-right font-normal">{t('room.point')}</th>
        </tr>
      </thead>
      <tbody>
        {results.map(r => (
          <tr
            key={r.seat}
            className="border-t border-stone-200 dark:border-stone-700"
          >
            <td className="py-2 font-bold">{r.rank + 1}</td>
            <td className="max-w-32 truncate py-2">
              {seatName(room, r.seat, t)}
            </td>
            <td className="py-2 text-right">{formatPoints(r.score)}</td>
            <td
              className={
                r.point >= 0
                  ? 'py-2 text-right font-bold text-emerald-700 dark:text-emerald-400'
                  : 'py-2 text-right font-bold text-primary-700 dark:text-primary-400'
              }
            >
              {formatResultPoint(r.point)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
