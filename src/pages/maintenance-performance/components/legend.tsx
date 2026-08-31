import { Legend, TooltipContent } from '@digital-twin/components';
import { t } from 'i18next';
import { useMemo, useState } from 'react';

import KPIPanel from './kpi';
import styles from './legend.module.scss';
import MaintenanceOrderOverview from './maintenance-order-overview';
import MaintenanceOrderTrend from './maintenance-order-trend';
import PersonnelCapacityDistribution from './personnel-capacity-distribution';

export const MaintenancePerformanceLegend = () => {
  const [selectedFilter, setSelectedFilter] = useState('status');
  const handleSelectedFilterChange = (val: string) => {
    setSelectedFilter(val);
  };
  const MaintenanceOrderOverviewProps = {
    selectedFilter,
    handleSelectedFilterChange,
    isLegend: true,
  };
  const overviewTypeLabel = useMemo(() => {
    return selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1);
  }, [selectedFilter]);
  const overviewTypePosition = useMemo(() => {
    return selectedFilter === 'severity' ? 20 : selectedFilter === 'priority' ? 30 : 0;
  }, [selectedFilter]);
  return (
    <Legend>
      <div className={styles['container']}>
        <div className={styles['maintenance-order-overview']}>
          <MaintenanceOrderOverview {...MaintenanceOrderOverviewProps} />
          <TooltipContent
            content={'Overview By'}
            position={'bottom'}
            size={'large'}
            right={-15}
            top={25}
          />
          <TooltipContent
            content={overviewTypeLabel + ' Description'}
            position={'bottom'}
            size={'large'}
            right={60}
            top={150 + overviewTypePosition}
          />
          <TooltipContent
            content={overviewTypeLabel + ' Count'}
            position={'top'}
            size={'large'}
            right={6}
            bottom={20 + overviewTypePosition}
          />
          <TooltipContent
            content={overviewTypeLabel + ' Percentage'}
            position={'left'}
            size={'large'}
            left={540}
            bottom={160}
          />
        </div>
        <div className={styles['maintenance-order-trend']}>
          <MaintenanceOrderTrend isLegend={true} />
          <TooltipContent
            content={'Legend'}
            position={'bottom'}
            size={'large'}
            right={60}
            top={25}
          />
          <TooltipContent
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span>• Day of the month (12)</span>
                <span>• Month (11)</span>
              </div>
            }
            position={'top'}
            size={'large'}
            left={-60}
            bottom={-90}
          />
        </div>
        <div className={styles['kpi']}>
          <KPIPanel isLegend={true} />
          <TooltipContent
            content={'Last Update Date'}
            position={'bottom'}
            size={'large'}
            right={100}
            top={65}
          />
          <TooltipContent
            content={t('common.width_adjuster')}
            position={'bottom'}
            size={'large'}
            left={325}
            top={260}
          />
          <TooltipContent
            content={t('common.equipment_name')}
            position={'top'}
            size={'large'}
            left={140}
            bottom={-30}
          />
        </div>
        <div className={styles['personnel-capacity-distribution']}>
          <PersonnelCapacityDistribution isLegend={true} />
          <TooltipContent
            content={'Busy % of Capacity  '}
            position={'top'}
            size={'large'}
            right={170}
            bottom={20}
          />
        </div>
      </div>
    </Legend>
  );
};
