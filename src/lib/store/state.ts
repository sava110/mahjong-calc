import type { AppConfig } from '../config';
import type { HandOptions, Input, InputFocus } from '../input';
import type { Rule } from '../rule';
import type { Table } from '../table';

export interface AppState {
  currentScreen: 'main' | 'scoring-table' | 'room' | 'settings';
  currentScoringTableTab: 'score' | 'diff';
  currentSettingsTab: 'rule' | 'appearance' | 'about';
  appConfig: AppConfig;
  savedRules: { [name: string]: Rule };
  currentRule: Rule;
  table: Table;
  input: Input;
  inputFocus: InputFocus;
  handOptions: HandOptions;
}

export const initialState: AppState = {
  currentScreen: 'main',
  currentScoringTableTab: 'score',
  currentSettingsTab: 'rule',
  appConfig: { theme: 'auto', tileColor: 'light', showBazoro: false },
  savedRules: {
    'Mリーグ (M.LEAGUE)': {
      red: {
        m: 1,
        p: 1,
        s: 1
      },
      honbaBonus: 100,
      roundedMangan: true,
      doubleWindFu: 2,
      accumlatedYakuman: false,
      multipleYakuman: true,
      kokushi13DoubleYakuman: false,
      suankoTankiDoubleYakuman: false,
      daisushiDoubleYakuman: false,
      pureChurenDoubleYakuman: false,
      players: 4,
      sanmaTsumo: 'tsumo-son',
      openRiichi: false
    },
    '天鳳 赤あり (Tenhou with red)': {
      red: {
        m: 1,
        p: 1,
        s: 1
      },
      honbaBonus: 100,
      roundedMangan: false,
      doubleWindFu: 4,
      accumlatedYakuman: true,
      multipleYakuman: true,
      kokushi13DoubleYakuman: false,
      suankoTankiDoubleYakuman: false,
      daisushiDoubleYakuman: false,
      pureChurenDoubleYakuman: false,
      players: 4,
      sanmaTsumo: 'tsumo-son',
      openRiichi: false
    },
    '天鳳 赤なし (Tenhou without red)': {
      red: {
        m: 0,
        p: 0,
        s: 0
      },
      honbaBonus: 100,
      roundedMangan: false,
      doubleWindFu: 4,
      accumlatedYakuman: true,
      multipleYakuman: true,
      kokushi13DoubleYakuman: false,
      suankoTankiDoubleYakuman: false,
      daisushiDoubleYakuman: false,
      pureChurenDoubleYakuman: false,
      players: 4,
      sanmaTsumo: 'tsumo-son',
      openRiichi: false
    },
    '雀魂 -じゃんたま- (Mahjong Soul)': {
      red: {
        m: 1,
        p: 1,
        s: 1
      },
      honbaBonus: 100,
      roundedMangan: false,
      doubleWindFu: 4,
      accumlatedYakuman: true,
      multipleYakuman: true,
      kokushi13DoubleYakuman: true,
      suankoTankiDoubleYakuman: true,
      daisushiDoubleYakuman: true,
      pureChurenDoubleYakuman: true,
      players: 4,
      sanmaTsumo: 'tsumo-son',
      openRiichi: false
    },
    '天鳳 三麻 (Tenhou 3P)': {
      red: {
        m: 0,
        p: 1,
        s: 1
      },
      honbaBonus: 100,
      roundedMangan: false,
      doubleWindFu: 4,
      accumlatedYakuman: true,
      multipleYakuman: true,
      kokushi13DoubleYakuman: false,
      suankoTankiDoubleYakuman: false,
      daisushiDoubleYakuman: false,
      pureChurenDoubleYakuman: false,
      players: 3,
      sanmaTsumo: 'tsumo-son',
      openRiichi: false
    },
    '雀魂 三麻 (Mahjong Soul 3P)': {
      red: {
        m: 0,
        p: 1,
        s: 1
      },
      honbaBonus: 100,
      roundedMangan: false,
      doubleWindFu: 4,
      accumlatedYakuman: true,
      multipleYakuman: true,
      kokushi13DoubleYakuman: true,
      suankoTankiDoubleYakuman: true,
      daisushiDoubleYakuman: true,
      pureChurenDoubleYakuman: true,
      players: 3,
      sanmaTsumo: 'tsumo-son',
      openRiichi: false
    }
  },
  currentRule: {
    red: {
      m: 1,
      p: 1,
      s: 1
    },
    honbaBonus: 100,
    roundedMangan: true,
    doubleWindFu: 2,
    accumlatedYakuman: false,
    multipleYakuman: true,
    kokushi13DoubleYakuman: false,
    suankoTankiDoubleYakuman: false,
    daisushiDoubleYakuman: false,
    pureChurenDoubleYakuman: false,
    players: 4,
    sanmaTsumo: 'tsumo-son',
    openRiichi: false
  },
  table: {
    round: 'east',
    seat: 'east',
    continue: 0,
    deposit: 0
  },
  input: {
    dora: [],
    hand: [],
    melds: [],
    nukidora: 0
  },
  inputFocus: { type: 'hand' },
  handOptions: {
    riichi: 'none',
    ippatsu: false,
    rinshan: false,
    chankan: false,
    haitei: false,
    tenho: false
  }
};

// Fill in fields added after the state was saved
const migrateRule = (rule: Partial<Rule>): Rule => ({
  ...initialState.currentRule,
  ...rule
});

export const defaultState = (): AppState => {
  const json = localStorage.getItem('store');
  if (json === null) return initialState;
  const { store } = JSON.parse(json) as { store: AppState };
  return {
    ...initialState,
    ...store,
    savedRules: Object.fromEntries(
      Object.entries(store.savedRules ?? initialState.savedRules).map(
        ([name, rule]) => [name, migrateRule(rule)]
      )
    ),
    currentRule: migrateRule(store.currentRule ?? {}),
    input: { ...initialState.input, ...store.input },
    handOptions: { ...initialState.handOptions, ...store.handOptions }
  };
};
