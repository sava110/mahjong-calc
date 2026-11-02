import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../contexts/store';
import {
  type HandOptions as HandOptionsType,
  allInputTiles
} from '../lib/input';
import { countBy } from '../lib/util';
import { ConfigItem } from './ui/ConfigItem';
import { Segment } from './ui/Segment';
import { Stepper } from './ui/Stepper';

const allRiichiOptions = [
  'none',
  'riichi',
  'double-riichi',
  'open-riichi',
  'open-double-riichi'
] as const;

export const HandOptions: FC = () => {
  const [{ table, handOptions, currentRule, input }, dispatch] = useStore();
  const { t } = useTranslation();
  const riichiOptions: readonly HandOptionsType['riichi'][] =
    currentRule.openRiichi
      ? allRiichiOptions
      : allRiichiOptions.filter(
          o => o !== 'open-riichi' && o !== 'open-double-riichi'
        );
  const northCount = countBy(
    allInputTiles(input, currentRule),
    tile => tile.type === 'z' && tile.n === 4
  );

  return (
    <div className="flex flex-col gap-2">
      <ConfigItem label={t('hand-options.riichi')}>
        <Segment
          items={riichiOptions.map(o => t(`hand-options.${o}`))}
          index={riichiOptions.indexOf(handOptions.riichi)}
          onChange={i =>
            dispatch({
              type: 'set-hand-options',
              payload: {
                ...handOptions,
                riichi: riichiOptions[i] ?? 'none'
              }
            })
          }
        />
      </ConfigItem>
      <div className="flex flex-wrap gap-2">
        <div className="flex-1">
          <ConfigItem label={t('hand-options.ippatsu')}>
            <Segment
              items={[t('hand-options.none'), t('hand-options.ippatsu')]}
              index={handOptions.ippatsu ? 1 : 0}
              onChange={i =>
                dispatch({
                  type: 'set-hand-options',
                  payload: { ...handOptions, ippatsu: i === 1 }
                })
              }
            />
          </ConfigItem>
        </div>
        <div className="flex-1">
          <ConfigItem label={t('hand-options.rinshan')}>
            <Segment
              items={[t('hand-options.none'), t('hand-options.rinshan')]}
              index={handOptions.rinshan ? 1 : 0}
              onChange={i =>
                dispatch({
                  type: 'set-hand-options',
                  payload: { ...handOptions, rinshan: i === 1 }
                })
              }
            />
          </ConfigItem>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex-1">
          <ConfigItem label={t('hand-options.chankan')}>
            <Segment
              items={[t('hand-options.none'), t('hand-options.chankan')]}
              index={handOptions.chankan ? 1 : 0}
              onChange={i =>
                dispatch({
                  type: 'set-hand-options',
                  payload: { ...handOptions, chankan: i === 1 }
                })
              }
            />
          </ConfigItem>
        </div>
        <div className="flex-1">
          <ConfigItem label={t('hand-options.haitei-hotei')}>
            <Segment
              items={[t('hand-options.none'), t('hand-options.haitei-hotei')]}
              index={handOptions.haitei ? 1 : 0}
              onChange={i =>
                dispatch({
                  type: 'set-hand-options',
                  payload: { ...handOptions, haitei: i === 1 }
                })
              }
            />
          </ConfigItem>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex-1">
          <ConfigItem
            label={t(
              table.seat === 'east'
                ? 'hand-options.tenho'
                : 'hand-options.chiho'
            )}
          >
            <Segment
              items={[
                t('hand-options.none'),
                t(
                  table.seat === 'east'
                    ? 'hand-options.tenho'
                    : 'hand-options.chiho'
                )
              ]}
              index={handOptions.tenho ? 1 : 0}
              onChange={i =>
                dispatch({
                  type: 'set-hand-options',
                  payload: { ...handOptions, tenho: i === 1 }
                })
              }
            />
          </ConfigItem>
        </div>
        <div className="flex-1">
          {currentRule.players === 3 && (
            <ConfigItem label={t('hand-options.nukidora')}>
              <Stepper
                value={input.nukidora}
                canDecrement={input.nukidora > 0}
                canIncrement={northCount < 4}
                onChange={value =>
                  dispatch({ type: 'set-nukidora', payload: value })
                }
              />
            </ConfigItem>
          )}
        </div>
      </div>
    </div>
  );
};
