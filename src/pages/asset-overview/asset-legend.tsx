import { AssetCard, ConditionEnum, Legend, StatusEnum, TooltipContent } from '@digital-twin/components';
import AssetDummy from '@digital-twin/images/asset-dummy.webp';
import { t } from '@digital-twin/utils';

import styles from './asset-legend.module.scss';

export const AssetLegend = () => {
  return (
    <Legend>
      <div className={styles.container}>
        <AssetCard
          runningHours={999999}
          className={styles['asset-card']}
          name={'VMC-008'}
          status={StatusEnum.enum.RUNNING}
          statusStartTime={new Date()}
          model={'Fanuc Robodrill 540 iD'}
          type={'Vertical Machining Center'}
          conditionStartTime={'2024-01-01'}
          condition={ConditionEnum.enum.NORMAL}
          warningCount={2}
          criticalCount={3}
          uptime={78}
          image={AssetDummy}
          variant={'details'}
        >
          <TooltipContent
            content={t('common.equipment_photo')}
            position={'right'}
            size={'large'}
            className={styles['tooltip__eq-photo']}
            contentStyle={{
              whiteSpace: 'unset',
              width: 125,
            }}
          />
          <TooltipContent
            content={t('common.equipment_name')}
            position={'bottom'}
            size={'large'}
            className={styles['tooltip__eq-name']}
          />
          <TooltipContent
            content={t('common.equipment_information')}
            position={'top'}
            size={'large'}
            className={styles['tooltip__eq-information']}
          />
          <TooltipContent
            content={'Accumulated Alarm Information'}
            position={'top'}
            size={'large'}
            className={styles['tooltip__eq-alarm-info']}
            contentStyle={{
              whiteSpace: 'unset',
              width: 200,
            }}
          />
          <TooltipContent
            content={t('common.condition_information')}
            position={'bottom-end'}
            size={'large'}
            className={styles['tooltip__eq-condition']}
          />
          <TooltipContent
            content={'Uptime'}
            position={'left'}
            size={'large'}
            className={styles['tooltip__eq-oee']}
          />
          <TooltipContent
            content={
              <div className={styles['eq-status']}>
                <span>Current Equipment Status</span>
                <span className={styles.desc}>({t('common.three_minutes_interval')})</span>
              </div>
            }
            position={'bottom'}
            size={'large'}
            className={styles['tooltip__eq-status']}
          />
        </AssetCard>
      </div>
    </Legend>
  );
};
