import type { Rule } from './rule';
import type { NumberTile, Tile } from './tile';

export interface Pon {
  type: 'pon';
  tile: Tile | null;
}

export interface Chii {
  type: 'chii';
  tile: NumberTile | null;
  includeRed: boolean;
}

export interface Kan {
  type: 'kan';
  tile: Tile | null;
  closed: boolean;
}

export type Meld = Pon | Chii | Kan;

export interface Input {
  hand: Tile[];
  melds: Meld[];
  dora: Tile[];
  nukidora: number;
}

export const instantiateMeld = (meld: Meld, red: Rule['red']): Tile[] => {
  const { type, tile } = meld;
  if (tile === null) return [];

  switch (type) {
    case 'pon':
      if (tile.type !== 'z' && tile.n === 5) {
        const r = red[tile.type];
        return [
          ...[
            ...Array(tile.red ? Math.max(0, 4 - r - 1) : Math.min(3, 4 - r))
          ].map(() => ({ ...tile, red: false })),
          ...[...Array(tile.red ? Math.min(3, r) : Math.max(0, r - 1))].map(
            () => ({ ...tile, red: true })
          )
        ];
      }
      return [...Array(3)].map(() => tile);
    case 'chii': {
      if (tile.n >= 8) throw new Error();
      const r =
        (meld.includeRed && red[tile.type] >= 1) || red[tile.type] === 4;
      return [
        tile,
        tile.n + 1 === 5
          ? { ...tile, n: 5, red: r }
          : ({ ...tile, n: tile.n + 1 } as NumberTile),
        (tile.n + 2 === 5
          ? { ...tile, n: 5, red: r }
          : { ...tile, n: tile.n + 2 }) as NumberTile
      ];
    }
    case 'kan':
      if (tile.type !== 'z' && tile.n === 5) {
        const r = red[tile.type];
        return [
          ...[...Array(4 - r)].map(() => ({ ...tile, red: false })),
          ...[...Array(r)].map(() => ({ ...tile, red: true }))
        ];
      }
      return [...Array(4)].map(() => tile);
  }
};

// North tiles set aside as nukidora (three-player mahjong only)
export const nukidoraTiles = (
  { nukidora }: Pick<Input, 'nukidora'>,
  { players }: Pick<Rule, 'players'>
): Tile[] =>
  players === 3 ? [...Array(nukidora)].map(() => ({ type: 'z', n: 4 })) : [];

// All tiles visible to the player, used to check availability of tiles
export const allInputTiles = (input: Input, rule: Rule): Tile[] => [
  ...input.hand,
  ...input.melds.flatMap(meld => instantiateMeld(meld, rule.red)),
  ...input.dora,
  ...nukidoraTiles(input, rule)
];

export type InputFocus =
  | { type: 'hand' }
  | { type: 'dora' }
  | { type: 'meld'; i: number };

export interface HandOptions {
  riichi:
    | 'none'
    | 'riichi'
    | 'double-riichi'
    | 'open-riichi'
    | 'open-double-riichi';
  ippatsu: boolean;
  rinshan: boolean;
  chankan: boolean;
  haitei: boolean;
  tenho: boolean;
}

// Open riichi falls back to normal riichi when the local rule is disabled
export const effectiveRiichi = (
  riichi: HandOptions['riichi'],
  { openRiichi }: Pick<Rule, 'openRiichi'>
): HandOptions['riichi'] =>
  openRiichi
    ? riichi
    : riichi === 'open-riichi'
      ? 'riichi'
      : riichi === 'open-double-riichi'
        ? 'double-riichi'
        : riichi;

export const isDoubleRiichi = (riichi: HandOptions['riichi']) =>
  riichi === 'double-riichi' || riichi === 'open-double-riichi';
