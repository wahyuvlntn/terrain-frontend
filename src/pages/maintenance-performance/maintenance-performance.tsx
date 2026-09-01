import {
  FILTER_KEY_MODEL,
  FILTER_SEARCH_PARAMS_PARSER_MODEL,
  Filter,
  FilterDrawer,
  FilterDrawerShortcuts,
  FilterDrawerToggleButton,
  FilterShortcut,
  FilterShortcutContainer,
  FilterTree,
  InputDuration,
  LastUpdated,
  LocationShortcut,
  ModelShortcut,
  ModelTree,
  useGetFilter,
} from '@digital-twin/components';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import {
  FILTER_KEY_TYPE,
  FILTER_SEARCH_PARAMS_PARSER_TYPE,
  TypeShortcut,
  TypeTree,
} from '../../components';
import FrequentIssues from './components/frequent-issues';
import KPIPanel from './components/kpi';
import { MaintenancePerformanceLegend } from './components/legend';
import MaintenanceOrderOverview from './components/maintenance-order-overview';
import MaintenanceOrderTrend from './components/maintenance-order-trend';
import PersonnelCapacityDistribution from './components/personnel-capacity-distribution';
import PersonnelOrders from './components/personnel-orders';
import styles from './maintenance-performance.module.scss';
import { GeneralFilterType, MaintenancePerformanceFilterType } from './type';

const useGetMaintenancePerformanceFilter = () => {
  const { setFilter, data, isReady, handleFilterDataChange, ...filter } = useGetFilter<
    GeneralFilterType,
    MaintenancePerformanceFilterType
  >({
    keys: [
      {
        key: FILTER_KEY_MODEL,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_MODEL,
      },
      {
        key: FILTER_KEY_TYPE,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_TYPE,
      },
    ],
    additionalFilters: [
      {
        key: 'start',
      },
      {
        key: 'end',
      },
      {
        key: 'groupBy',
      },
      {
        key: 'page',
        searchParamsParser: (data) => {
          z.coerce.number().min(1).catch(1).parse(data);
        },
      },
    ],
  });

  const [selectedFilter, setSelectedFilter] = useState(
    filter && filter.groupBy ? filter.groupBy : 'status'
  );
  const handleSelectedFilterChange = (val: string) => {
    setSelectedFilter(val);
    setFilter((prev) => ({
      ...prev,
      groupBy: val,
    }));
  };

  return {
    setFilter,
    data,
    isReady,
    handleFilterDataChange,
    maintenanceProps: {
      selectedFilter,
      handleSelectedFilterChange,
    },
    ...filter,
  };
};

export const MaintenancePerformance = () => {
  const { setFilter, data, isReady, handleFilterDataChange, maintenanceProps, ...filter } =
    useGetMaintenancePerformanceFilter();

  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      page: 1,
      start: !prev.start ? format(new Date(), 'yyyy-MM-dd') : prev.start,
      end: !prev.end ? format(new Date(), 'yyyy-MM-dd') : prev.end,
    }));
  }, []);

  return (
    <Filter
      onDataChange={handleFilterDataChange}
      setFilter={setFilter}
      data={data}
      isReady={isReady}
      {...filter}
    >
      <div className={styles['maintenance-performance']}>
        <div className={styles['header']}>
          <div className="ribbon-item">
            {/* <InformationCircle width={24} height={24} /> */}
            <MaintenancePerformanceLegend />
            <FilterShortcutContainer>
              <FilterDrawerToggleButton />
              <FilterShortcut>
                <LocationShortcut />
                <TypeShortcut />
                <ModelShortcut />
              </FilterShortcut>
            </FilterShortcutContainer>
            <FilterDrawer>
              <FilterDrawerShortcuts>
                <LocationShortcut />
                <TypeShortcut />
                <ModelShortcut />
              </FilterDrawerShortcuts>
              <FilterTree>
                <TypeTree />
                <ModelTree />
              </FilterTree>
            </FilterDrawer>
          </div>
          <div className="ribbon-item">
            <InputDuration
              onChange={(start, end) => {
                setFilter((prev) => ({
                  ...prev,
                  start: format(start, 'yyyy-MM-dd'),
                  end: format(end, 'yyyy-MM-dd'),
                }));
              }}
              startDate={filter.start ? new Date(filter.start) : new Date()}
              endDate={filter.end ? new Date(filter.end) : new Date()}
            />
            <LastUpdated />
          </div>
        </div>
        <div className={styles['top-section']}>
          <MaintenanceOrderOverview {...maintenanceProps} />
          <FrequentIssues />
          <MaintenanceOrderTrend />
        </div>
        <div className={styles['bottom-section']}>
          <KPIPanel />
          <PersonnelOrders />
          <PersonnelCapacityDistribution />
        </div>
      </div>
    </Filter>
  );
};
