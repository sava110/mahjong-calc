import {
  calculateBasePoint,
  ceil100,
  ronMultiplier,
  tsumoPayments
} from '../score';
import type { RoomEvent, RoomGame, RoomRule, RoomWin } from './types';

export interface GameState {
  scores: number[];
  // 0: east round, 1: south round, ...
  round: number;
  dealer: number;
  honba: number;
  // Riichi sticks on the table
  deposit: number;
  finished: boolean;
}

export const NOTEN_PENALTY = 3000;
const RIICHI_COST = 1000;

export const initialGameState = (rule: RoomRule): GameState => ({
  scores: Array.from({ length: rule.players }, () => rule.startPoints),
  round: 0,
  dealer: 0,
  honba: 0,
  deposit: 0,
  finished: false
});

const roundCount = (rule: RoomRule) => (rule.length === 'tonpu' ? 1 : 2);

export const applyEvent = (
  state: GameState,
  event: RoomEvent,
  rule: RoomRule
): GameState => {
  const scores = state.scores.map((s, i) => s + (event.deltas[i] ?? 0));
  const next = (keepDealer: boolean, deposit: number): GameState => {
    const dealer = keepDealer
      ? state.dealer
      : (state.dealer + 1) % rule.players;
    const round = !keepDealer && dealer === 0 ? state.round + 1 : state.round;
    return {
      scores,
      round,
      dealer,
      honba: keepDealer || event.type === 'ryukyoku' ? state.honba + 1 : 0,
      deposit,
      finished:
        round >= roundCount(rule) || (rule.tobi && scores.some(s => s < 0))
    };
  };
  switch (event.type) {
    case 'hora':
      return next(
        event.wins.some(w => w.winner === state.dealer),
        0
      );
    case 'ryukyoku':
      return next(
        event.tenpai.includes(state.dealer),
        state.deposit + event.riichi.length
      );
    case 'adjust':
      return {
        ...state,
        scores,
        finished: state.finished || (rule.tobi && scores.some(s => s < 0))
      };
  }
};

// State before each event, followed by the current state
export const replayGame = (game: RoomGame, rule: RoomRule): GameState[] =>
  game.events.reduce<GameState[]>(
    (states, event) => [
      ...states,
      applyEvent(states[states.length - 1] as GameState, event, rule)
    ],
    [initialGameState(rule)]
  );

export const currentGameState = (game: RoomGame, rule: RoomRule): GameState => {
  const states = replayGame(game, rule);
  const state = states[states.length - 1] as GameState;
  return game.finishedAt === null ? state : { ...state, finished: true };
};

const riichiDeltas = (riichi: number[], players: number) =>
  Array.from({ length: players }, (_, i) =>
    riichi.includes(i) ? -RIICHI_COST : 0
  );

// The winner who takes honba and deposits on a multiple ron: the first one
// in turn order after the loser (頭ハネ)
export const headWinner = (
  winners: number[],
  loser: number | null,
  players: number
): number => {
  if (loser === null) return winners[0] ?? 0;
  for (let i = 1; i < players; i++) {
    const seat = (loser + i) % players;
    if (winners.includes(seat)) return seat;
  }
  return winners[0] ?? 0;
};

export const horaDeltas = (
  state: GameState,
  rule: RoomRule,
  {
    riichi,
    loser,
    wins
  }: { riichi: number[]; loser: number | null; wins: RoomWin[] }
): number[] => {
  const { players, honbaBonus } = rule;
  const deltas = riichiDeltas(riichi, players);
  const add = (seat: number, points: number) => {
    deltas[seat] = (deltas[seat] ?? 0) + points;
  };
  const head = headWinner(
    wins.map(w => w.winner),
    loser,
    players
  );
  for (const { winner, base } of wins) {
    const isDealer = winner === state.dealer;
    const honba = winner === head ? state.honba * honbaBonus : 0;
    if (loser !== null) {
      const pay =
        ceil100(base * ronMultiplier(isDealer)) + honba * (players - 1);
      add(loser, -pay);
      add(winner, pay);
    } else {
      const pay = tsumoPayments(base, isDealer, rule);
      for (let seat = 0; seat < players; seat++) {
        if (seat === winner) continue;
        const p = (seat === state.dealer ? pay.dealer : pay.nonDealer) + honba;
        add(seat, -p);
        add(winner, p);
      }
    }
  }
  add(head, (state.deposit + riichi.length) * RIICHI_COST);
  return deltas;
};

export const ryukyokuDeltas = (
  rule: RoomRule,
  { riichi, tenpai }: { riichi: number[]; tenpai: number[] }
): number[] => {
  const { players } = rule;
  const deltas = riichiDeltas(riichi, players);
  const t = tenpai.length;
  if (t === 0 || t === players) return deltas;
  return deltas.map(
    (d, seat) =>
      d +
      (tenpai.includes(seat)
        ? NOTEN_PENALTY / t
        : -NOTEN_PENALTY / (players - t))
  );
};

// Base point from han and fu, or from the number of yakuman
export const winBase = (
  rule: RoomRule,
  { han, fu, yakuman }: { han: number; fu: number; yakuman: number }
) =>
  yakuman > 0
    ? 8000 * yakuman
    : calculateBasePoint(fu, han, rule.roundedMangan, false);

export interface FinalResult {
  seat: number;
  score: number;
  rank: number;
  // Score after return points, uma and oka, in thousands
  point: number;
}

// Remaining riichi sticks go to the top. Ties are broken by seat order from
// the first dealer.
export const finalResult = (
  state: GameState,
  rule: RoomRule
): FinalResult[] => {
  const order = state.scores
    .map((score, seat) => ({ score, seat }))
    .sort((a, b) => b.score - a.score || a.seat - b.seat);
  const top = order[0]?.seat ?? 0;
  const scores = state.scores.map((s, seat) =>
    seat === top ? s + state.deposit * RIICHI_COST : s
  );
  const oka = ((rule.returnPoints - rule.startPoints) * rule.players) / 1000;
  return order.map(({ seat }, rank) => {
    const score = scores[seat] ?? 0;
    const point =
      (score - rule.returnPoints) / 1000 +
      (rule.uma[rank] ?? 0) +
      (rank === 0 ? oka : 0);
    return { seat, score, rank, point: Math.round(point * 10) / 10 };
  });
};

// Wind of a seat in the current hand
export const seatWind = (seat: number, dealer: number, players: number) =>
  (['east', 'south', 'west', 'north'] as const)[
    (seat - dealer + players) % players
  ] ?? 'east';
