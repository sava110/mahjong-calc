import type { CSSProperties, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import { useFullscreenMode } from '../../hooks/fullscreen';
import Stick100 from '../../images/point-stick/100.svg?react';
import Stick1000 from '../../images/point-stick/1000.svg?react';
import { type GameState, seatWind } from '../../lib/room/game';
import type { Room } from '../../lib/room/types';
import { Button } from '../ui/Button';
import { Led } from './Led';
import { roundLabel, seatName } from './format';

interface ScoreDisplayProps {
  room: Room;
  state: GameState;
  gameIndex: number;
  // null for spectators, who see every seat alike
  mySeat: number | null;
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
          ? 'rounded bg-primary-600 px-1 font-bold text-white'
          : 'rounded bg-stone-700 px-1 text-stone-200'
      }
    >
      {t(`table-settings.${seatWind(seat, state.dealer, players)}`)}
    </span>
  );
};

const CenterInfo: FC<{ state: GameState; gameIndex: number }> = ({
  state,
  gameIndex
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="text-xs text-stone-400">
        {t('room.game-n', { n: gameIndex + 1 })}
      </div>
      <div className="text-lg font-bold">{roundLabel(state, t)}</div>
      <div className="flex items-center gap-1 text-sm">
        <Stick100 className="w-8" />
        <Led value={state.honba} />
      </div>
      <div className="flex items-center gap-1 text-sm">
        <Stick1000 className="w-8" />
        <Led value={state.deposit} />
      </div>
    </div>
  );
};

interface ViewProps {
  room: Room;
  state: GameState;
  gameIndex: number;
  // The seat at the bottom
  viewSeat: number;
  // Turn each seat's panel to face its player, for a phone lying in the
  // middle of the table
  facePlayers: boolean;
  // Highlight the bottom seat as yours
  isYou: boolean;
  showDiff: boolean;
}

// Degrees to turn a panel so that it reads upright from each side
type Turn = 0 | 90 | 180 | 270;

const SeatPanel: FC<
  Omit<ViewProps, 'gameIndex' | 'viewSeat' | 'facePlayers'> & {
    seat: number;
    turn: Turn;
    area: string;
    bottomScore: number;
  }
> = ({ room, state, seat, turn, area, isYou, showDiff, bottomScore }) => {
  const { t } = useTranslation();
  const score = state.scores[seat] ?? 0;
  const you = isYou && turn === 0;
  const sideways = turn === 90 || turn === 270;
  // Container query units of the cell; a sideways panel swaps its axes
  const pw = sideways ? 'cqh' : 'cqw';
  const ph = sideways ? 'cqw' : 'cqh';
  const panel: CSSProperties = {
    width: `100${pw}`,
    height: `100${ph}`,
    transform: `translate(-50%, -50%) rotate(${turn}deg)`
  };
  return (
    <div className={`relative min-h-0 min-w-0 [container-type:size] ${area}`}>
      <div
        className={`absolute top-1/2 left-1/2 flex flex-col items-center justify-center gap-[0.3em] rounded-xl bg-stone-900 ring-1 ${
          you ? 'ring-primary-700' : 'ring-stone-800'
        }`}
        style={panel}
      >
        <div
          className="flex max-w-full items-center gap-1 px-2 text-stone-300"
          style={{ fontSize: `max(11px, min(5${pw}, 14${ph}))` }}
        >
          <WindBadge seat={seat} state={state} players={room.rule.players} />
          <span className="truncate">{seatName(room, seat, t)}</span>
          {you && <span className="text-stone-500">{t('room.you')}</span>}
        </div>
        <div style={{ fontSize: `min(15${pw}, 45${ph})` }}>
          {showDiff && !you ? (
            <Led value={score - bottomScore} signed />
          ) : (
            <Led value={score} />
          )}
        </div>
      </div>
    </div>
  );
};

