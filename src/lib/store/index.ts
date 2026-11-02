import type { Reducer } from 'react';
import {
  type Meld,
  allInputTiles,
  effectiveRiichi,
  instantiateMeld
} from '../input';
import type { Rule } from '../rule';
import type { Wind } from '../table';
import { compareTiles, isAvailableTiles, isRemovedTile } from '../tile';
import type { Tile } from '../tile';
import { product2, shuffle, unreachable } from '../util';
import type { Action } from './action';
import type { AppState } from './state';

const reducerImpl: Reducer<AppState, Action> = (state, { type, payload }) => {
  switch (type) {
    case 'set-current-screen':
      return { ...state, currentScreen: payload };
    case 'set-current-scoring-table-tab':
      return { ...state, currentScoringTableTab: payload };
    case 'set-current-settings-tab':
      return { ...state, currentSettingsTab: payload };
    case 'set-app-config':
      return { ...state, appConfig: payload };
    case 'set-current-rule': {
      // There is no red 5m in three-player mahjong
      const rule: Rule =
        payload.players === 3
          ? { ...payload, red: { ...payload.red, m: 0 } }
          : payload;
      const prev =
        state.currentRule.red.m !== rule.red.m ||
        state.currentRule.red.p !== rule.red.p ||
        state.currentRule.red.s !== rule.red.s ||
        state.currentRule.players !== rule.players
          ? reducerImpl(state, { type: 'clear-input', payload: null })
          : state;
      // There is no north seat in three-player mahjong
      const toThree = (w: Wind): Wind =>
        rule.players === 3 && w === 'north' ? 'east' : w;
      return {
        ...prev,
        currentRule: rule,
        handOptions: {
          ...prev.handOptions,
          riichi: effectiveRiichi(prev.handOptions.riichi, rule)
        },
        table: {
          ...prev.table,
          round: toThree(prev.table.round),
          seat: toThree(prev.table.seat)
        }
      };
    }
    case 'set-table':
      return { ...state, table: payload };
    case 'set-input':
      return { ...state, input: payload };
    case 'set-input-random': {
      const { players } = state.currentRule;
      const wall = shuffle([
        ...product2(['m', 'p', 's'], [1, 2, 3, 4, 5, 6, 7, 8, 9]).flatMap(
          ([type, n]) => {
            if (n === 5) {
              return [...Array(4)].map(
                (_, i) =>
                  ({
                    type,
                    n,
                    red: i < state.currentRule.red[type as keyof Rule['red']]
                  }) as Tile
              );
            }
            return [...Array(4)].map(() => ({ type, n }) as Tile);
          }
        ),
        ...[1, 2, 3, 4, 5, 6, 7].flatMap(n =>
          [...Array(4)].flatMap(() => ({ type: 'z', n }) as Tile)
        )
      ]).filter(t => !isRemovedTile(t, players));
      const hand = (
        payload === 'chinitsu'
          ? (() => {
              const type = shuffle(
                players === 3 ? ['p', 's'] : ['m', 'p', 's']
              )[0];
              return wall.filter(t => t.type === type).splice(0, 14);
            })()
          : wall.splice(0, payload)
      ).sort(compareTiles);
      hand.push(...hand.splice(Math.floor(Math.random() * hand.length), 1));
      return {
        ...state,
        input: { hand, melds: [], dora: [], nukidora: 0 },
        inputFocus: { type: 'hand' }
      };
    }
    case 'set-input-focus':
      return { ...state, inputFocus: payload };
    case 'remove-hand-tile':
      return {
        ...state,
        input: {
          ...state.input,
          hand: (() => {
            const removed = state.input.hand.flatMap((tile, i) =>
              i === payload ? [] : [tile]
            );
            return removed.length % 3 !== 2
              ? removed.sort(compareTiles)
              : removed;
          })()
        },
        inputFocus: { type: 'hand' }
      };
    case 'remove-dora-tile':
      return {
        ...state,
        input: {
          ...state.input,
          dora: state.input.dora.flatMap((tile, i) =>
            i === payload ? [] : [tile]
          )
        },
        inputFocus: { type: 'dora' }
      };
    case 'add-meld':
      if (payload.type === 'chii' && state.currentRule.players === 3)
        return state;
      if (
        state.input.melds.length < 4 &&
        14 - state.input.melds.length * 3 - state.input.hand.length >= 3
      )
        return {
          ...state,
          input: { ...state.input, melds: [...state.input.melds, payload] },
          inputFocus: { type: 'meld', i: state.input.melds.length }
        };
      return state;
    case 'update-meld':
      return {
        ...state,
        input: {
          ...state.input,
          melds: state.input.melds.flatMap((meld, i) =>
            i === payload.i ? [payload.meld] : [meld]
          )
        }
      };
    case 'remove-meld':
      return {
        ...state,
        input: {
          ...state.input,
          melds: state.input.melds.flatMap((meld, i) =>
            i === payload ? [] : [meld]
          )
        },
        inputFocus: { type: 'hand' }
      };
    case 'toggle-current-meld-red': {
      if (state.inputFocus.type !== 'meld') return state;
      const meldIndex = state.inputFocus.i;
      const meld = state.input.melds[meldIndex] as Meld;
      if (meld.tile === null) return state;
      if (meld.type === 'kan') return state;
      const toSwap: Meld | null =
        meld.type === 'pon' && meld.tile.type !== 'z' && meld.tile.n === 5
          ? {
              ...meld,
              tile: { ...meld.tile, red: !meld.tile.red }
            }
          : meld.type === 'chii'
            ? meld.tile.n === 5
              ? {
                  ...meld,
                  tile: { ...meld.tile, red: !meld.tile.red }
                }
              : meld.tile.n === 3 || meld.tile.n === 4
                ? { ...meld, includeRed: !meld.includeRed }
                : null
            : null;
      if (
        toSwap !== null &&
        isAvailableTiles(
          state.currentRule.red,
          allInputTiles(
            {
              ...state.input,
              melds: state.input.melds.filter((_, i) => i !== meldIndex)
            },
            state.currentRule
          ),
          instantiateMeld(toSwap, state.currentRule.red)
        )
      ) {
        return reducerImpl(state, {
          type: 'update-meld',
          payload: { i: meldIndex, meld: toSwap }
        });
      }
      return state;
    }
    case 'clear-input':
      return {
        ...state,
        input: { hand: [], melds: [], dora: [], nukidora: 0 },
        inputFocus: { type: 'hand' }
      };
    case 'click-tile-keyboard': {
      if (isRemovedTile(payload, state.currentRule.players)) return state;
      const inputTiles = allInputTiles(state.input, state.currentRule);
      switch (state.inputFocus.type) {
        case 'hand':
          if (
            state.input.hand.length < 14 - state.input.melds.length * 3 &&
            isAvailableTiles(state.currentRule.red, inputTiles, [payload])
          ) {
            return {
              ...state,
              input: {
                ...state.input,
                hand:
                  (state.input.hand.length + 1) % 3 === 2
                    ? [...state.input.hand, payload]
                    : [...state.input.hand, payload].sort(compareTiles)
              }
            };
          }
          return state;
        case 'meld': {
          const meld = state.input.melds[state.inputFocus.i] as Meld;
          if (meld.tile === null) {
            switch (meld.type) {
              case 'pon': {
                const toAdd: Meld = { type: 'pon', tile: payload };
                if (
                  isAvailableTiles(
                    state.currentRule.red,
                    inputTiles,
                    instantiateMeld(toAdd, state.currentRule.red)
                  )
                ) {
                  return reducerImpl(state, {
                    type: 'update-meld',
                    payload: { i: state.inputFocus.i, meld: toAdd }
                  });
                }
                break;
              }
              case 'chii': {
                if (payload.type === 'z' || payload.n >= 8) return state;
                const toAddNonRed: Meld = {
                  type: 'chii',
                  tile: payload,
                  includeRed: false
                };
                const toAddRed: Meld = {
                  type: 'chii',
                  tile: payload,
                  includeRed: true
                };
                if (
                  isAvailableTiles(
                    state.currentRule.red,
                    inputTiles,
                    instantiateMeld(toAddNonRed, state.currentRule.red)
                  )
                ) {
                  return reducerImpl(state, {
                    type: 'update-meld',
                    payload: { i: state.inputFocus.i, meld: toAddNonRed }
                  });
                }
                if (
                  isAvailableTiles(
                    state.currentRule.red,
                    inputTiles,
                    instantiateMeld(toAddRed, state.currentRule.red)
                  )
                ) {
                  return reducerImpl(state, {
                    type: 'update-meld',
                    payload: { i: state.inputFocus.i, meld: toAddRed }
                  });
                }
                break;
              }
              case 'kan': {
                const toAdd: Meld = {
                  type: 'kan',
                  tile: payload,
                  closed: meld.closed
                };
                if (
                  isAvailableTiles(
                    state.currentRule.red,
                    inputTiles,
                    instantiateMeld(toAdd, state.currentRule.red)
                  )
                ) {
                  return reducerImpl(state, {
                    type: 'update-meld',
                    payload: { i: state.inputFocus.i, meld: toAdd }
                  });
                }
                break;
              }
            }
          }
          return state;
        }
        case 'dora':
          if (
            state.input.dora.length < 10 &&
            isAvailableTiles(state.currentRule.red, inputTiles, [payload])
          ) {
            return {
              ...state,
              input: {
                ...state.input,
                dora: [...state.input.dora, payload]
              }
            };
          }
          return state;
        default:
          return unreachable();
      }
    }
    case 'set-nukidora': {
      if (state.currentRule.players !== 3 || payload < 0 || payload > 4)
        return state;
      const others = allInputTiles(
        { ...state.input, nukidora: 0 },
        state.currentRule
      );
      if (
        payload > 0 &&
        !isAvailableTiles(
          state.currentRule.red,
          others,
          [...Array(payload)].map(() => ({ type: 'z', n: 4 }) as Tile)
        )
      )
        return state;
      return { ...state, input: { ...state.input, nukidora: payload } };
    }
    case 'set-hand-options':
      return { ...state, handOptions: payload };
    case 'delete-saved-rule':
      return {
        ...state,
        savedRules: Object.entries(state.savedRules).reduce(
          (acc, [name, rule]) =>
            name === payload ? acc : { ...acc, [name]: rule },
          {} as typeof state.savedRules
        )
      };
    case 'save-current-rule':
      return {
        ...state,
        savedRules: { ...state.savedRules, [payload]: state.currentRule }
      };
  }
};

export const reducer: Reducer<AppState, Action> = (state, action) => {
  const newState = reducerImpl(state, action);
  localStorage.setItem(
    'store',
    JSON.stringify({ revision: 1, store: newState })
  );
  return newState;
};
