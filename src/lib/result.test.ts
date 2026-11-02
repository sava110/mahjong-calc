import { describe, expect, test } from 'vitest';
import type { Hora } from './hora';
import type { HandOptions, Input } from './input';
import { type Result, generateResult } from './result';
import type { Rule } from './rule';
import { horaPoint, tsumoPayments } from './score';
import { initialState } from './store/state';
import type { Table } from './table';
import type { Tile } from './tile';

const parse = (mpsz: string): Tile[] =>
  [...mpsz.matchAll(/(\d+)([mpsz])/g)].flatMap(([, ns, type]) =>
    [...(ns as string)].map(c => {
      const n = Number.parseInt(c);
      return (
        type !== 'z' && (n === 0 || n === 5)
          ? { type, n: 5, red: n === 0 }
          : { type, n }
      ) as Tile;
    })
  );

const yonma: Rule = initialState.currentRule;
const sanma: Rule = { ...yonma, players: 3, red: { m: 0, p: 1, s: 1 } };
const table: Table = { round: 'east', seat: 'south', continue: 0, deposit: 0 };
const options: HandOptions = initialState.handOptions;

const run = (
  rule: Rule,
  hand: string,
  input: Partial<Input> = {},
  handOptions: Partial<HandOptions> = {}
): Result =>
  generateResult(
    table,
    { hand: parse(hand), melds: [], dora: [], nukidora: 0, ...input },
    { ...options, ...handOptions },
    rule
  );

const horas = (result: Result): Hora[] => {
  if (result?.type !== 'hora-shanten' || result.info.type !== 'hora')
    throw new Error('not hora');
  return result.info.hora;
};

const yakuOf = (result: Result, by: Hora['by']) =>
  Object.fromEntries(
    (horas(result).find(h => h.by === by)?.yaku ?? []).map(y => [
      y.name,
      y.type === 'yaku' ? y.han : y.point
    ])
  );

describe('three-player mahjong', () => {
  test('1m indicator makes 9m dora', () => {
    const dora = parse('1m');
    expect(yakuOf(run(sanma, '999m123p456p789s1z', { dora }), 'ron').dora).toBe(
      3
    );
    expect(
      yakuOf(run(yonma, '999m123p456p789s1z', { dora }), 'ron').dora
    ).toBeUndefined();
  });

  test('nukidora counts as dora, and as regular dora when north is dora', () => {
    const yaku = yakuOf(
      run(sanma, '999m123p456p789s1z', { nukidora: 2, dora: parse('3z') }),
      'ron'
    );
    expect(yaku.nukidora).toBe(2);
    expect(yaku.dora).toBe(2);
  });

  test('nukidora is ignored in four-player mahjong', () => {
    expect(
      yakuOf(run(yonma, '999m123p456p789s1z', { nukidora: 2 }), 'ron').nukidora
    ).toBeUndefined();
  });

  test('rinshan is available after nukidora', () => {
    expect(
      yakuOf(
        run(sanma, '999m123p456p789s1z', { nukidora: 1 }, { rinshan: true }),
        'tsumo'
      ).rinshan
    ).toBe(1);
  });

  test('2m-8m are excluded from acceptance', () => {
    const result = run(sanma, '1m123p456p789s115z');
    if (result?.type !== 'hora-shanten' || result.info.type !== 'shanten')
      throw new Error();
    expect(
      result.info.tileAvailabilities.every(
        a => !(a.tile.type === 'm' && a.tile.n >= 2 && a.tile.n <= 8)
      )
    ).toBe(true);
    expect(
      result.info.tileAvailabilities.some(
        a => a.tile.type === 'm' && a.tile.n === 1
      )
    ).toBe(true);
  });

  test('north tiles set aside reduce the waiting tile count', () => {
    const result = run(sanma, '123p456p789s111z4z', { nukidora: 3 });
    expect(horas(result)).toEqual([]);
  });
});

describe('three-player payments', () => {
  const tsumoSon = { players: 3, sanmaTsumo: 'tsumo-son' } as const;
  const split = { players: 3, sanmaTsumo: 'split' } as const;

  test('tsumo loss', () => {
    expect(tsumoPayments(2000, false, tsumoSon)).toEqual({
      dealer: 4000,
      nonDealer: 2000
    });
    expect(horaPoint(2000, 'tsumo', false, tsumoSon)).toBe(6000);
    expect(horaPoint(2000, 'tsumo', true, tsumoSon)).toBe(8000);
    expect(horaPoint(2000, 'ron', false, tsumoSon)).toBe(8000);
  });

  test('split north share', () => {
    expect(tsumoPayments(2000, false, split)).toEqual({
      dealer: 5000,
      nonDealer: 3000
    });
    expect(horaPoint(2000, 'tsumo', true, split)).toBe(12000);
    // 30 fu 1 han: base 240
    expect(tsumoPayments(240, false, split)).toEqual({
      dealer: 600,
      nonDealer: 400
    });
  });

  test('four-player payments are unchanged', () => {
    const yonmaRule = { players: 4, sanmaTsumo: 'tsumo-son' } as const;
    expect(horaPoint(2000, 'tsumo', false, yonmaRule)).toBe(8000);
    expect(horaPoint(2000, 'tsumo', true, yonmaRule)).toBe(12000);
  });
});

describe('open riichi', () => {
  const rule: Rule = { ...yonma, openRiichi: true };
  const hand = '234567m234p55s678s';

  test('open riichi is worth 2 han on tsumo', () => {
    const yaku = yakuOf(
      run(rule, hand, {}, { riichi: 'open-riichi' }),
      'tsumo'
    );
    expect(yaku['open-riichi']).toBe(2);
    expect(yaku.riichi).toBeUndefined();
  });

  test('ron is always yakuman', () => {
    expect(
      yakuOf(run(rule, hand, {}, { riichi: 'open-riichi' }), 'ron')
    ).toEqual({ 'open-riichi-deal-in': 1 });
  });

  test('open double riichi is worth 3 han on tsumo and yakuman on ron', () => {
    const result = run(rule, hand, {}, { riichi: 'open-double-riichi' });
    expect(yakuOf(result, 'tsumo')['open-double-riichi']).toBe(3);
    expect(yakuOf(result, 'ron')).toEqual({ 'open-riichi-deal-in': 1 });
  });

  test('ignored when the local rule is disabled', () => {
    const yaku = yakuOf(run(yonma, hand, {}, { riichi: 'open-riichi' }), 'ron');
    expect(yaku.riichi).toBe(1);
    expect(yaku['open-riichi']).toBeUndefined();
    expect(
      yakuOf(run(yonma, hand, {}, { riichi: 'open-double-riichi' }), 'ron')[
        'double-riichi'
      ]
    ).toBe(2);
  });

  test('applies to chitoitsu', () => {
    const result = run(
      rule,
      '1122m3344p5566s7z',
      {},
      { riichi: 'open-riichi' }
    );
    expect(yakuOf(result, 'tsumo')['open-riichi']).toBe(2);
    expect(yakuOf(result, 'ron')).toEqual({ 'open-riichi-deal-in': 1 });
  });
});
