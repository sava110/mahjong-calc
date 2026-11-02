import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../contexts/store';
import { sumOfFu } from '../lib/fu';
import type { Hora } from '../lib/hora';
import { ceil10, horaBasePoint, horaPoint, tsumoPayments } from '../lib/score';
import { sumBy } from '../lib/util';
import { LimitBadge } from './LimitBadge';
import { Tile } from './tile';

interface HoraItemProps {
  info: Hora;
}

export const HoraItemSummary: FC<HoraItemProps> = ({ info }) => {
  const [
    {
      appConfig: { showBazoro },
      currentRule,
      table
    }
  ] = useStore();
  const { t } = useTranslation();

  const { honbaBonus, players } = currentRule;
  const isDealer = table.seat === 'east';
  const base = horaBasePoint(info, currentRule);
  const point = horaPoint(base, info.by, isDealer, currentRule);
  const pay = tsumoPayments(base, isDealer, currentRule);

  return (
    <div className="flex items-center gap-2 rounded-md p-2 transition hover:bg-neutral-200 dark:hover:bg-neutral-800">
      <div className="relative w-12">
        <Tile tile={info.horaTile} />
        <div className="absolute -top-2 -right-3 text-xs text-white">
          <div
            className={
              info.by === 'tsumo'
                ? 'rounded-full bg-red-500/80 px-1 backdrop-blur-sm'
                : 'rounded-full bg-blue-500/80 px-1 backdrop-blur-sm'
            }
          >
            {t(`result.${info.by}`)}
          </div>
        </div>
      </div>
      {base === 0 && (
        <div className="text-xl italic text-neutral-500">
          {t('result.no-yaku')}
        </div>
      )}
      {base > 0 && (
        <div className="flex flex-1 flex-col items-start">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl">{point}</span>
            {(table.continue > 0 || table.deposit > 0) && (
              <span className="text-lg">
                (+
                {table.continue * honbaBonus * (players - 1) +
                  table.deposit * 1000}
                )
              </span>
            )}
            <span>{t('result.points')}</span>
            <div className="ml-1 self-center">
              <LimitBadge base={base} />
            </div>
          </div>
          {info.by === 'ron' && table.continue > 0 && (
            <div>
              {t('result.ron-detail', {
                a: point,
                b: point + table.continue * honbaBonus * (players - 1)
              })}
            </div>
          )}
          {info.by === 'tsumo' && table.continue === 0 && isDealer && (
            <div>{t('result.tsumo-east-detail', { count: pay.nonDealer })}</div>
          )}
          {info.by === 'tsumo' && table.continue > 0 && isDealer && (
            <div>
              {t('result.tsumo-east-continue-detail', {
                a: pay.nonDealer,
                b: pay.nonDealer + table.continue * honbaBonus
              })}
            </div>
          )}
          {info.by === 'tsumo' && table.continue === 0 && !isDealer && (
            <div>
              {t('result.tsumo-other-detail', {
                a: pay.nonDealer,
                b: pay.dealer
              })}
            </div>
          )}
          {info.by === 'tsumo' && table.continue > 0 && !isDealer && (
            <div>
              {t('result.tsumo-other-continue-detail', {
                a: pay.nonDealer,
                b: pay.dealer,
                c: pay.nonDealer + table.continue * honbaBonus,
                d: pay.dealer + table.continue * honbaBonus
              })}
            </div>
          )}
        </div>
      )}
      {base > 0 && info.yaku.every(y => y.type !== 'yakuman') && (
        <div className="hidden sm:block">
          {t('result.fu-han', {
            a: info.type === 'mentsu' ? ceil10(sumOfFu(info.fu)) : 25,
            b:
              sumBy(info.yaku, y => (y.type === 'yaku' ? y.han : 0)) +
              (showBazoro ? 2 : 0)
          })}
        </div>
      )}
    </div>
  );
};
