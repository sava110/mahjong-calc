// Shared with the server (server/), which runs this file directly with
// Node's type stripping: use `import type` and explicit `.ts` extensions.

export interface RoomRule {
  players: 3 | 4;
  startPoints: number;
  returnPoints: number;
  // Uma in thousands of points, indexed by rank
  uma: number[];
  length: 'tonpu' | 'hanchan';
  tobi: boolean;
  // Paid by each payer per honba
  honbaBonus: 100 | 500;
  sanmaTsumo: 'tsumo-son' | 'split';
  roundedMangan: boolean;
}

export interface RoomWin {
  winner: number;
  // Base point (基本点) used for the payments
  base: number;
  han: number | null;
  fu: number | null;
  // Number of yakuman, 0 for a normal hand
  yakuman: number;
}

// Seats are indexed from the first dealer (起家) in turn order.
// `deltas` holds the score change of each seat and is stored with the
// event, so changes to the scoring logic never alter past records.
export type RoomEvent =
  | {
      type: 'hora';
      at: number;
      riichi: number[];
      // null for tsumo
      loser: number | null;
      wins: RoomWin[];
      deltas: number[];
    }
  | {
      type: 'ryukyoku';
      at: number;
      riichi: number[];
      tenpai: number[];
      deltas: number[];
    }
  | {
      type: 'adjust';
      at: number;
      note: string;
      deltas: number[];
    };

export interface RoomGame {
  startedAt: number;
  // Set when ended manually; otherwise the end is derived from the events
  finishedAt: number | null;
  events: RoomEvent[];
}

// Wins reported from the players' phones, waiting for the room owner to
// confirm them. Rons on the same discard are gathered here, so a double ron
// reported from two phones becomes one hand.
export interface PendingHora {
  game: number;
  // Events in the game when the first win was reported. Any change to the
  // events (a recorded hand, an undo) clears the pending wins.
  eventCount: number;
  // null for tsumo
  loser: number | null;
  wins: RoomWin[];
  riichi: number[];
  at: number;
}

// A tile in MPSZ notation: "1m".."9m", "1p".., "1s".., "1z".."7z", with "0m",
// "0p", "0s" for red fives
export type BoardTileName = string;

export interface BoardDiscard {
  tile: BoardTileName;
  // Laid sideways: the riichi declaration tile
  sideways: boolean;
}

export interface BoardMeld {
  tiles: BoardTileName[];
  // Closed kan (ankan)
  closed: boolean;
}

export interface BoardSeat {
  // In the order they were discarded
  discards: BoardDiscard[];
  melds: BoardMeld[];
}

// The table as read by a spectator's overhead camera, for one hand. Like
// pending wins, it is cleared when the events of the game change.
export interface RoomBoard {
  game: number;
  eventCount: number;
  seats: BoardSeat[];
  at: number;
}

// Dora indicators of one hand, entered by the dealer at the start of the hand
// and shared with everyone's calculator. Cleared like the board.
export interface RoomDora {
  game: number;
  eventCount: number;
  tiles: BoardTileName[];
  at: number;
}

export interface Room {
  id: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  name: string;
  rule: RoomRule;
  seats: string[];
  games: RoomGame[];
  // Missing in rooms created before pending wins existed
  pending?: PendingHora | null;
  // Missing in rooms created before the board existed
  board?: RoomBoard | null;
  // Missing in rooms created before shared dora indicators existed
  dora?: RoomDora | null;
}

// `append`, `confirm-hora` and `cancel-hora` are for the room owner only:
// the owner decides when the table moves on to the next hand.
export type RoomOp =
  | { type: 'append'; game: number; event: RoomEvent }
  | {
      type: 'report-hora';
      game: number;
      loser: number | null;
      win: RoomWin;
      riichi: number[];
    }
  | { type: 'withdraw-hora'; winner: number }
  | { type: 'confirm-hora'; game: number; event: RoomEvent }
  | { type: 'cancel-hora' }
  // Sent by a spectator's overhead camera; anyone in the room may send it
  | { type: 'set-board'; game: number; seats: BoardSeat[] }
  // Dora indicators of the current hand; anyone in the room may send them
  | { type: 'set-dora'; game: number; tiles: string[] }
  | { type: 'undo'; game: number }
  | { type: 'set-seat'; seat: number; name: string }
  | { type: 'finish-game'; game: number }
  | { type: 'new-game' };