// Seats around the table, with the next player on the right and, in
// four-player games, the one opposite at the top
const TableView: FC<ViewProps> = props => {
  const { room, state, gameIndex, viewSeat, facePlayers } = props;
  const { players } = room.rule;
  const at = (offset: number) => (viewSeat + offset) % players;
  const turn = (t: Turn): Turn => (facePlayers ? t : 0);
  const panel = (offset: number, t: Turn, area: string) => (
    <SeatPanel
      {...props}
      seat={at(offset)}
      turn={turn(t)}
      area={area}
      bottomScore={state.scores[viewSeat] ?? 0}
    />
  );
  return (
    <div
      className={`grid h-full w-full grid-cols-3 gap-2 ${
        players === 4
          ? 'grid-rows-[1fr_2fr_1fr] [grid-template-areas:"top_top_top"_"left_center_right"_"bottom_bottom_bottom"]'
          : 'grid-rows-[2fr_1fr] [grid-template-areas:"left_center_right"_"bottom_bottom_bottom"]'
      }`}
    >
      {players === 4 && panel(2, 180, '[grid-area:top]')}
      {panel(players - 1, 90, '[grid-area:left]')}
      <div className="flex min-h-0 items-center justify-center [grid-area:center]">
        <CenterInfo state={state} gameIndex={gameIndex} />
      </div>
      {panel(1, 270, '[grid-area:right]')}
      {panel(0, 0, '[grid-area:bottom]')}
    </div>
  );
};

// The everyday view for players: you at the bottom in large digits
const CompactView: FC<ViewProps> = ({
  room,
  state,
  gameIndex,
  viewSeat,
  showDiff
}) => {
  const { t } = useTranslation();
  const { players } = room.rule;
  const at = (offset: number) => (viewSeat + offset) % players;
  const myScore = state.scores[viewSeat] ?? 0;

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
        <div className="text-lg sm:text-2xl">
          {showDiff ? (
            <Led value={score - myScore} signed />
          ) : (
            <Led value={score} />
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={
          players === 4
            ? 'grid grid-cols-3 gap-2 [grid-template-areas:"._top_."_"left_center_right"]'
            : 'grid grid-cols-3 gap-2 [grid-template-areas:"left_center_right"]'
        }
      >
        {players === 4 && opponent(at(2), '[grid-area:top]')}
        {opponent(at(players - 1), '[grid-area:left]')}
        <div className="flex items-center justify-center [grid-area:center]">
          <CenterInfo state={state} gameIndex={gameIndex} />
        </div>
        {opponent(at(1), '[grid-area:right]')}
      </div>
      <div className="mt-3 flex flex-col items-center gap-1 rounded-xl bg-stone-900 py-3 ring-1 ring-primary-700">
        <div className="flex items-center gap-2 text-sm text-stone-300">
          <WindBadge seat={viewSeat} state={state} players={players} />
          <span className="truncate">{seatName(room, viewSeat, t)}</span>
          <span className="text-xs text-stone-500">{t('room.you')}</span>
        </div>
        <div className="text-4xl sm:text-5xl">
          <Led value={myScore} />
        </div>
      </div>
    </>
  );
};

const frame =
  'rounded-2xl bg-black p-3 text-left text-white shadow-lg [-webkit-tap-highlight-color:transparent]';

export const ScoreDisplay: FC<ScoreDisplayProps> = ({
  room,
  state,
  gameIndex,
  mySeat,
  mode,
  onToggleMode
}) => {
  const { t } = useTranslation();
  const fullscreen = useFullscreenMode();
  const spectator = mySeat === null;
  const view: ViewProps = {
    room,
    state,
    gameIndex,
    viewSeat: mySeat ?? 0,
    facePlayers: spectator,
    isYou: !spectator,
    // Spectators have no seat to measure differences from
    showDiff: !spectator && mode === 'diff'
  };
  const caption = spectator
    ? t('room.spectating')
    : mode === 'diff'
      ? t('room.showing-diff')
      : t('room.showing-score');

  // Only the scores, over the whole page
  if (fullscreen.active)
    return (
      <div className="fixed inset-0 z-50 bg-black pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] text-white">
        {spectator ? (
          <TableView {...view} />
        ) : (
          <button
            type="button"
            aria-label={caption}
            className="h-full w-full text-left [-webkit-tap-highlight-color:transparent]"
            onClick={onToggleMode}
          >
            <TableView {...view} />
          </button>
        )}
        <button
          type="button"
          aria-label={t('room.exit-fullscreen')}
          title={t('room.exit-fullscreen')}
          className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-[max(0.5rem,env(safe-area-inset-right))] rounded-full bg-stone-800/80 p-2 text-2xl text-stone-300"
          onClick={fullscreen.exit}
        >
          <MdFullscreenExit />
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-1">
      {spectator ? (
        <div className={frame}>
          <div className="aspect-square w-full">
            <TableView {...view} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`w-full ${frame}`}
          onClick={onToggleMode}
        >
          <CompactView {...view} />
        </button>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-stone-500">{caption}</span>
        <Button onClick={fullscreen.enter}>
          <MdFullscreen />
          {t('room.fullscreen')}
        </Button>
      </div>
    </div>
  );
};
