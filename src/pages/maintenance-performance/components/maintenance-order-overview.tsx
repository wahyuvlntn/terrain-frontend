import { Container, Dropdown, InfoTooltip, Loading } from '@digital-twin/components';
import { ChartDonutFilled } from '@digital-twin/icons';
import ReactECharts from 'echarts-for-react';

import { useMaintenanceOrderOverview } from './maintenance-order-overview.hook';
import styles from './maintenance-order-overview.module.scss';
import NoData from './no-data';

type MaintenanceOrderOverviewProps = {
  selectedFilter: string;
  handleSelectedFilterChange: (val: string) => void;
  isLegend?: boolean;
};

const MaintenanceOrderOverview = ({
  selectedFilter,
  handleSelectedFilterChange,
  isLegend = false,
}: MaintenanceOrderOverviewProps) => {
  const { filterByDropdown, chartOption, chartRef, maintenanceOrderOverview, isFetching } =
    useMaintenanceOrderOverview({ selectedFilter, isLegend });

  return (
    <Container
      className={styles['maintenance-order-overview']}
      title="Maintenance Order Overview"
      icon={<ChartDonutFilled />}
      rightTopComponent={
        <div className={styles['right-top-component']}>
          <InfoTooltip
            title={'Maintenance Order Overview'}
            content={
              <>
                <span>
                  Provides a clear breakdown of maintenance orders by status within the selected
                  period, giving a quick
                </span>
                <br />
                <span>snapshot of overall operational activity and workload distribution.</span>
              </>
            }
          />
          <Dropdown
            wrapperStyles={{ width: 116 }}
            value={selectedFilter}
            options={filterByDropdown}
            onChange={handleSelectedFilterChange}
          />
        </div>
      }
    >
      <div className={styles['chart-container']}>
        <Loading isLoading={isFetching} />
        {maintenanceOrderOverview.length !== 0 ? (
          <ReactECharts
            className={styles['chart']}
            ref={chartRef}
            option={chartOption}
            style={{
              height: '306px',
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

export default MaintenanceOrderOverview;
