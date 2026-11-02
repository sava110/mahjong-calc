import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import Stick100 from '../../images/point-stick/100.svg?react';
import Stick1000 from '../../images/point-stick/1000.svg?react';
import { type GameState, seatWind } from '../../lib/room/game';
import type { Room } from '../../lib/room/types';
import { formatPoints, formatSigned, roundLabel, seatName } from './format';

interface ScoreDisplayProps {
  room: Room;
  state: GameState;
  gameIndex: number;
  mySeat: number;
  mode: 'diff' | 'score';
  onToggleMode: () => void;
}

const WindBadge: FC<{ seat: number; state: GameState; players: number }> = ({
  seat,
  state,
  players
}) => {
  const { t } = useTranslation();
  const isDealer = seat === state.dealer;
  return (
    <span
      className={
        isDealer
          ? 'rounded bg-primary-600 px-1 text-xs font-bold text-white'
          : 'rounded bg-stone-700 px-1 text-xs text-stone-200'
      }
    >
      {t(`table-settings.${seatWind(seat, state.dealer, players)}`)}
    </span>
  );
};

// Seen from your seat: the next player sits on the right, and in
// four-player games the one opposite at the top
export const ScoreDisplay: FC<ScoreDisplayProps> = ({
  room,
  state,
  gameIndex,
  mySeat,
  mode,
  onToggleMode
}) => {
  const { t } = useTranslation();
  const { players } = room.rule;
  const at = (offset: number) => (mySeat + offset) % players;
  const myScore = state.scores[mySeat] ?? 0;

  const opponent = (seat: number, area: string) => {
    const score = state.scores[seat] ?? 0;
    return (
      <div
        className={`flex min-w-0 flex-col items-center gap-1 rounded-xl bg-stone-900 px-2 py-2 ring-1 ring-stone-800 ${area}`}
      >
        <div className="flex max-w-full items-center gap-1 text-xs text-stone-300">
          <WindBadge seat={seat} state={state} players={players} />
          <span className="truncate">{seatName(room, seat, t)}</span>
        </div>
        <div className="led text-xl font-bold sm:text-2xl">
          {mode === 'diff'
            ? formatSigned(score - myScore)
            : formatPoints(score)}
        </div>
      </div>
    );
  };

  return (
    <button
      type="button"
      className="w-full rounded-2xl bg-black p-3 text-left text-white shadow-lg [-webkit-tap-highlight-color:transparent]"
      onClick={onToggleMode}
    >
      <div
        className={
          players === 4
            ? 'grid grid-cols-3 gap-2 [grid-template-areas:"._top_."_"left_center_right"]'
            : 'grid grid-cols-3 gap-2 [grid-template-areas:"left_center_right"]'
        }
      >
        {players === 4 && opponent(at(2), '[grid-area:top]')}
        {opponent(at(players - 1), '[grid-area:left]')}
        <div className="flex flex-col items-center justify-center gap-1 [grid-area:center]">
          <div className="text-xs text-stone-400">
            {t('room.game-n', { n: gameIndex + 1 })}
          </div>
          <div className="text-lg font-bold">{roundLabel(state, t)}</div>
          <div className="flex items-center gap-1 text-sm">
            <Stick100 className="w-8" />
            <span className="led">{state.honba}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Stick1000 className="w-8" />
            <span className="led">{state.deposit}</span>
          </div>
        </div>
        {opponent(at(1), '[grid-area:right]')}
      </div>
      <div className="mt-3 flex flex-col items-center gap-1 rounded-xl bg-stone-900 py-3 ring-1 ring-primary-700">
        <div className="flex items-center gap-2 text-sm text-stone-300">
          <WindBadge seat={mySeat} state={state} players={players} />
          <span className="truncate">{seatName(room, mySeat, t)}</span>
          <span className="text-xs text-stone-500">{t('room.you')}</span>
        </div>
        <div className="led text-5xl font-bold">{formatPoints(myScore)}</div>
      </div>
      <div className="mt-2 text-center text-xs text-stone-500">
        {mode === 'diff' ? t('room.showing-diff') : t('room.showing-score')}
      </div>
    </button>
  );
};
