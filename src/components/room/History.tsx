import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameState } from '../../lib/room/game';
import type { Room, RoomEvent } from '../../lib/room/types';
import { formatSigned, handLabel, roundLabel, seatName } from './format';

interface HistoryProps {
  room: Room;
  events: RoomEvent[];
  // State before each event
  states: GameState[];
}

export const History: FC<HistoryProps> = ({ room, events, states }) => {
  const { t } = useTranslation();
  const name = (seat: number) => seatName(room, seat, t);

  const describe = (event: RoomEvent) => {
    switch (event.type) {
      case 'hora':
        return event.wins
          .map(w =>
            [
              name(w.winner),
              event.loser === null
                ? t('room.tsumo')
                : t('room.ron-from', { name: name(event.loser) }),
              handLabel(w, t)
            ]
              .filter(s => s !== '')
              .join(' ')
          )
          .join(' / ');
      case 'ryukyoku':
        return event.tenpai.length === 0
          ? t('room.ryukyoku-all-noten')
          : t('room.ryukyoku-tenpai', {
              names: event.tenpai.map(name).join('・')
            });
      case 'adjust':
        return event.note;
    }
  };

  if (events.length === 0)
    return <p className="text-sm text-stone-500">{t('room.no-history')}</p>;

  return (
    <ol className="flex flex-col gap-2">
      {events
        .map((event, i) => ({ event, state: states[i] as GameState, i }))
        .reverse()
        .map(({ event, state, i }) => (
          <li
            key={i}
            className="flex flex-col gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800"
          >
            <div className="flex items-baseline justify-between gap-2 text-xs text-stone-500">
              <span>
                {roundLabel(state, t)} {t('room.honba', { count: state.honba })}
              </span>
              {event.type !== 'adjust' && event.riichi.length > 0 && (
                <span>
                  {t('room.riichi-by', {
                    names: event.riichi.map(name).join('・')
                  })}
                </span>
              )}
            </div>
            <div className="font-bold">{describe(event)}</div>
            <div className="flex flex-wrap gap-x-3 text-sm tabular-nums">
              {event.deltas.map((d, seat) =>
                d === 0 ? null : (
                  <span key={seat}>
                    {name(seat)}{' '}
                    <span
                      className={
                        d > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-primary-700 dark:text-primary-400'
                      }
                    >
                      {formatSigned(d)}
                    </span>
                  </span>
                )
              )}
            </div>
          </li>
        ))}
    </ol>
  );
};
