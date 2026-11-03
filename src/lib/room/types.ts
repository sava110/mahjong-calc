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
  | { type: 'undo'; game: number }
  | { type: 'set-seat'; seat: number; name: string }
  | { type: 'finish-game'; game: number }
  | { type: 'new-game' };
