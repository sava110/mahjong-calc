export interface Rule {
  red: {
    m: 0 | 1 | 2 | 3 | 4;
    p: 0 | 1 | 2 | 3 | 4;
    s: 0 | 1 | 2 | 3 | 4;
  };
  honbaBonus: 100 | 500;
  roundedMangan: boolean;
  doubleWindFu: 2 | 4;
  accumlatedYakuman: boolean;
  multipleYakuman: boolean;
  kokushi13DoubleYakuman: boolean;
  suankoTankiDoubleYakuman: boolean;
  daisushiDoubleYakuman: boolean;
  pureChurenDoubleYakuman: boolean;
  players: 3 | 4;
  sanmaTsumo: 'tsumo-son' | 'split';
  openRiichi: boolean;
}

export const compareRules = (a: Rule, b: Rule) =>
  a.red.m === b.red.m &&
  a.red.p === b.red.p &&
  a.red.s === b.red.s &&
  a.honbaBonus === b.honbaBonus &&
  a.roundedMangan === b.roundedMangan &&
  a.doubleWindFu === b.doubleWindFu &&
  a.accumlatedYakuman === b.accumlatedYakuman &&
  a.multipleYakuman === b.multipleYakuman &&
  a.kokushi13DoubleYakuman === b.kokushi13DoubleYakuman &&
  a.suankoTankiDoubleYakuman === b.suankoTankiDoubleYakuman &&
  a.daisushiDoubleYakuman === b.daisushiDoubleYakuman &&
  a.pureChurenDoubleYakuman === b.pureChurenDoubleYakuman &&
  a.players === b.players &&
  a.sanmaTsumo === b.sanmaTsumo &&
  a.openRiichi === b.openRiichi;
