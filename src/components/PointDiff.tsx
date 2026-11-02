import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../contexts/store';
import type { Hora } from '../lib/hora';
import { horaBasePoint, horaPoint, tsumoPayments } from '../lib/score';
import { isDora } from '../lib/yaku';

interface PointDiffProps {
  info: Hora;
}

export const PointDiff: FC<PointDiffProps> = ({ info }) => {
  const [{ currentRule, table }] = useStore();
  const { t } = useTranslation();

  if (info.yaku.every(isDora)) return null;

  const { honbaBonus, players } = currentRule;
  const base = horaBasePoint(info, currentRule);
  const isDealer = table.seat === 'east';
  const pay = tsumoPayments(base, isDealer, currentRule);
  const honba = table.continue * honbaBonus;
  const deposit = 1000 * table.deposit;

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="text-xl font-bold">{t('result.point-diff')}</div>
      {info.by === 'ron' && (
        <div>
          {t('result.point', {
            count:
              (horaPoint(base, 'ron', isDealer, currentRule) +
                honba * (players - 1)) *
                2 +
              deposit
          })}
        </div>
      )}
      {info.by === 'tsumo' && isDealer && (
        <div>
          {t('result.point', {
            count: (pay.nonDealer + honba) * players + deposit
          })}
        </div>
      )}
      {info.by === 'tsumo' && !isDealer && (
        <>
          <div>
            {t('result.non-dealer-diff', {
              count:
                pay.nonDealer * (players - 1) +
                pay.dealer +
                honba * players +
                deposit
            })}
          </div>
          <div>
            {t('result.dealer-diff', {
              count:
                pay.nonDealer * (players - 2) +
                pay.dealer * 2 +
                honba * players +
                deposit
            })}
          </div>
        </>
      )}
    </div>
  );
};
