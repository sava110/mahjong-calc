// Validation and application of room operations. Shared with the server,
// which treats every request body as untrusted input.
import type {
  BoardMeld,
  BoardSeat,
  PendingHora,
  Room,
  RoomBoard,
  RoomDora,
  RoomEvent,
  RoomGame,
  RoomOp,
  RoomRule,
  RoomWin
} from './types.ts';

// Room PIN: four digits, set by the creator and needed to join
export const isPin = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9]{4}$/.test(v);

export const MAX_NAME_LENGTH = 20;
export const MAX_NOTE_LENGTH = 100;
export const MAX_EVENTS_PER_GAME = 200;
export const MAX_GAMES_PER_ROOM = 100;
const MAX_POINTS = 10_000_000;

type Json = unknown;

const isRecord = (v: Json): v is Record<string, Json> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isInt = (v: Json, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

const isSeat = (v: Json, players: number): v is number =>
  isInt(v, 0, players - 1);

const isSeatList = (v: Json, players: number): v is number[] =>
  Array.isArray(v) &&
  v.length <= players &&
  v.every(s => isSeat(s, players)) &&
  new Set(v).size === v.length;

const isDeltas = (v: Json, players: number): v is number[] =>
  Array.isArray(v) &&
  v.length === players &&
  v.every(d => isInt(d, -MAX_POINTS, MAX_POINTS) && d % 100 === 0);

const cleanName = (v: Json): string | null => {
  if (typeof v !== 'string') return null;
  // Drop control characters and surrounding spaces
  const name = Array.from(v.trim())
    .filter(c => (c.codePointAt(0) ?? 0) >= 0x20)
    .join('');
  return Array.from(name).length <= MAX_NAME_LENGTH ? name : null;
};

export const parseRule = (v: Json): RoomRule | null => {
  if (!isRecord(v)) return null;
  const { players, startPoints, returnPoints, uma, length, tobi } = v;
  const { honbaBonus, sanmaTsumo, roundedMangan } = v;
  if (players !== 3 && players !== 4) return null;
  if (!isInt(startPoints, 100, 1_000_000) || startPoints % 100 !== 0)
    return null;
  if (!isInt(returnPoints, 100, 1_000_000) || returnPoints % 100 !== 0)
    return null;
  if (
    !Array.isArray(uma) ||
    uma.length !== players ||
    !uma.every(u => isInt(u, -1000, 1000))
  )
    return null;
  if (length !== 'tonpu' && length !== 'hanchan') return null;
  if (typeof tobi !== 'boolean') return null;
  if (honbaBonus !== 100 && honbaBonus !== 500) return null;
  if (sanmaTsumo !== 'tsumo-son' && sanmaTsumo !== 'split') return null;
  if (typeof roundedMangan !== 'boolean') return null;
  return {
    players,
    startPoints,
    returnPoints,
    uma: uma as number[],
    length,
    tobi,
    honbaBonus,
    sanmaTsumo,
    roundedMangan
  };
};

const parseWin = (v: Json, players: number): RoomWin | null => {
  if (!isRecord(v)) return null;
  const { winner, base, han, fu, yakuman } = v;
  if (!isSeat(winner, players)) return null;
  if (!isInt(base, 0, 8000 * 20)) return null;
  if (han !== null && !isInt(han, 0, 200)) return null;
  if (fu !== null && !isInt(fu, 0, 200)) return null;
  if (!isInt(yakuman, 0, 20)) return null;
  return { winner, base, han, fu, yakuman };
};

export const parseEvent = (v: Json, players: number): RoomEvent | null => {
  if (!isRecord(v) || !isInt(v.at, 0, Number.MAX_SAFE_INTEGER)) return null;
  const at = v.at as number;
  if (!isDeltas(v.deltas, players)) return null;
  const deltas = v.deltas;
  switch (v.type) {
    case 'hora': {
      const { riichi, loser, wins } = v;
      if (!isSeatList(riichi, players)) return null;
      if (loser !== null && !isSeat(loser, players)) return null;
      if (!Array.isArray(wins) || wins.length === 0) return null;
      if (wins.length > (loser === null ? 1 : players - 1)) return null;
      const parsed = wins.map(w => parseWin(w, players));
      if (parsed.some(w => w === null)) return null;
      const ws = parsed as RoomWin[];
      const winners = ws.map(w => w.winner);
      if (new Set(winners).size !== winners.length) return null;
      if (loser !== null && winners.includes(loser)) return null;
      return { type: 'hora', at, riichi, loser, wins: ws, deltas };
    }
    case 'ryukyoku': {
      const { riichi, tenpai } = v;
      if (!isSeatList(riichi, players) || !isSeatList(tenpai, players))
        return null;
      return { type: 'ryukyoku', at, riichi, tenpai, deltas };
    }
    case 'adjust': {
      const note = v.note;
      if (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH)
        return null;
      return { type: 'adjust', at, note, deltas };
    }
    default:
      return null;
  }
};

export interface NewRoomInput {
  name: string;
  rule: RoomRule;
  seats: string[];
}

export const parseNewRoom = (v: Json): NewRoomInput | null => {
  if (!isRecord(v)) return null;
  const rule = parseRule(v.rule);
  if (rule === null) return null;
  const name = cleanName(v.name);
  if (name === null) return null;
  const seats = v.seats;
  if (!Array.isArray(seats) || seats.length !== rule.players) return null;
  const names = seats.map(cleanName);
  if (names.some(n => n === null)) return null;
  return { name, rule, seats: names as string[] };
};

export const parseOp = (v: Json, room: Room): RoomOp | null => {
  if (!isRecord(v)) return null;
  const { players } = room.rule;
  const isGame = (g: Json): g is number => isInt(g, 0, room.games.length - 1);
  switch (v.type) {
    case 'append': {
      if (!isGame(v.game)) return null;
      const event = parseEvent(v.event, players);
      return event === null ? null : { type: 'append', game: v.game, event };
    }
    case 'undo':
      return isGame(v.game) ? { type: 'undo', game: v.game } : null;
    case 'set-seat': {
      const name = cleanName(v.name);
      if (!isSeat(v.seat, players) || name === null) return null;
      return { type: 'set-seat', seat: v.seat, name };
    }
    case 'finish-game':
      return isGame(v.game) ? { type: 'finish-game', game: v.game } : null;
    case 'new-game':
      return { type: 'new-game' };
    case 'report-hora': {
      if (!isGame(v.game)) return null;
      const { loser, riichi } = v;
      if (loser !== null && !isSeat(loser, players)) return null;
      if (!isSeatList(riichi, players)) return null;
      const win = parseWin(v.win, players);
      if (win === null || win.winner === loser) return null;
      return { type: 'report-hora', game: v.game, loser, win, riichi };
    }
    case 'withdraw-hora':
      return isSeat(v.winner, players)
        ? { type: 'withdraw-hora', winner: v.winner }
        : null;
    case 'confirm-hora': {
      if (!isGame(v.game)) return null;
      const event = parseEvent(v.event, players);
      return event?.type === 'hora'
        ? { type: 'confirm-hora', game: v.game, event }
        : null;
    }
    case 'cancel-hora':
      return { type: 'cancel-hora' };
    case 'set-board': {
      if (!isGame(v.game)) return null;
      const { seats } = v;
      if (!Array.isArray(seats) || seats.length !== players) return null;
      const parsed = seats.map(parseBoardSeat);
      if (parsed.some(s => s === null)) return null;
      return { type: 'set-board', game: v.game, seats: parsed as BoardSeat[] };
    }
    case 'set-dora': {
      if (!isGame(v.game)) return null;
      const { tiles } = v;
      if (
        !Array.isArray(tiles) ||
        tiles.length > MAX_DORA ||
        !tiles.every(isBoardTile)
      )
        return null;
      return { type: 'set-dora', game: v.game, tiles };
    }
    default:
      return null;
  }
};

export const MAX_DISCARDS = 30;
// The first indicator and up to four kan dora
export const MAX_DORA = 5;

const isBoardTile = (v: Json): v is string =>
  typeof v === 'string' && /^([0-9][mps]|[1-7]z)$/.test(v);

const parseBoardMeld = (v: Json): BoardMeld | null => {
  if (!isRecord(v)) return null;
  const { tiles, closed } = v;
  if (!Array.isArray(tiles) || tiles.length < 3 || tiles.length > 4)
    return null;
  if (!tiles.every(isBoardTile) || typeof closed !== 'boolean') return null;
  return { tiles, closed };
};

const parseBoardSeat = (v: Json): BoardSeat | null => {
  if (!isRecord(v)) return null;
  const { discards, melds } = v;
  if (!Array.isArray(discards) || discards.length > MAX_DISCARDS) return null;
  if (!Array.isArray(melds) || melds.length > 4) return null;
  const ds = discards.map(d =>
    isRecord(d) && isBoardTile(d.tile) && typeof d.sideways === 'boolean'
      ? { tile: d.tile, sideways: d.sideways }
      : null
  );
  const ms = melds.map(parseBoardMeld);
  if (ds.some(d => d === null) || ms.some(m => m === null)) return null;
  return {
    discards: ds as BoardSeat['discards'],
    melds: ms as BoardMeld[]
  };
};

// The dora indicators of the current hand, or null when they belong to another
export const currentDora = (room: Room): RoomDora | null => {
  const dora = room.dora ?? null;
  if (dora === null) return null;
  const game = room.games[dora.game];
  return dora.game === room.games.length - 1 &&
    game !== undefined &&
    game.events.length === dora.eventCount
    ? dora
    : null;
};

// The board read for the current hand, or null when it belongs to another
export const currentBoard = (room: Room): RoomBoard | null => {
  const board = room.board ?? null;
  if (board === null) return null;
  const game = room.games[board.game];
  return board.game === room.games.length - 1 &&
    game !== undefined &&
    game.events.length === board.eventCount
    ? board
    : null;
};

// Operations only the room owner may send
export const isOwnerOp = (op: RoomOp) =>
  op.type === 'append' ||
  op.type === 'confirm-hora' ||
  op.type === 'cancel-hora';

// Pending wins that still belong to the current state of their game
export const currentPending = (room: Room): PendingHora | null => {
  const pending = room.pending ?? null;
  if (pending === null) return null;
  const game = room.games[pending.game];
  return pending.game === room.games.length - 1 &&
    game !== undefined &&
    game.finishedAt === null &&
    game.events.length === pending.eventCount
    ? pending
    : null;
};

const union = (a: number[], b: number[]) =>
  [...new Set([...a, ...b])].sort((x, y) => x - y);

// Adds a reported win to the pending wins, gathering rons on the same discard
const reportHora = (
  room: Room,
  op: Extract<RoomOp, { type: 'report-hora' }>,
  now: number
): PendingHora | string => {
  const game = room.games[op.game];
  if (game === undefined) return 'game not found';
  if (op.game !== room.games.length - 1) return 'game not current';
  if (game.finishedAt !== null) return 'game finished';
  const pending = currentPending(room);
  const fresh: PendingHora = {
    game: op.game,
    eventCount: game.events.length,
    loser: op.loser,
    wins: [op.win],
    riichi: union([], op.riichi),
    at: now
  };
  if (pending === null) return fresh;
  const others = pending.wins.filter(w => w.winner !== op.win.winner);
  // A correction of the only reported win replaces it
  if (others.length === 0)
    return { ...fresh, riichi: union(pending.riichi, op.riichi) };
  // Another win must be a ron on the same discard (double or triple ron)
  if (pending.loser === null || op.loser === null || pending.loser !== op.loser)
    return 'conflicting hora';
  if (others.length + 1 > room.rule.players - 1) return 'too many winners';
  return {
    ...pending,
    wins: [...others, op.win].sort((a, b) => a.winner - b.winner),
    riichi: union(pending.riichi, op.riichi)
  };
};

export const newGame = (now: number): RoomGame => ({
  startedAt: now,
  finishedAt: null,
  events: []
});

export const createRoom = (
  id: string,
  { name, rule, seats }: NewRoomInput,
  now: number
): Room => ({
  id,
  version: 1,
  createdAt: now,
  updatedAt: now,
  name,
  rule,
  seats,
  games: [newGame(now)],
  pending: null,
  board: null,
  dora: null
});

const updateGame = (
  room: Room,
  index: number,
  f: (game: RoomGame) => RoomGame
): RoomGame[] => room.games.map((g, i) => (i === index ? f(g) : g));

// Returns the updated room, or an error message
export const applyOp = (room: Room, op: RoomOp, now: number): Room | string => {
  const next = (patch: Partial<Room>): Room => ({
    ...room,
    ...patch,
    version: room.version + 1,
    updatedAt: now
  });
  switch (op.type) {
    case 'append': {
      const game = room.games[op.game];
      if (game === undefined) return 'game not found';
      if (game.finishedAt !== null) return 'game finished';
      if (game.events.length >= MAX_EVENTS_PER_GAME) return 'too many events';
      return next({
        games: updateGame(room, op.game, g => ({
          ...g,
          events: [...g.events, op.event]
        })),
        pending: null
      });
    }
    case 'report-hora': {
      const pending = reportHora(room, op, now);
      if (typeof pending === 'string') return pending;
      return next({ pending });
    }
    case 'withdraw-hora': {
      const pending = currentPending(room);
      if (pending === null) return 'nothing pending';
      const wins = pending.wins.filter(w => w.winner !== op.winner);
      if (wins.length === pending.wins.length) return 'not reported';
      return next({ pending: wins.length === 0 ? null : { ...pending, wins } });
    }
    case 'confirm-hora': {
      const pending = currentPending(room);
      if (pending === null) return 'nothing pending';
      const { event } = op;
      if (event.type !== 'hora' || op.game !== pending.game)
        return 'stale hora';
      const winners = (ws: RoomWin[]) =>
        ws
          .map(w => w.winner)
          .sort((a, b) => a - b)
          .join(',');
      if (
        event.loser !== pending.loser ||
        winners(event.wins) !== winners(pending.wins)
      )
        return 'stale hora';
      const game = room.games[op.game];
      if (game === undefined) return 'game not found';
      if (game.events.length >= MAX_EVENTS_PER_GAME) return 'too many events';
      return next({
        games: updateGame(room, op.game, g => ({
          ...g,
          events: [...g.events, event]
        })),
        pending: null
      });
    }
    case 'cancel-hora':
      if (currentPending(room) === null) return 'nothing pending';
      return next({ pending: null });
    case 'set-board': {
      const game = room.games[op.game];
      if (game === undefined) return 'game not found';
      if (op.game !== room.games.length - 1) return 'game not current';
      if (game.finishedAt !== null) return 'game finished';
      return next({
        board: {
          game: op.game,
          eventCount: game.events.length,
          seats: op.seats,
          at: now
        }
      });
    }
    case 'set-dora': {
      const game = room.games[op.game];
      if (game === undefined) return 'game not found';
      if (op.game !== room.games.length - 1) return 'game not current';
      if (game.finishedAt !== null) return 'game finished';
      return next({
        dora: {
          game: op.game,
          eventCount: game.events.length,
          tiles: op.tiles,
          at: now
        }
      });
    }
    case 'undo': {
      const game = room.games[op.game];
      if (game === undefined) return 'game not found';
      // Undoing a manual end reopens the game
      if (game.finishedAt !== null)
        return next({
          games: updateGame(room, op.game, g => ({ ...g, finishedAt: null })),
          pending: null
        });
      if (game.events.length === 0) return 'nothing to undo';
      return next({
        games: updateGame(room, op.game, g => ({
          ...g,
          events: g.events.slice(0, -1)
        })),
        pending: null
      });
    }
    case 'set-seat':
      return next({
        seats: room.seats.map((s, i) => (i === op.seat ? op.name : s))
      });
    case 'finish-game': {
      const game = room.games[op.game];
      if (game === undefined) return 'game not found';
      if (game.finishedAt !== null) return 'game finished';
      return next({
        games: updateGame(room, op.game, g => ({ ...g, finishedAt: now })),
        pending: null
      });
    }
    case 'new-game':
      if (room.games.length >= MAX_GAMES_PER_ROOM) return 'too many games';
      return next({ games: [...room.games, newGame(now)], pending: null });
  }
};
