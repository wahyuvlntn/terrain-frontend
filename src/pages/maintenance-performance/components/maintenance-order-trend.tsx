import { COLOR, Container, InfoTooltip, Legends, Loading } from '@digital-twin/components';
import { MaintenanceOrderTrend as MaintenanceOrderTrendIcon } from '@digital-twin/icons';
import ReactECharts from 'echarts-for-react';

import { useMaintenanceOrderTrend } from './maintenance-order-trend.hook';
import styles from './maintenance-order-trend.module.scss';
import NoData from './no-data';

interface MaintenanceOrderTrenProps {
  isLegend?: boolean;
}

const MaintenanceOrderTrend = ({ isLegend = false }: MaintenanceOrderTrenProps) => {
  const { chartOption, chartRef, isFetching, maintenanceOrderTrend } =
    useMaintenanceOrderTrend(isLegend);
  return (
    <Container
      className={styles['maintenance-order-trend']}
      title="Maintenance Order Trend"
      icon={<MaintenanceOrderTrendIcon />}
      rightTopComponent={
        <div className={styles['right-top-component']}>
          <InfoTooltip
            title={'Maintenance Order Trend'}
            content={
              <>
                <span>
                  Displays the daily count of maintenance orders across the selected period,
                </span>
                <br />
                <span>
                  separated into preventive and corrective categories to reveal patterns, peaks, and
                </span>
                <br />
                <span>shifts in maintenance demand.</span>
              </>
            }
          />
          <Legends
            wrapperProps={{ style: { overflow: 'auto' } }}
            data={[
              {
                color: COLOR.conditionCriticalSecondary,
                label: 'Corrective',
              },
              { color: COLOR.brandSurfaceDarkSecondary, label: 'Preventive' },
            ]}
          />
        </div>
      }
    >
      <div className={styles['chart-container']}>
        <Loading isLoading={isFetching} />
        {maintenanceOrderTrend &&
        maintenanceOrderTrend.length > 0 &&
        !maintenanceOrderTrend.every(
          (el) => el.correctiveCount === 0 && el.preventiveCount === 0
        ) ? (
          <ReactECharts
            className={styles['chart']}
            ref={chartRef}
            option={chartOption}
            style={{
              height: '100%',
              width: '100%',
              overflow: 'hidden',
            }}
          />
        ) : (
          <NoData />
        )}
      </div>
    </Container>
  );
};

export default MaintenanceOrderTrend;
