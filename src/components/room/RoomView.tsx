import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdPersonAdd, MdUndo } from 'react-icons/md';
import {
  type HoraPrefill,
  type SendResult,
  useRoom
} from '../../contexts/room';
import { currentGameState, finalResult, replayGame } from '../../lib/room/game';
import type { Room, RoomEvent, RoomOp } from '../../lib/room/types';
import { Button } from '../ui/Button';
import { ChangePinSheet } from './ChangePinSheet';
import { History } from './History';
import { HoraDialog } from './HoraDialog';
import { InviteSheet } from './InviteSheet';
import { ResultTable } from './ResultTable';
import { RyukyokuDialog } from './RyukyokuDialog';
import { ScoreDisplay } from './ScoreDisplay';
import { formatResultPoint, seatName } from './format';

const cardClasses =
  'flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800';

interface RoomViewProps {
  room: Room;
  // null for spectators, who can only watch
  mySeat: number | null;
}

export const RoomView: FC<RoomViewProps> = ({ room, mySeat }) => {
  const { t } = useTranslation();
  const {
    send,
    leave,
    setSeat,
    remove,
    current,
    pendingHora,
    setPendingHora,
    showInvite,
    setShowInvite
  } = useRoom();
  const [mode, setMode] = useState<'diff' | 'score'>('diff');
  const [dialog, setDialog] = useState<
    | { type: 'hora'; prefill: HoraPrefill | null }
    | { type: 'ryukyoku' }
    | { type: 'invite' }
    | { type: 'change-pin' }
    | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const spectator = mySeat === null;

  // Invite the others right after creating the room
  useEffect(() => {
    if (showInvite) setDialog({ type: 'invite' });
  }, [showInvite]);

  // A win sent from the calculator screen
  useEffect(() => {
    if (pendingHora === null) return;
    setDialog({ type: 'hora', prefill: pendingHora });
    setPendingHora(null);
  }, [pendingHora, setPendingHora]);

  const gameIndex = room.games.length - 1;
  const game = room.games[gameIndex];
  if (game === undefined) return null;
  const states = replayGame(game, room.rule);
  const state = currentGameState(game, room.rule);

  const report = (result: SendResult) => {
    setMessage(
      result === 'ok'
        ? null
        : result === 'conflict'
          ? t('room.conflict')
          : t('room.send-error')
    );
    return result === 'ok';
  };
  const run = async (op: RoomOp) => report(await send(op));
  const submit = async (event: RoomEvent) => {
    // The dialog closes either way; a conflict is explained in the message
    await run({ type: 'append', game: gameIndex, event });
    setDialog(null);
  };

  return (
    <div className="flex flex-col gap-3 p-3 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] md:mx-auto md:max-w-xl">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">
            {room.name || t('room.untitled')}
          </div>
          <div className="text-xs text-stone-500">
            {t('room.code')}{' '}
            <span className="font-mono text-sm font-bold tracking-widest text-stone-700 dark:text-stone-300">
              {room.id}
            </span>
          </div>
        </div>
        {current?.pin != null && (
          <Button onClick={() => setDialog({ type: 'invite' })}>
            <MdPersonAdd />
            {t('room.invite')}
          </Button>
        )}
      </div>

      <ScoreDisplay
        room={room}
        state={state}
        gameIndex={gameIndex}
        mySeat={mySeat}
        mode={mode}
        onToggleMode={() => setMode(m => (m === 'diff' ? 'score' : 'diff'))}
      />

      {message !== null && (
        <div
          aria-live="polite"
          className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
        >
          {message}
        </div>
      )}

      {!state.finished && !spectator && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-xl bg-primary-700 py-4 text-lg font-bold text-white shadow-sm transition active:bg-primary-800"
            onClick={() => setDialog({ type: 'hora', prefill: null })}
          >
            {t('room.hora')}
          </button>
          <button
            type="button"
            className="rounded-xl bg-stone-700 py-4 text-lg font-bold text-white shadow-sm transition active:bg-stone-800"
            onClick={() => setDialog({ type: 'ryukyoku' })}
          >
            {t('room.ryukyoku')}
          </button>
        </div>
      )}

      {state.finished && (
        <section className={cardClasses}>
          <h2 className="font-bold">{t('room.final-result')}</h2>
          <ResultTable room={room} results={finalResult(state, room.rule)} />
          {!spectator && (
            <button
              type="button"
              className="rounded-xl bg-primary-700 py-3 font-bold text-white shadow-sm"
              onClick={() => run({ type: 'new-game' })}
            >
              {t('room.next-game')}
            </button>
          )}
        </section>
      )}

      <section className={cardClasses}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t('room.history')}</h2>
          {!spectator && (
            <Button
              disabled={game.events.length === 0 && game.finishedAt === null}
              onClick={() => {
                if (window.confirm(t('room.undo-confirm')))
                  run({ type: 'undo', game: gameIndex });
              }}
            >
              <MdUndo />
              {t('room.undo')}
            </Button>
          )}
        </div>
        <History room={room} events={game.events} states={states} />
      </section>

      {gameIndex > 0 && (
        <section className={cardClasses}>
          <h2 className="font-bold">{t('room.past-games')}</h2>
          <ol className="flex flex-col gap-1 text-sm">
            {room.games.slice(0, -1).map((g, i) => (
              <li key={i} className="flex flex-wrap gap-x-3">
                <span className="text-stone-500">
                  {t('room.game-n', { n: i + 1 })}
                </span>
                {finalResult(currentGameState(g, room.rule), room.rule).map(
                  r => (
                    <span key={r.seat}>
                      {seatName(room, r.seat, t)} {formatResultPoint(r.point)}
                    </span>
                  )
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={`${cardClasses} text-sm`}>
        {!state.finished && !spectator && (
          <button
            type="button"
            className="py-2 text-left"
            onClick={() => {
              if (window.confirm(t('room.finish-confirm')))
                run({ type: 'finish-game', game: gameIndex });
            }}
          >
            {t('room.finish-game')}
          </button>
        )}
        <button
          type="button"
          className="py-2 text-left"
          onClick={() => setSeat(null)}
        >
          {spectator ? t('room.take-seat') : t('room.change-seat')}
        </button>
        <button type="button" className="py-2 text-left" onClick={leave}>
          {t('room.leave')}
        </button>
        {current?.ownerToken != null && (
          <button
            type="button"
            className="py-2 text-left"
            onClick={() => setDialog({ type: 'change-pin' })}
          >
            {t('room.change-pin')}
          </button>
        )}
        {current?.ownerToken != null && (
          <button
            type="button"
            className="py-2 text-left text-red-600 dark:text-red-400"
            onClick={() => {
              if (window.confirm(t('room.delete-confirm'))) remove();
            }}
          >
            {t('room.delete')}
          </button>
        )}
      </section>

      {dialog?.type === 'hora' && mySeat !== null && (
        <HoraDialog
          room={room}
          state={state}
          mySeat={mySeat}
          prefill={dialog.prefill}
          onSubmit={submit}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'invite' && current?.pin != null && (
        <InviteSheet
          room={room}
          pin={current.pin}
          justCreated={showInvite}
          onClose={() => {
            setShowInvite(false);
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === 'change-pin' && (
        <ChangePinSheet
          onDone={changed =>
            // Share the new PIN straight away
            setDialog(changed ? { type: 'invite' } : null)
          }
        />
      )}
      {dialog?.type === 'ryukyoku' && !spectator && (
        <RyukyokuDialog
          room={room}
          state={state}
          onSubmit={submit}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
};
