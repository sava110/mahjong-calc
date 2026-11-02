import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdSend } from 'react-icons/md';
import { useRoom } from '../contexts/room';
import { useStore } from '../contexts/store';
import { sumOfFu } from '../lib/fu';
import type { Hora } from '../lib/hora';
import { currentGameState } from '../lib/room/game';
import { ceil10, horaBasePoint } from '../lib/score';
import { sumBy } from '../lib/util';
import { FuDetail } from './FuDetail';
import { HoraItemSummary } from './HoraItemSummary';
import { PointDiff } from './PointDiff';
import { Score } from './Score';
import { ScorePlusList } from './ScorePlusList';
import { YakuList } from './YakuList';

interface HoraItemProps {
  info: Hora;
}

// Sends this win to the room being played, if any
const SendToRoom: FC<HoraItemProps> = ({ info }) => {
  const { t } = useTranslation();
  const [{ currentRule, handOptions }, dispatch] = useStore();
  const { current, room, setPendingHora } = useRoom();
  const game = room?.games[room.games.length - 1];
  if (
    room === null ||
    game === undefined ||
    // Spectators cannot record results
    typeof current?.seat !== 'number' ||
    currentGameState(game, room.rule).finished
  )
    return null;
  const base = horaBasePoint(info, currentRule);
  if (base === 0) return null;
  const yakuman = sumBy(info.yaku, y => (y.type === 'yakuman' ? y.point : 0));
  const send = () => {
    setPendingHora({
      by: info.by,
      base,
      yakuman,
      han:
        yakuman > 0
          ? null
          : sumBy(info.yaku, y => (y.type === 'yaku' ? y.han : 0)),
      fu:
        yakuman > 0
          ? null
          : info.type === 'mentsu'
            ? ceil10(sumOfFu(info.fu))
            : info.type === 'chitoitsu'
              ? 25
              : null,
      riichi: handOptions.riichi !== 'none'
    });
    dispatch({ type: 'set-current-screen', payload: 'room' });
  };
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 border-t border-stone-200 py-2 text-sm font-bold text-primary-700 transition hover:bg-stone-100 dark:border-stone-700 dark:text-primary-300 dark:hover:bg-stone-700"
      onClick={send}
    >
      <MdSend />
      {t('room.send-to-room', { name: room.name || t('room.untitled') })}
    </button>
  );
};

export const HoraItem: FC<HoraItemProps> = ({ info }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm dark:bg-stone-800">
      <button
        type="button"
        onClick={() => setOpen(open => !open)}
        className="peer"
      >
        <HoraItemSummary info={info} />
      </button>
      {open && (
        <>
          <div className="mx-2 border-t border-stone-200 transition peer-hover:opacity-0 dark:border-stone-800" />
          <FuDetail
            fu={
              info.type === 'mentsu'
                ? info.fu
                : info.type === 'chitoitsu'
                  ? 'chitoitsu'
                  : void 0
            }
          />
          <YakuList yaku={info.yaku} />
          <Score info={info} />
          <ScorePlusList info={info} />
          <PointDiff info={info} />
        </>
      )}
      <SendToRoom info={info} />
    </div>
  );
};
