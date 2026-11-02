import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdExpandLess, MdExpandMore } from 'react-icons/md';
import { useStore } from '../../contexts/store';
import Stick100 from '../../images/point-stick/100.svg?react';
import Stick1000 from '../../images/point-stick/1000.svg?react';
import type { Rule } from '../../lib/rule';
import { Segment } from './Segment';
import { SimpleStepper } from './SimpleStepper';

// Bordered like the other buttons, so it does not read as a plain label
const sticksButtonClasses = {
  default:
    'flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-2 py-1 shadow-sm transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:hover:bg-stone-800',
  active:
    'flex items-center gap-2 rounded-lg border border-primary-600 bg-white px-2 py-1 shadow-sm transition hover:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-800'
} as const;

const playerOptions = [4, 3] as const;
const seatOptions = ['east', 'south'] as const;

interface ScoringTableHeaderProps {
  players: Rule['players'];
  onChangePlayers: (players: Rule['players']) => void;
}
export const ScoringTableHeader: FC<ScoringTableHeaderProps> = ({
  players,
  onChangePlayers
}) => {
  const [{ currentScoringTableTab, table }, dispatch] = useStore();
  const [openTableSettings, setOpenTableSettings] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="sticky top-12 z-20 flex flex-col items-center gap-2 bg-white/80 p-2 shadow backdrop-blur transition dark:bg-stone-800/80">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="w-28">
          <Segment
            items={playerOptions.map(p => t(`scoring-table.players-${p}`))}
            index={playerOptions.indexOf(players)}
            onChange={i => onChangePlayers(playerOptions[i] ?? 4)}
          />
        </div>
        <div className="w-24">
          <Segment
            items={[t('scoring-table.dealer'), t('scoring-table.non-dealer')]}
            index={table.seat === 'east' ? 0 : 1}
            onChange={i =>
              dispatch({
                type: 'set-table',
                payload: { ...table, seat: seatOptions[i] ?? 'east' }
              })
            }
          />
        </div>
        <button
          type="button"
          aria-expanded={openTableSettings}
          className={
            openTableSettings
              ? sticksButtonClasses.active
              : sticksButtonClasses.default
          }
          onClick={() => setOpenTableSettings(o => !o)}
        >
          {currentScoringTableTab === 'diff' && (
            <div className="flex items-center gap-1">
              <Stick1000 className="w-10 drop-shadow" />
              <div className="min-w-4 font-bold">{table.deposit}</div>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Stick100 className="w-10 drop-shadow" />
            <div className="min-w-4 font-bold">{table.continue}</div>
          </div>
          {openTableSettings ? (
            <MdExpandLess className="text-stone-500" />
          ) : (
            <MdExpandMore className="text-stone-500" />
          )}
        </button>
      </div>
      {openTableSettings && (
        <div className="flex w-full max-w-sm gap-4">
          {currentScoringTableTab === 'diff' && (
            <SimpleStepper
              canDecrement={table.deposit > 0}
              onChange={d =>
                dispatch({
                  type: 'set-table',
                  payload: { ...table, deposit: table.deposit + d }
                })
              }
            />
          )}
          <SimpleStepper
            canDecrement={table.continue > 0}
            onChange={d =>
              dispatch({
                type: 'set-table',
                payload: { ...table, continue: table.continue + d }
              })
            }
          />
        </div>
      )}
    </div>
  );
};
