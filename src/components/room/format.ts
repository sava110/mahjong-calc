import type { TFunction } from 'i18next';
import type { GameState } from '../../lib/room/game';
import type { Room, RoomRule } from '../../lib/room/types';
import { ceil100, ronMultiplier, tsumoPayments } from '../../lib/score';

const numberFormat = new Intl.NumberFormat('en-US');

export const formatPoints = (n: number) => numberFormat.format(n);

export const formatSigned = (n: number) =>
  n > 0 ? `+${formatPoints(n)}` : n < 0 ? `−${formatPoints(-n)}` : '±0';

export const formatResultPoint = (n: number) =>
  n > 0 ? `+${n.toFixed(1)}` : n < 0 ? `−${(-n).toFixed(1)}` : '0.0';

export const seatName = (room: Room, seat: number, t: TFunction) =>
  room.seats[seat] || t('room.player-n', { n: seat + 1 });

const winds = ['east', 'south', 'west', 'north'] as const;

export const roundLabel = (state: GameState, t: TFunction) =>
  t('room.round', {
    wind: t(`table-settings.${winds[state.round % 4] ?? 'east'}`),
    n: state.dealer + 1
  });

// Points received for a base point, as shown on the scoring table
export const winPointsLabel = (
  base: number,
  isDealer: boolean,
  by: 'ron' | 'tsumo',
  rule: RoomRule,
  t: TFunction
) => {
  if (by === 'ron')
    return formatPoints(ceil100(base * ronMultiplier(isDealer)));
  const pay = tsumoPayments(base, isDealer, rule);
  return isDealer
    ? t('scoring-table.tsumo-dealer', { count: pay.nonDealer })
    : t('scoring-table.tsumo-non-dealer', { a: pay.nonDealer, b: pay.dealer });
};

export const handLabel = (
  {
    han,
    fu,
    yakuman
  }: { han: number | null; fu: number | null; yakuman: number },
  t: TFunction
) =>
  yakuman > 0
    ? yakuman === 1
      ? t('room.yakuman')
      : t('room.n-yakuman', { count: yakuman })
    : han === null
      ? ''
      : han >= 5 || fu === null
        ? t('scoring-table.han', { count: han })
        : `${t('scoring-table.fu', { count: fu })} ${t('scoring-table.han', { count: han })}`;
