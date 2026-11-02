import React, { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { MdArrowForward } from 'react-icons/md';
import { useStore } from '../contexts/store';
import { sumOfFu } from '../lib/fu';
import type { Hora } from '../lib/hora';
import { calculateBasePoint, horaPoint, tsumoPayments } from '../lib/score';
import { sumBy } from '../lib/util';
import { isDora } from '../lib/yaku';
import { LimitBadge } from './LimitBadge';

interface ScorePlusListProps {
  info: Hora;
}

export const ScorePlusList: FC<ScorePlusListProps> = ({ info }) => {
  const [{ currentRule, table }] = useStore();
  const { t } = useTranslation();

  if (
    info.type === 'kokushi' ||
    info.yaku.some(y => y.type === 'yakuman') ||
    info.yaku.every(isDora)
  )
    return null;

  const { roundedMangan, accumlatedYakuman, honbaBonus, players } = currentRule;
  const isDealer = table.seat === 'east';

  const fu = info.type === 'mentsu' ? sumOfFu(info.fu) : 25;
  const han = sumBy(info.yaku, y => (y.type === 'yaku' ? y.han : 0));
  if (han > 13) return null;

  const orig = calculateBasePoint(fu, han, roundedMangan, accumlatedYakuman);
  const points = [...Array(13 - han)]
    .map((_, i) => ({
      plus: i + 1,
      base: calculateBasePoint(
        fu,
        han + i + 1,
        roundedMangan,
        accumlatedYakuman
      )
    }))
    .reduce(
      (acc, { plus, base }) =>
        base === orig
          ? acc
          : acc.length === 0 || acc[acc.length - 1]?.base !== base
            ? [...acc, { start: plus, end: plus, base }]
            : acc.flatMap((e, i) =>
                i === acc.length - 1 ? { ...e, end: plus } : e
              ),
      [] as { start: number; end: number; base: number }[]
    );
  if (points.length === 0) return null;
  (points[points.length - 1] as (typeof points)[number]).end =
    Number.POSITIVE_INFINITY;

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="text-xl font-bold">{t('result.change-in-score')}</div>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[max-content_max-content_max-content] gap-2">
          {points.map((p, i) => {
            const ron = horaPoint(p.base, 'ron', isDealer, currentRule);
            const pay = tsumoPayments(p.base, isDealer, currentRule);
            return (
              <React.Fragment key={i}>
                <div className="text-right">
                  {p.start === p.end && (
                    <span>{t('result.plus-han', { count: p.start })}</span>
                  )}
                  {p.end - p.start === 1 && (
                    <span>
                      {t('result.plus-han-2', { a: p.start, b: p.end })}
                    </span>
                  )}
                  {p.end - p.start > 1 && Number.isFinite(p.end) && (
                    <span>
                      {t('result.plus-han-range', { a: p.start, b: p.end })}
                    </span>
                  )}
                  {!Number.isFinite(p.end) && (
                    <span>{t('result.plus-gte-han', { count: p.start })}</span>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <MdArrowForward />
                </div>
                <div className="flex items-center gap-2">
                  {info.by === 'ron' && table.continue === 0 && (
                    <div>
                      {ron} {t('result.points')}
                    </div>
                  )}
                  {info.by === 'ron' && table.continue > 0 && (
                    <div>
                      {t('result.ron-detail', {
                        a: ron,
                        b: ron + table.continue * honbaBonus * (players - 1)
                      })}
                    </div>
                  )}
                  {info.by === 'tsumo' && table.continue === 0 && isDealer && (
                    <div>
                      {t('result.tsumo-east-detail', {
                        count: pay.nonDealer
                      })}
                    </div>
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
                  <LimitBadge base={p.base} />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
