import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { MdNavigateNext } from 'react-icons/md';
import { useStore } from '../contexts/store';
import { useBoundingClientRect } from '../hooks/dom';
import { generateResult } from '../lib/result';
import { compareRules } from '../lib/rule';
import { HandOptions } from './HandOptions';
import { InputGlance } from './InputGlance';
import { Result } from './Result';
import { ResultGlance } from './ResultGlance';
import { TableSettings } from './TableSettings';
import { TileInput } from './ui/TileInput';

const cardClasses =
  'flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800';

// Marks the bottom of a card; the glance bars use these positions
const markerClasses = 'absolute inset-x-0 bottom-0';

export const Calculator: FC = () => {
  const [ruleRef, ruleRect] = useBoundingClientRect<HTMLDivElement>();
  const [tableRef, tableRect] = useBoundingClientRect<HTMLDivElement>();
  const [handOptionsRef, handOptionsRect] =
    useBoundingClientRect<HTMLDivElement>();
  const [{ currentRule, savedRules, table, input, handOptions }, dispatch] =
    useStore();
  const { t } = useTranslation();

  const ruleName =
    Object.entries(savedRules).find(([, r]) =>
      compareRules(r, currentRule)
    )?.[0] ?? t('settings.untitled-rule');

  const result = generateResult(table, input, handOptions, currentRule);

  return (
    <>
      <div className="flex flex-col gap-3 p-3 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] md:mx-auto md:flex-row md:gap-8 lg:container">
        <div className="flex flex-col gap-3 md:basis-1/2 lg:basis-2/5">
          <button
            type="button"
            className={`${cardClasses} relative flex-row items-center gap-2 text-left transition active:bg-stone-100 dark:active:bg-stone-700`}
            onClick={() => {
              dispatch({ type: 'set-current-settings-tab', payload: 'rule' });
              dispatch({ type: 'set-current-screen', payload: 'settings' });
            }}
          >
            <div className="font-bold">{t('settings.rule')}</div>
            <div className="flex-1 truncate text-right text-stone-600 dark:text-stone-300">
              {ruleName}
            </div>
            <MdNavigateNext className="shrink-0 text-xl text-stone-400" />
            <div ref={ruleRef} className={markerClasses} />
          </button>
          <section className={`${cardClasses} relative`}>
            <TableSettings />
            <div ref={tableRef} className={markerClasses} />
          </section>
          <section className={cardClasses}>
            <TileInput />
          </section>
          <section className={`${cardClasses} relative`}>
            <HandOptions />
            <div
              ref={handOptionsRef}
              className={`${markerClasses} md:hidden`}
            />
          </section>
        </div>
        <div className="flex-1 md:basis-1/2 lg:basis-3/5">
          <Result result={result} />
        </div>
      </div>
      <InputGlance
        rulePosition={ruleRect?.y}
        tablePosition={tableRect?.y}
        handOptionsPosition={handOptionsRect?.y}
      />
      <ResultGlance result={result} handOptionsPosition={handOptionsRect?.y} />
    </>
  );
};
