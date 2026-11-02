import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HoraPrefill } from '../../contexts/room';
import { type GameState, horaDeltas, winBase } from '../../lib/room/game';
import type { Room, RoomEvent, RoomWin } from '../../lib/room/types';
import { Button } from '../ui/Button';
import { Segment } from '../ui/Segment';
import { Sheet } from '../ui/Sheet';
import { DeltaPreview } from './DeltaPreview';
import { SeatButtons } from './SeatButtons';
import { handLabel, seatName, winPointsLabel } from './format';

interface HandInput {
  mode: 'hanfu' | 'yakuman' | 'calculator';
  han: number;
  fu: number;
  yakuman: number;
  // Taken over from the calculator
  prefill: HoraPrefill | null;
}

const hanOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
const fuOptions = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110] as const;
const yakumanOptions = [1, 2, 3, 4, 5, 6] as const;

const defaultHand = (prefill: HoraPrefill | null = null): HandInput => ({
  mode: prefill === null ? 'hanfu' : 'calculator',
  han: 1,
  fu: 30,
  yakuman: 1,
  prefill
});

const toWin = (winner: number, hand: HandInput, room: Room): RoomWin => {
  if (hand.mode === 'calculator' && hand.prefill !== null) {
    const { base, han, fu, yakuman } = hand.prefill;
    return { winner, base, han, fu, yakuman };
  }
  const yakuman = hand.mode === 'yakuman' ? hand.yakuman : 0;
  const fu = hand.han >= 5 ? null : hand.fu;
  return {
    winner,
    base: winBase(room.rule, { han: hand.han, fu: hand.fu, yakuman }),
    han: yakuman > 0 ? null : hand.han,
    fu: yakuman > 0 ? null : fu,
    yakuman
  };
};

const Chips: FC<{
  options: readonly number[];
  value: number;
  label: (n: number) => string;
  onChange: (n: number) => void;
}> = ({ options, value, label, onChange }) => (
  <div className="flex flex-wrap gap-1">
    {options.map(n => (
      <button
        key={n}
        type="button"
        className={
          n === value
            ? 'min-w-12 rounded-lg bg-primary-700 px-2 py-2 text-sm font-bold text-white'
            : 'min-w-12 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm dark:border-stone-700 dark:bg-stone-950'
        }
        onClick={() => onChange(n)}
      >
        {label(n)}
      </button>
    ))}
  </div>
);

interface HoraDialogProps {
  room: Room;
  state: GameState;
  mySeat: number;
  prefill: HoraPrefill | null;
  onSubmit: (event: RoomEvent) => void;
  onClose: () => void;
}

