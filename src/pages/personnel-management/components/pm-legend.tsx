import { Legend, TooltipContent } from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import styles from './pm-legend.module.scss';
import { PMListCard } from './pm-list-card';

export const PMLegend = () => {
  return (
    <Legend>
      <div className={styles['container']}>
        <PMListCard
          selected={false}
          entry={{
            id: 'vincent_tan',
            name: 'Vincent Tan',
            assignedBuildings: 'MPH/ISH Block',
            assignedEquipmentTypes: 'Fan, Condenser',
            currentMaintenanceOrder: 'CM-12-25-015',
            capacityPercentage: 85,
            isDeleted: false,
          }}
          className={styles['pm-list-card']}
        >
          <TooltipContent
            content={t('common.personnel_name')}
            position="bottom"
            size="large"
            className={styles['tooltip__personnel-name']}
          />
          <TooltipContent
            content={t('common.personnel_details')}
            position="top"
            size="large"
            className={styles['tooltip__personnel-details']}
          />
          <TooltipContent
            content={t('common.average_weekly_workload_percentage')}
            position="bottom"
            size="large"
            className={styles['tooltip__personnel-capacity']}
            contentStyle={{
              width: '250px',
              whiteSpace: 'wrap',
              lineHeight: '39px',
            }}
          />
        </PMListCard>
      </div>
    </Legend>
  );
};
