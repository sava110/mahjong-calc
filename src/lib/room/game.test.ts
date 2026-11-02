import { describe, expect, test } from 'vitest';
import {
  type GameState,
  applyEvent,
  currentGameState,
  finalResult,
  horaDeltas,
  initialGameState,
  ryukyokuDeltas,
  winBase
} from './game';
import { applyOp, createRoom, parseNewRoom, parseOp } from './ops';
import type { RoomEvent, RoomRule } from './types';

const rule4: RoomRule = {
  players: 4,
  startPoints: 25000,
  returnPoints: 30000,
  uma: [30, 10, -10, -30],
  length: 'hanchan',
  tobi: true,
  honbaBonus: 100,
  sanmaTsumo: 'tsumo-son',
  roundedMangan: false
};
const rule3: RoomRule = {
  ...rule4,
  players: 3,
  startPoints: 35000,
  returnPoints: 40000,
  uma: [20, 0, -20]
};

const state = (patch: Partial<GameState>, rule = rule4): GameState => ({
  ...initialGameState(rule),
  ...patch
});
const win = (winner: number, base: number) => ({
  winner,
  base,
  han: null,
  fu: null,
  yakuman: 0
});

describe('horaDeltas', () => {
  test('non-dealer ron with honba and deposits', () => {
    // 30 fu 4 han = 7700, 2 honba, 1 stick on the table, seat 1 riichi
    const base = winBase(rule4, { han: 4, fu: 30, yakuman: 0 });
    expect(
      horaDeltas(state({ honba: 2, deposit: 1 }), rule4, {
        riichi: [1],
        loser: 2,
        wins: [win(1, base)]
      })
    ).toEqual([0, 7700 + 600 - 1000 + 2000, -8300, 0]);
  });

  test('dealer tsumo', () => {
    // 30 fu 3 han dealer tsumo = 2000 all
    const base = winBase(rule4, { han: 3, fu: 30, yakuman: 0 });
    expect(
      horaDeltas(state({ honba: 1 }), rule4, {
        riichi: [],
        loser: null,
        wins: [win(0, base)]
      })
    ).toEqual([6300, -2100, -2100, -2100]);
  });

  test('non-dealer tsumo pays dealer double', () => {
    const base = winBase(rule4, { han: 1, fu: 30, yakuman: 0 });
    expect(
      horaDeltas(state({}), rule4, {
        riichi: [],
        loser: null,
        wins: [win(2, base)]
      })
    ).toEqual([-500, -300, 1100, -300]);
  });

  test('double ron gives honba and deposits to the head winner', () => {
    // Seat 3 deals in to seats 1 and 2; seat 0 is next after 3 but did not
    // win, so seat 1 is the head winner
    expect(
      horaDeltas(state({ honba: 1, deposit: 1 }), rule4, {
        riichi: [],
        loser: 3,
        wins: [win(2, 2000), win(1, 2000)]
      })
    ).toEqual([0, 8000 + 300 + 1000, 8000, -16300]);
  });

  test('three-player tsumo loss and north split', () => {
    const base = 2000; // mangan
    expect(
      horaDeltas(state({ honba: 1 }, rule3), rule3, {
        riichi: [],
        loser: null,
        wins: [win(1, base)]
      })
    ).toEqual([-4100, 6200, -2100]);
    expect(
      horaDeltas(
        state({}, rule3),
        { ...rule3, sanmaTsumo: 'split' },
        {
          riichi: [],
          loser: null,
          wins: [win(1, base)]
        }
      )
    ).toEqual([-5000, 8000, -3000]);
  });

  test('three-player ron honba is paid for two players', () => {
    expect(
      horaDeltas(state({ honba: 2 }, rule3), rule3, {
        riichi: [],
        loser: 0,
        wins: [win(2, 2000)]
      })
    ).toEqual([-8400, 0, 8400]);
  });
});

describe('ryukyokuDeltas', () => {
  test('noten penalty', () => {
    expect(ryukyokuDeltas(rule4, { riichi: [], tenpai: [1] })).toEqual([
      -1000, 3000, -1000, -1000
    ]);
    expect(ryukyokuDeltas(rule4, { riichi: [0], tenpai: [0, 2] })).toEqual([
      500, -1500, 1500, -1500
    ]);
    expect(ryukyokuDeltas(rule3, { riichi: [], tenpai: [0] })).toEqual([
      3000, -1500, -1500
    ]);
    expect(ryukyokuDeltas(rule4, { riichi: [], tenpai: [] })).toEqual([
      0, 0, 0, 0
    ]);
  });
});

const hora = (
  s: GameState,
  winner: number,
  loser: number | null,
  base: number,
  rule = rule4
): RoomEvent => {
  const args = { riichi: [], loser, wins: [win(winner, base)] };
  return { type: 'hora', at: 0, ...args, deltas: horaDeltas(s, rule, args) };
};

