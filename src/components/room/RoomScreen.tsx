import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoom } from '../../contexts/room';
import { RoomLobby } from './RoomLobby';
import { RoomView } from './RoomView';
import { SeatPicker } from './SeatPicker';

export const RoomScreen: FC = () => {
  const { t } = useTranslation();
  const { current, room, status, leave } = useRoom();

  if (current !== null && room === null) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        {status === 'loading' || status === 'idle' ? (
          <p className="text-stone-500">{t('room.loading')}</p>
        ) : (
          <>
            <p>
              {status === 'not-found' ? t('room.not-found') : t('room.offline')}
            </p>
            <button
              type="button"
              className="rounded-lg border border-stone-300 px-4 py-2 dark:border-stone-700"
              onClick={leave}
            >
              {t('room.back-to-lobby')}
            </button>
          </>
        )}
      </div>
    );
  }
  if (current === null || room === null) return <RoomLobby />;
  if (current.seat === null || current.seat >= room.rule.players)
    return <SeatPicker room={room} />;
  return (
    <>
      {status === 'offline' && (
        <div className="bg-amber-100 px-3 py-1 text-center text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
          {t('room.offline')}
        </div>
      )}
      <RoomView room={room} mySeat={current.seat} />
    </>
  );
};
