import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type GameState, ryukyokuDeltas } from '../../lib/room/game';
import type { Room, RoomEvent } from '../../lib/room/types';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { DeltaPreview } from './DeltaPreview';
import { SeatButtons } from './SeatButtons';

interface RyukyokuDialogProps {
  room: Room;
  state: GameState;
  onSubmit: (event: RoomEvent) => void;
  onClose: () => void;
}

const toggle = (list: number[], seat: number) =>
  list.includes(seat) ? list.filter(s => s !== seat) : [...list, seat];

export const RyukyokuDialog: FC<RyukyokuDialogProps> = ({
  room,
  state,
  onSubmit,
  onClose
}) => {
  const { t } = useTranslation();
  const [tenpai, setTenpai] = useState<number[]>([]);
  const [riichi, setRiichi] = useState<number[]>([]);
  const args = { riichi, tenpai };
  const deltas = ryukyokuDeltas(room.rule, args);

  return (
    <Sheet
      title={t('room.ryukyoku')}
      onClose={onClose}
      footer={
        <>
          <div className="flex-1">
            <Button onClick={onClose}>{t('room.cancel')}</Button>
          </div>
          <button
            type="button"
            className="rounded-lg bg-primary-700 px-6 py-2 font-bold text-white shadow-sm transition hover:bg-primary-600"
            onClick={() =>
              onSubmit({ type: 'ryukyoku', at: Date.now(), ...args, deltas })
            }
          >
            {t('room.confirm')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">{t('room.tenpai')}</h3>
          <SeatButtons
            room={room}
            selected={tenpai}
            onToggle={s => setTenpai(l => toggle(l, s))}
          />
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">{t('room.riichi')}</h3>
          <SeatButtons
            room={room}
            selected={riichi}
            onToggle={s => setRiichi(l => toggle(l, s))}
          />
        </section>
        <DeltaPreview room={room} state={state} deltas={deltas} />
      </div>
    </Sheet>
  );
};
