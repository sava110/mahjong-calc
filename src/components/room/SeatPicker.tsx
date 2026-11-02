import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoom } from '../../contexts/room';
import type { Room } from '../../lib/room/types';
import { SeatButtons } from './SeatButtons';

export const SeatPicker: FC<{ room: Room }> = ({ room }) => {
  const { t } = useTranslation();
  const { setSeat, send, leave } = useRoom();
  const [seat, setSelected] = useState<number | null>(null);
  const [name, setName] = useState('');

  const join = async () => {
    if (seat === null) return;
    const trimmed = name.trim();
    if (trimmed !== '' && trimmed !== room.seats[seat])
      await send({ type: 'set-seat', seat, name: trimmed });
    setSeat(seat);
  };

  return (
    <div className="flex flex-col gap-3 p-3 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] md:mx-auto md:max-w-xl">
      <section className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800">
        <div>
          <h2 className="text-lg font-bold">
            {room.name || t('room.untitled')}
          </h2>
          <p className="text-sm text-stone-500">{t('room.pick-seat')}</p>
        </div>
        <SeatButtons
          room={room}
          selected={seat === null ? [] : [seat]}
          onToggle={s => {
            setSelected(s);
            setName(room.seats[s] ?? '');
          }}
        />
        {seat !== null && (
          <label className="flex flex-col gap-1">
            <span className="font-bold">{t('room.your-name')}</span>
            <input
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-950"
              value={name}
              maxLength={20}
              placeholder={t('room.player-n', { n: seat + 1 })}
              onChange={e => setName(e.target.value)}
            />
          </label>
        )}
        <button
          type="button"
          disabled={seat === null}
          className="rounded-lg bg-primary-700 py-3 font-bold text-white disabled:opacity-30"
          onClick={join}
        >
          {t('room.sit-here')}
        </button>
        <button type="button" className="py-2 text-sm" onClick={leave}>
          {t('room.back-to-lobby')}
        </button>
      </section>
    </div>
  );
};