describe('applyEvent', () => {
  test('dealer keeps the deal on a win and passes it on a loss', () => {
    const s0 = initialGameState(rule4);
    const s1 = applyEvent(s0, hora(s0, 0, 1, 1000), rule4);
    expect([s1.dealer, s1.honba]).toEqual([0, 1]);
    const s2 = applyEvent(s1, hora(s1, 2, 1, 1000), rule4);
    expect([s2.dealer, s2.honba, s2.round]).toEqual([1, 0, 0]);
  });

  test('draw keeps the deal when the dealer is tenpai and adds sticks', () => {
    const s0 = initialGameState(rule4);
    const args = { riichi: [1], tenpai: [0, 1] };
    const s1 = applyEvent(
      s0,
      { type: 'ryukyoku', at: 0, ...args, deltas: ryukyokuDeltas(rule4, args) },
      rule4
    );
    expect([s1.dealer, s1.honba, s1.deposit]).toEqual([0, 1, 1]);
    expect(s1.scores).toEqual([26500, 25500, 23500, 23500]);
  });

  test('hanchan ends after the south round and tobi ends at once', () => {
    let s = initialGameState(rule4);
    for (let i = 0; i < 7; i++)
      s = applyEvent(s, hora(s, (s.dealer + 1) % 4, null, 300), rule4);
    expect([s.round, s.dealer, s.finished]).toEqual([1, 3, false]);
    s = applyEvent(s, hora(s, 0, null, 300), rule4);
    expect(s.finished).toBe(true);

    const t0 = initialGameState(rule4);
    const t1 = applyEvent(t0, hora(t0, 0, 1, 8000 * 2), rule4);
    expect(t1.finished).toBe(true);
  });
});

describe('finalResult', () => {
  test('uma, oka, deposits to the top and seat order on ties', () => {
    const s = state({ scores: [30000, 30000, 25000, 14000], deposit: 1 });
    expect(finalResult(s, rule4)).toEqual([
      { seat: 0, score: 31000, rank: 0, point: 1 + 30 + 20 },
      { seat: 1, score: 30000, rank: 1, point: 0 + 10 },
      { seat: 2, score: 25000, rank: 2, point: -5 - 10 },
      { seat: 3, score: 14000, rank: 3, point: -16 - 30 }
    ]);
  });
});

describe('room ops', () => {
  const input = parseNewRoom({
    name: '金曜',
    rule: rule4,
    seats: ['A', 'B', 'C', 'D']
  });

  test('rejects invalid input', () => {
    expect(input).not.toBeNull();
    expect(parseNewRoom({ name: 'x', rule: rule4, seats: ['A'] })).toBeNull();
    expect(
      parseNewRoom({
        name: 'x',
        rule: { ...rule4, uma: [1] },
        seats: ['A', 'B', 'C', 'D']
      })
    ).toBeNull();
    expect(
      parseNewRoom({
        name: 'x'.repeat(21),
        rule: rule4,
        seats: ['A', 'B', 'C', 'D']
      })
    ).toBeNull();
  });

  test('append, undo and finish', () => {
    if (input === null) throw new Error();
    const room = createRoom('ABC234', input, 1);
    const event = hora(initialGameState(rule4), 1, 2, 1000);
    const op = parseOp({ type: 'append', game: 0, event }, room);
    expect(op).not.toBeNull();
    if (op === null) throw new Error();
    const r1 = applyOp(room, op, 2);
    if (typeof r1 === 'string') throw new Error(r1);
    expect(r1.version).toBe(2);
    expect(
      currentGameState(
        r1.games[0] ?? { startedAt: 0, finishedAt: null, events: [] },
        rule4
      ).scores
    ).toEqual([25000, 29000, 21000, 25000]);
    // deltas must have one entry per seat
    expect(
      parseOp(
        { type: 'append', game: 0, event: { ...event, deltas: [0] } },
        room
      )
    ).toBeNull();
    // the loser cannot also be a winner
    expect(
      parseOp({ type: 'append', game: 0, event: { ...event, loser: 1 } }, room)
    ).toBeNull();
    const r2 = applyOp(r1, { type: 'finish-game', game: 0 }, 3);
    if (typeof r2 === 'string') throw new Error(r2);
    expect(applyOp(r2, op, 4)).toBe('game finished');
    const r3 = applyOp(r2, { type: 'undo', game: 0 }, 5);
    if (typeof r3 === 'string') throw new Error(r3);
    expect(r3.games[0]?.finishedAt).toBeNull();
    expect(r3.games[0]?.events.length).toBe(1);
  });
});
