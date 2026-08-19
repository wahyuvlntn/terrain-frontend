import {
  FILTER_KEY_MODEL,
  FILTER_KEY_SEVERITY,
  FILTER_SEARCH_PARAMS_PARSER_MODEL,
  FILTER_SEARCH_PARAMS_PARSER_SEVERITY,
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
  SeverityShortcut,
  SeverityTree,
  useGetFilter,
} from '@digital-twin/components';
import { format } from 'date-fns';
import { useEffect } from 'react';

import { EarlyWarningDetail } from './components/early-warning-detail';
import { EarlyWarningDiagnosticLegend } from './components/early-warning-diagnostic-legend';
import { EarlyWarningList } from './components/early-warning-list';
import { ExportEarlyWarning } from './components/export-early-warning';
import styles from './early-warning-and-diagnostics.module.scss';
import { EarlyWarningFilterType, GeneralFilterType } from './type';

export const useGetEarlyWarningFilter = () => {
  const { setFilter, data, isReady, handleFilterDataChange, ...filter } = useGetFilter<
    GeneralFilterType,
    EarlyWarningFilterType
  >({
    keys: [
      {
        key: FILTER_KEY_SEVERITY,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_SEVERITY,
      },
      {
        key: FILTER_KEY_MODEL,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_MODEL,
      },
    ],
    additionalFilters: [
      {
        key: 'search',
      },
      {
        key: 'page',
      },
      {
        key: 'selected',
      },
      {
        key: 'start',
      },
      {
        key: 'end',
      },
      {
        key: 'compound',
      },
      {
        key: 'degradation',
      },
    ],
  });

  return {
    setFilter,
    data,
    isReady,
    handleFilterDataChange,
    ...filter,
  };
};

export const EarlyWarningAndDiagnostic = () => {
  const { setFilter, data, isReady, handleFilterDataChange, ...filter } =
    useGetEarlyWarningFilter();

  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      page: prev.page || '1',
      compound: prev.compound || 'true',
      degradation: prev.degradation || 'true',
    }));
  }, []);
  return (
    <Filter
      onDataChange={(data) => {
        handleFilterDataChange(data);
        setFilter((prev) => ({
          ...prev,
          page: '1',
        }));
      }}
      setFilter={setFilter}
      data={data}
      isReady={isReady}
      {...filter}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <EarlyWarningDiagnosticLegend />
            <FilterShortcutContainer>
              <FilterDrawerToggleButton />
              <FilterShortcut>
                <LocationShortcut />
                <SeverityShortcut />
                <ModelShortcut />
              </FilterShortcut>
            </FilterShortcutContainer>
            <FilterDrawer>
              <FilterDrawerShortcuts>
                <LocationShortcut />
                <SeverityShortcut />
                <ModelShortcut />
              </FilterDrawerShortcuts>
              <FilterTree>
                <SeverityTree />
                <ModelTree />
              </FilterTree>
            </FilterDrawer>
          </div>
          <div className={styles.headerRight}>
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
              contentWrapperStyle={{ zIndex: '10' }}
            />
            <ExportEarlyWarning />
            <LastUpdated />
          </div>
        </div>
        <div className={styles.content}>
          <EarlyWarningList />
          <EarlyWarningDetail />
        </div>
      </div>
    </Filter>
  );
};
