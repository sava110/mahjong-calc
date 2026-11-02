import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoom } from '../../contexts/room';
import { useStore } from '../../contexts/store';
import { RoomApiError, randomPin } from '../../lib/room/api';
import { isPin } from '../../lib/room/ops';
import type { RoomRule } from '../../lib/room/types';
import { Segment } from '../ui/Segment';
import { PinInput } from './PinInput';

const umaPresets = {
  4: [
    [0, 0, 0, 0],
    [10, 5, -5, -10],
    [20, 10, -10, -20],
    [30, 10, -10, -30],
    [30, 20, -20, -30]
  ],
  3: [
    [0, 0, 0],
    [10, 0, -10],
    [20, 0, -20]
  ]
} as const;
const defaultUma = { 4: 3, 3: 2 } as const;
const defaultPoints = {
  4: { start: 25000, return: 30000 },
  3: { start: 35000, return: 40000 }
} as const;
const winds = ['east', 'south', 'west', 'north'] as const;

const inputClasses =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-950';

const umaLabel = (uma: readonly number[]) =>
  uma.every(u => u === 0)
    ? null
    : uma.length === 4
      ? `${uma[1]}-${uma[0]}`
      : `${uma[0]}`;

export const CreateRoomForm: FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const { t } = useTranslation();
  const [{ currentRule }] = useStore();
  const { create } = useRoom();
  const [players, setPlayers] = useState<3 | 4>(currentRule.players);
  const [name, setName] = useState('');
  const [seats, setSeats] = useState(['', '', '', '']);
  const [startPoints, setStartPoints] = useState<number>(
    defaultPoints[currentRule.players].start
  );
  const [returnPoints, setReturnPoints] = useState<number>(
    defaultPoints[currentRule.players].return
  );
  const [umaIndex, setUmaIndex] = useState<number>(
    defaultUma[currentRule.players]
  );
  const [length, setLength] = useState<RoomRule['length']>('hanchan');
  const [tobi, setTobi] = useState(true);
  const [pin, setPin] = useState(randomPin);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changePlayers = (p: 3 | 4) => {
    setPlayers(p);
    setStartPoints(defaultPoints[p].start);
    setReturnPoints(defaultPoints[p].return);
    setUmaIndex(defaultUma[p]);
  };

  const pointsValid = (n: number) =>
    Number.isInteger(n) && n >= 100 && n <= 1_000_000 && n % 100 === 0;

  const submit = async () => {
    const uma = umaPresets[players][umaIndex];
    if (uma === undefined) return;
    setBusy(true);
    setError(null);
    try {
      await create(pin, {
        name: name.trim(),
        seats: seats.slice(0, players).map(s => s.trim()),
        rule: {
          players,
          startPoints,
          returnPoints,
          uma: [...uma],
          length,
          tobi,
          honbaBonus: currentRule.honbaBonus,
          sanmaTsumo: currentRule.sanmaTsumo,
          roundedMangan: currentRule.roundedMangan
        }
      });
    } catch (e) {
      setError(
        e instanceof RoomApiError && e.status === 429
          ? t('room.error-too-many-rooms')
          : t('room.send-error')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="font-bold">{t('room.room-name')}</span>
        <input
          className={inputClasses}
          value={name}
          maxLength={20}
          placeholder={t('room.room-name-placeholder')}
          onChange={e => setName(e.target.value)}
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="font-bold">{t('table-settings.players')}</span>
        <Segment
          items={[t('table-settings.players-4'), t('table-settings.players-3')]}
          index={players === 4 ? 0 : 1}
          onChange={i => changePlayers(i === 0 ? 4 : 3)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-bold">{t('room.seats')}</span>
        <span className="text-xs text-stone-500">{t('room.seats-help')}</span>
        {winds.slice(0, players).map((w, i) => (
          <label key={w} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-center">
              {t(`table-settings.${w}`)}
            </span>
            <input
              className={inputClasses}
              value={seats[i]}
              maxLength={20}
              placeholder={t('room.player-n', { n: i + 1 })}
              onChange={e =>
                setSeats(s => s.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-bold">{t('room.start-points')}</span>
          <input
            className={inputClasses}
            type="number"
            inputMode="numeric"
            step={1000}
            value={startPoints}
            onChange={e => setStartPoints(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-bold">{t('room.return-points')}</span>
          <input
            className={inputClasses}
            type="number"
            inputMode="numeric"
            step={1000}
            value={returnPoints}
            onChange={e => setReturnPoints(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-bold">{t('room.uma')}</span>
        <Segment
          items={umaPresets[players].map(u => umaLabel(u) ?? t('room.none'))}
          index={umaIndex}
          onChange={setUmaIndex}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-bold">{t('room.length')}</span>
        <Segment
          items={[t('room.tonpu'), t('room.hanchan')]}
          index={length === 'tonpu' ? 0 : 1}
          onChange={i => setLength(i === 0 ? 'tonpu' : 'hanchan')}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-bold">{t('room.tobi')}</span>
        <Segment
          items={[t('room.off'), t('room.on')]}
          index={tobi ? 1 : 0}
          onChange={i => setTobi(i === 1)}
        />
      </div>
      <p className="text-xs text-stone-500">{t('room.rule-from-calculator')}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor="room-pin" className="font-bold">
          {t('room.pin')}
        </label>
        <span className="text-xs text-stone-500">{t('room.pin-help')}</span>
        <div className="flex gap-2">
          <PinInput id="room-pin" value={pin} onChange={setPin} />
          <button
            type="button"
            className="shrink-0 rounded-lg border border-stone-300 px-3 text-sm dark:border-stone-700"
            onClick={() => setPin(randomPin())}
          >
            {t('room.pin-shuffle')}
          </button>
        </div>
      </div>
      {error !== null && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg border border-stone-300 py-3 dark:border-stone-700"
          onClick={onCancel}
        >
          {t('room.cancel')}
        </button>
        <button
          type="submit"
          disabled={
            busy ||
            !isPin(pin) ||
            !pointsValid(startPoints) ||
            !pointsValid(returnPoints)
          }
          className="flex-1 rounded-lg bg-primary-700 py-3 font-bold text-white disabled:opacity-30"
        >
          {t('room.create')}
        </button>
      </div>
    </form>
  );
};
