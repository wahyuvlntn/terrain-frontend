import { ExportNotes } from '@digital-twin/icons';
import { formatDateHTMLInput, t } from '@digital-twin/utils';
import { QueryKey } from '@tanstack/react-query';
import clsx from 'clsx';
import { ReactNode } from 'react';
import { z } from 'zod';

import {
  Button,
  Filter,
  FILTER_KEY_MODEL,
  FILTER_SEARCH_PARAMS_PARSER_ALARM,
  FILTER_SEARCH_PARAMS_PARSER_MODEL,
  FilterDrawerToggleButton,
  FilterShortcut,
  FilterShortcutContainer,
  InputDuration,
  LastUpdated,
  LocationShortcut,
  ModelShortcut,
  ModelTree,
  useGetFilter,
} from '../../../index';
import { FilterDrawer, FilterDrawerShortcuts, FilterTree } from '../filter';
import { FILTER_KEY_ALARM } from '../filter/filter.alarm';
import { useAlarmReport } from './alarm-report.hooks';
import styles from './alarm-report.module.scss';
import { useAlarmExport } from './alarm-report-export.hooks';
import AlarmEventView from './components/alarm-event-view';
import AlarmLegend from './components/alarm-legend';
import AlarmReportView from './components/alarm-report-view';

type AlarmReportProps = {
  filterTypeTree: ReactNode;
  filterTypeShortcut: ReactNode;
  filterTypeKey: string;
  getFilterTypeNamesQueryKey: (selected: number[] | null) => QueryKey;
  alarmTypeTree?: ReactNode;
  alarmTypeShortcut?: ReactNode;
};

export const useAlarmReportGetFilter = (typeFilterKey: string) => {
  const { setFilter, data, isReady, handleFilterDataChange, ...filter } =
    useGetFilter<
      {
        [FILTER_KEY_MODEL]: number;
        [FILTER_KEY_ALARM]: string;
      },
      {
        start: string | null;
        end: string | null;
        eventview: boolean;
        search: string;
        page: number;
        orderBy: string | null;
        orderType: string | null;
      }
    >({
      keys: [
        {
          key: FILTER_KEY_MODEL,
          searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_MODEL,
        },
        {
          key: typeFilterKey,
          searchParamsParser: (data) => Number(data),
        },
        {
          key: FILTER_KEY_ALARM,
          searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_ALARM,
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
          key: 'eventview',
          searchParamsParser: (data) => data === 'true',
        },
        {
          key: 'search',
          searchParamsParser: (data) => data ?? '',
        },
        {
          key: 'page',
          searchParamsParser: (data) => z.coerce.number().catch(1).parse(data),
        },
        {
          key: 'orderBy',
        },
        {
          key: 'orderType',
        },
      ],
      shouldBeResetKeyOnApply: {
        page: 1,
      },
    });

  return {
    setFilter,
    data,
    isReady,
    handleFilterDataChange,
    ...filter,
  };
};

export const AlarmReport = ({
  filterTypeShortcut,
  filterTypeTree,
  filterTypeKey,
  alarmTypeShortcut,
  alarmTypeTree,
  getFilterTypeNamesQueryKey,
}: AlarmReportProps) => {
  const { setFilter, data, isReady, handleFilterDataChange, ...filter } =
    useAlarmReportGetFilter(filterTypeKey);

  const {
    mainRef,
    assets,
    selectedStartDate,
    selectedEndDate,
    selectedPeriod,
    mainRefSize,
    handleDateChange,
    changeViewHandler,
  } = useAlarmReport({
    ...filter,
    isReady,
    data,
    handleFilterDataChange,
    setFilter,
    filterTypeKey,
  });

  const { handleExportFile, loading } = useAlarmExport({
    assets,
    startDate: formatDateHTMLInput(selectedStartDate),
    endDate: formatDateHTMLInput(selectedEndDate),
    selectedPeriod,
    getTypeNamesQueryKey: getFilterTypeNamesQueryKey,
    ...filter,
    isReady,
    data,
    handleFilterDataChange,
    setFilter,
    filterTypeKey,
  });

  return (
    <Filter
      onDataChange={handleFilterDataChange}
      setFilter={setFilter}
      data={data}
      isReady={isReady}
      {...filter}
    >
      <div ref={mainRef} className={styles['main']}>
        <div className={styles['filters']}>
          <div className={'ribbon-item'}>
            <AlarmLegend />
            <FilterShortcutContainer>
              <FilterDrawerToggleButton />
              <FilterShortcut>
                <LocationShortcut />
                {alarmTypeShortcut ?? null}
                <ModelShortcut />
                {filterTypeShortcut}
              </FilterShortcut>
            </FilterShortcutContainer>
            <FilterDrawer>
              <FilterDrawerShortcuts>
                <LocationShortcut />
                {alarmTypeShortcut ?? null}
                <ModelShortcut />
                {filterTypeShortcut}
              </FilterDrawerShortcuts>
              <FilterTree>
                {alarmTypeTree ?? null}
                <ModelTree />
                {filterTypeTree}
              </FilterTree>
            </FilterDrawer>
          </div>
          <div className={clsx(styles['right-filters'], 'ribbon-item')}>
            {selectedEndDate && selectedStartDate && (
              <InputDuration
                type="daterange"
                onChange={handleDateChange}
                endDate={selectedEndDate}
                startDate={selectedStartDate}
                maxDate={new Date()}
                selectedPeriod={selectedPeriod}
              />
            )}
            <Button
              icon={<ExportNotes />}
              onClick={handleExportFile}
              disabled={loading}
            >
              {t('common.export')}
            </Button>
            <LastUpdated />
          </div>
        </div>
        {filter.eventview ? (
          <AlarmEventView
            assets={assets}
            changeView={changeViewHandler}
            startDate={formatDateHTMLInput(selectedStartDate)}
            endDate={formatDateHTMLInput(selectedEndDate)}
            period={selectedPeriod}
          />
        ) : (
          <AlarmReportView
            assets={assets}
            changeView={changeViewHandler}
            mainRef={mainRefSize}
            startDate={formatDateHTMLInput(selectedStartDate)}
            endDate={formatDateHTMLInput(selectedEndDate)}
            period={selectedPeriod}
          />
        )}
      </div>
    </Filter>
  );
};
