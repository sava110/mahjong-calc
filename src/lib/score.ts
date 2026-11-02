import { sumOfFu } from './fu';
import type { Hora } from './hora';
import type { Rule } from './rule';
import { sumBy } from './util';
import { isDora } from './yaku';

const calculateRawBasePoint = (fu: number, han: number) => fu * 2 ** (2 + han);

export const calculateBasePoint = (
  fu: number,
  han: number,
  roundedMangan: boolean,
  accumlatedYakuman: boolean
) => {
  const bp = calculateRawBasePoint(fu === 25 ? 25 : ceil10(fu), han);
  return accumlatedYakuman && han >= 13
    ? 8000
    : han >= 11
      ? 6000
      : han >= 8
        ? 4000
        : han >= 6
          ? 3000
          : han >= 5 || bp >= (roundedMangan ? 1920 : 2000)
            ? 2000
            : bp;
};

const ceil = (r: number) => (n: number) => Math.ceil(n / r) * r;

export const ceil10 = ceil(10);
export const ceil100 = ceil(100);

export const ronMultiplier = (isDealer: boolean) => (isDealer ? 6 : 4);

// Multipliers of the base point paid by the dealer and each non-dealer on
// tsumo. In three-player mahjong with the split rule, the missing north
// player's share is split between the remaining payers.
export const tsumoMultipliers = (
  isDealer: boolean,
  { players, sanmaTsumo }: Pick<Rule, 'players' | 'sanmaTsumo'>
): { dealer: number; nonDealer: number } =>
  players === 3 && sanmaTsumo === 'split'
    ? isDealer
      ? { dealer: 0, nonDealer: 3 }
      : { dealer: 2.5, nonDealer: 1.5 }
    : isDealer
      ? { dealer: 0, nonDealer: 2 }
      : { dealer: 2, nonDealer: 1 };

export const tsumoPayments = (
  base: number,
  isDealer: boolean,
  rule: Pick<Rule, 'players' | 'sanmaTsumo'>
) => {
  const m = tsumoMultipliers(isDealer, rule);
  return {
    dealer: ceil100(base * m.dealer),
    nonDealer: ceil100(base * m.nonDealer)
  };
};

// Number of non-dealers paying on tsumo
export const nonDealerPayers = (isDealer: boolean, players: Rule['players']) =>
  players - (isDealer ? 1 : 2);

export const tsumoTotal = (
  base: number,
  isDealer: boolean,
  rule: Pick<Rule, 'players' | 'sanmaTsumo'>
) => {
  const { dealer, nonDealer } = tsumoPayments(base, isDealer, rule);
  return dealer + nonDealer * nonDealerPayers(isDealer, rule.players);
};

const tuples = [
  '',
  'double-',
  'triple-',
  'quadruple-',
  'quintuple-',
  'sextuple-',
  'septuple-',
  'octuple-',
  'nonuple-',
  'decuple-'
];
export const yakumanTupleKey = (n: number): string =>
  n <= 10 ? `result.${tuples[n - 1]}yakuman` : 'result.more-yakuman';

export const horaBasePoint = (
  info: Hora,
  {
    multipleYakuman,
    roundedMangan,
    accumlatedYakuman
  }: Pick<Rule, 'multipleYakuman' | 'roundedMangan' | 'accumlatedYakuman'>
) =>
  info.type === 'kokushi' || info.yaku.some(y => y.type === 'yakuman')
    ? info.yaku.reduce((acc, cur) => {
        const p = cur.type === 'yakuman' ? cur.point : 0;
        if (multipleYakuman) return acc + p;
        return Math.max(acc, p);
      }, 0) * 8000
    : info.yaku.every(isDora)
      ? 0
      : calculateBasePoint(
          info.type === 'mentsu' ? sumOfFu(info.fu) : 25,
          sumBy(info.yaku, y => (y.type === 'yaku' ? y.han : 0)),
          roundedMangan,
          accumlatedYakuman
        );

// Total points the winner receives, excluding honba and deposit
export const horaPoint = (
  base: number,
  by: Hora['by'],
  isDealer: boolean,
  rule: Pick<Rule, 'players' | 'sanmaTsumo'>
) =>
  by === 'ron'
    ? ceil100(base * ronMultiplier(isDealer))
    : tsumoTotal(base, isDealer, rule);
