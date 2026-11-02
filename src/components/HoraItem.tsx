import { type FC, useState } from 'react';
import type { Hora } from '../lib/hora';
import { FuDetail } from './FuDetail';
import { HoraItemSummary } from './HoraItemSummary';
import { PointDiff } from './PointDiff';
import { Score } from './Score';
import { ScorePlusList } from './ScorePlusList';
import { YakuList } from './YakuList';

interface HoraItemProps {
  info: Hora;
}

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
    </div>
  );
};