export const HoraDialog: FC<HoraDialogProps> = ({
  room,
  state,
  mySeat,
  prefill,
  onSubmit,
  onClose
}) => {
  const { t } = useTranslation();
  const { players } = room.rule;
  const [by, setBy] = useState<'ron' | 'tsumo'>(prefill?.by ?? 'ron');
  const [winners, setWinners] = useState<number[]>(
    prefill === null ? [] : [mySeat]
  );
  const [loser, setLoser] = useState<number | null>(null);
  const [hands, setHands] = useState<Record<number, HandInput>>(
    prefill === null ? {} : { [mySeat]: defaultHand(prefill) }
  );
  const [riichi, setRiichi] = useState<number[]>(
    prefill?.riichi === true ? [mySeat] : []
  );

  const handOf = (seat: number) => hands[seat] ?? defaultHand();
  const setHand = (seat: number, patch: Partial<HandInput>) =>
    setHands(h => ({ ...h, [seat]: { ...handOf(seat), ...patch } }));

  const toggleWinner = (seat: number) => {
    if (by === 'tsumo') setWinners([seat]);
    else
      setWinners(w =>
        w.includes(seat) ? w.filter(s => s !== seat) : [...w, seat]
      );
    if (loser === seat) setLoser(null);
  };

  const wins = winners.map(w => toWin(w, handOf(w), room));
  const valid =
    winners.length > 0 &&
    (by === 'tsumo' ? winners.length === 1 : loser !== null) &&
    wins.every(w => w.base > 0);
  const args = { riichi, loser: by === 'ron' ? loser : null, wins };
  const deltas = valid ? horaDeltas(state, room.rule, args) : null;

  return (
    <Sheet
      title={t('room.hora')}
      onClose={onClose}
      footer={
        <>
          <div className="flex-1">
            <Button onClick={onClose}>{t('room.cancel')}</Button>
          </div>
          <button
            type="button"
            disabled={!valid}
            className="rounded-lg bg-primary-700 px-6 py-2 font-bold text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-30"
            onClick={() =>
              deltas !== null &&
              onSubmit({ type: 'hora', at: Date.now(), ...args, deltas })
            }
          >
            {t('room.confirm')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segment
          items={[t('room.ron'), t('room.tsumo')]}
          index={by === 'ron' ? 0 : 1}
          onChange={i => {
            const next = i === 0 ? 'ron' : 'tsumo';
            setBy(next);
            if (next === 'tsumo') setWinners(w => w.slice(0, 1));
          }}
        />
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">
            {by === 'ron' ? t('room.winners-ron') : t('room.winner')}
          </h3>
          <SeatButtons room={room} selected={winners} onToggle={toggleWinner} />
        </section>
        {by === 'ron' && (
          <section className="flex flex-col gap-2">
            <h3 className="font-bold">{t('room.loser')}</h3>
            <SeatButtons
              room={room}
              selected={loser === null ? [] : [loser]}
              disabled={winners}
              onToggle={s => setLoser(loser === s ? null : s)}
            />
          </section>
        )}
        {winners.map(seat => {
          const hand = handOf(seat);
          const win = toWin(seat, hand, room);
          const modes: HandInput['mode'][] =
            hand.prefill === null
              ? ['hanfu', 'yakuman']
              : ['calculator', 'hanfu', 'yakuman'];
          return (
            <section
              key={seat}
              className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate font-bold">
                  {t('room.hand-of', { name: seatName(room, seat, t) })}
                </h3>
                <div className="shrink-0 text-right">
                  <span className="text-sm text-stone-500">
                    {handLabel(win, t)}{' '}
                  </span>
                  <span className="font-bold">
                    {winPointsLabel(
                      win.base,
                      seat === state.dealer,
                      by,
                      room.rule,
                      t
                    )}
                  </span>
                </div>
              </div>
              <Segment
                items={modes.map(m => t(`room.mode-${m}`))}
                index={modes.indexOf(hand.mode)}
                onChange={i => setHand(seat, { mode: modes[i] ?? 'hanfu' })}
              />
              {hand.mode === 'hanfu' && (
                <>
                  <Chips
                    options={hanOptions}
                    value={hand.han}
                    label={n => t('scoring-table.han', { count: n })}
                    onChange={han => setHand(seat, { han })}
                  />
                  {hand.han < 5 && (
                    <Chips
                      options={fuOptions}
                      value={hand.fu}
                      label={n => t('scoring-table.fu', { count: n })}
                      onChange={fu => setHand(seat, { fu })}
                    />
                  )}
                </>
              )}
              {hand.mode === 'yakuman' && (
                <Chips
                  options={yakumanOptions}
                  value={hand.yakuman}
                  label={n =>
                    n === 1
                      ? t('room.yakuman')
                      : t('room.n-yakuman', { count: n })
                  }
                  onChange={yakuman => setHand(seat, { yakuman })}
                />
              )}
              {hand.mode === 'calculator' && (
                <p className="text-sm text-stone-500">
                  {t('room.from-calculator')}
                </p>
              )}
            </section>
          );
        })}
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">{t('room.riichi')}</h3>
          <SeatButtons
            room={room}
            selected={riichi}
            onToggle={s =>
              setRiichi(r =>
                r.includes(s) ? r.filter(x => x !== s) : [...r, s]
              )
            }
          />
        </section>
        {deltas !== null && (
          <DeltaPreview room={room} state={state} deltas={deltas} />
        )}
        {players === 3 && by === 'tsumo' && (
          <p className="text-xs text-stone-500">
            {t(`room.sanma-${room.rule.sanmaTsumo}`)}
          </p>
        )}
      </div>
    </Sheet>
  );
};
