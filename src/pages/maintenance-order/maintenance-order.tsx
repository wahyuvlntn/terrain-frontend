/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable simple-import-sort/imports */
// biome-ignore assist/source/organizeImports: asdasd
import {
  COLOR,
  Filter,
  FILTER_KEY_MAINTENANCE_STATUS,
  FILTER_KEY_MAINTENANCE_TYPE,
  FILTER_KEY_PRIORITY,
  FILTER_KEY_SEVERITY,
  FILTER_KEY_TECHNICIAN,
  FILTER_SEARCH_PARAMS_PARSER_MAINTENANCE_STATUS,
  FILTER_SEARCH_PARAMS_PARSER_MAINTENANCE_TYPE,
  FILTER_SEARCH_PARAMS_PARSER_PRIORITY,
  FILTER_SEARCH_PARAMS_PARSER_SEVERITY,
  FILTER_SEARCH_PARAMS_PARSER_TECHNICIAN,
  FilterDrawer,
  FilterDrawerShortcuts,
  FilterDrawerToggleButton,
  FilterShortcut,
  FilterShortcutContainer,
  FilterTree,
  InputDuration,
  LastUpdated,
  LocationShortcut,
  MaintenanceStatusShortcut,
  MaintenanceStatusTree,
  MaintenanceTypeShortcut,
  MaintenanceTypeTree,
  MonthPicker,
  PriorityShortcut,
  PriorityTree,
  SeverityShortcut,
  SeverityTree,
  TechnicianShortcut,
  TechnicianTree,
  useGetFilter,
  WeekPicker,
} from '@digital-twin/components';
import { ListAlt } from '@digital-twin/icons';
import { CalendarMonthIcon } from '@digital-twin/reusables';
import { useEffect, useMemo, useState } from 'react';

import { CalendarView } from './components/calendar-view';
import { ExportMaintenanceButton } from './components/export-maintenance';
import { ListView } from './components/list-view';
import styles from './maintenance-order.module.scss';
import { GeneralFilterType, MaintenanceOrderFilterType } from './type';
import { format } from 'date-fns';
import { CalendarLegend } from './components/calendar-legend';
import { ListLegend } from './components/list-legend';
import { useSearchParams } from 'react-router-dom';

export const useGetMaintenanceOrderFilter = () => {
  const { setFilter, data, isReady, handleFilterDataChange, ...filter } = useGetFilter<
    GeneralFilterType,
    MaintenanceOrderFilterType
  >({
    keys: [
      {
        key: FILTER_KEY_SEVERITY,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_SEVERITY,
      },
      {
        key: FILTER_KEY_PRIORITY,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_PRIORITY,
      },
      {
        key: FILTER_KEY_MAINTENANCE_TYPE,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_MAINTENANCE_TYPE,
      },
      {
        key: FILTER_KEY_TECHNICIAN,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_TECHNICIAN,
      },
      {
        key: FILTER_KEY_MAINTENANCE_STATUS,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_MAINTENANCE_STATUS,
      },
    ],
    additionalFilters: [
      {
        key: 'view',
      },
      {
        key: 'search',
      },
      {
        key: 'page',
      },
      {
        key: 'tab',
      },
      {
        key: 'selected',
      },
      {
        key: 'selectedName',
      },
      {
        key: 'add',
      },
      {
        key: 'start',
      },
      {
        key: 'end',
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

export const MaintenanceOrder = () => {
  const { setFilter, data, isReady, handleFilterDataChange, ...filter } =
    useGetMaintenanceOrderFilter();

  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      start: prev.start || format(new Date(), 'yyyy-MM-dd'),
      end: prev.end || format(new Date(), 'yyyy-MM-dd'),
      tab: prev.tab || 'details',
      page: prev.page || '1',
      add: prev.add || 'false',
      view: prev.view || 'list',
    }));
  }, []);

  function getMonthRange(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    return {
      first: new Date(year, month, 1),
      last: new Date(year, month + 1, 0),
    };
  }

  const [filterView, setFilterView] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (filter.view === 'calendar') {
      if (filterView === 'week') {
        const startDate = filter.start ? new Date(filter.start) : new Date();
        startDate.setDate(startDate.getDate() - startDate.getDay());
        const endDate = filter.start ? new Date(filter.start) : new Date();
        endDate.setDate(endDate.getDate() - endDate.getDay() + 6);
        setFilter((prev) => ({
          ...prev,
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
        }));
      } else {
        const current = filter.start ? new Date(filter.start) : new Date();
        const range = getMonthRange(current);
        const first = range.first;
        const last = range.last;
        setFilter((prev) => ({
          ...prev,
          start: format(first, 'yyyy-MM-dd'),
          end: format(last, 'yyyy-MM-dd'),
        }));
      }
    }
  }, [filter.view, filterView]);

  const selectedStartDate = useMemo(() => {
    return filter.start ? new Date(filter.start) : new Date();
  }, [filter.start]);

  const selectedEndDate = useMemo(() => {
    return filter.end ? new Date(filter.end) : new Date();
  }, [filter.end]);

  const selectedDatetime = useMemo(() => {
    return filter.start ? new Date(filter.start) : new Date();
  }, [filter.start]);

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 2); // set to three month ahead

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 2);

  const [searchParams] = useSearchParams();

  const view = searchParams.get('view');

  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      view: (view as 'calendar' | 'list') || 'list',
    }));
  }, [view]);

  const [viewContent, setViewContent] = useState(true);

  useEffect(() => {
    setViewContent(false);
  }, [filter.view]);

  useEffect(() => {
    if (!viewContent) {
      setTimeout(() => {
        setViewContent(true);
      }, 100);
    }
  }, [viewContent]);

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
      <div className={styles['maintenance-order']}>
        <div className={styles['header']}>
          <div className={styles['left-side']}>
            {/* <InformationCircle width={24} height={24} /> */}
            {filter.view === 'calendar' ? <CalendarLegend /> : <ListLegend />}
            <FilterShortcutContainer>
              <FilterDrawerToggleButton />
              <FilterShortcut>
                <LocationShortcut />
                <MaintenanceStatusShortcut />
                <SeverityShortcut />
                <PriorityShortcut />
                <MaintenanceTypeShortcut />
                <TechnicianShortcut />
              </FilterShortcut>
            </FilterShortcutContainer>
            <FilterDrawer>
              <FilterDrawerShortcuts>
                <LocationShortcut />
                <MaintenanceStatusShortcut />
                <SeverityShortcut />
                <PriorityShortcut />
                <MaintenanceTypeShortcut />
                <TechnicianShortcut />
              </FilterDrawerShortcuts>
              <FilterTree>
                <MaintenanceStatusTree />
                <SeverityTree />
                <PriorityTree />
                <MaintenanceTypeTree />
                <TechnicianTree />
              </FilterTree>
            </FilterDrawer>
          </div>
          <div className={styles['right-side']}>
            {filter.view === 'list' ? (
              <InputDuration
                selectUntilToday={false}
                onChange={(start, end) => {
                  setFilter((prev) => ({
                    ...prev,
                    start: format(start, 'yyyy-MM-dd'),
                    end: format(end, 'yyyy-MM-dd'),
                  }));
                }}
                startDate={filter.start ? new Date(filter.start) : new Date()}
                endDate={filter.end ? new Date(filter.end) : new Date()}
                maxDate={maxDate}
                minDate={minDate}
                contentWrapperStyle={{ zIndex: '10' }}
              />
            ) : filterView === 'week' && filter.view === 'calendar' ? (
              <WeekPicker
                selectedStartDate={selectedStartDate}
                selectedEndDate={selectedEndDate}
                onSelectedWeek={function (startDate: Date, endDate: Date): void {
                  // throw new Error('Function not implemented.');
                  startDate.setDate(startDate.getDate() + 1);
                  endDate.setDate(endDate.getDate() + 1);
                  setFilter((prev) => ({
                    ...prev,
                    start: format(startDate, 'yyyy-MM-dd'),
                    end: format(endDate, 'yyyy-MM-dd'),
                  }));
                }}
              />
            ) : (
              <MonthPicker
                selectedMonth={selectedDatetime}
                onSelectedMonth={(selected) => {
                  const range = getMonthRange(selected);
                  const first = range.first;
                  const last = range.last;
                  setFilter((prev) => ({
                    ...prev,
                    start: format(first, 'yyyy-MM-dd'),
                    end: format(last, 'yyyy-MM-dd'),
                  }));
                }}
              />
            )}
            <SwitchCalendarList
              filterView={filter.view}
              setFilterView={(type) => {
                setFilter((prev) => ({
                  ...prev,
                  view: type,
                  add: 'false',
                }));
              }}
            />
            <ExportMaintenanceButton />
            <LastUpdated />
          </div>
        </div>

        {viewContent && (
          <div className={styles['content']}>
            {filter.view === 'calendar' ? (
              <CalendarView
                selectedStartDate={selectedStartDate}
                selectedEndDate={selectedEndDate}
                selectedDatetime={selectedDatetime}
                filterView={filterView}
                setFilterView={setFilterView}
              />
            ) : (
              // <div>Test</div>
              <ListView />
            )}
          </div>
        )}
      </div>
    </Filter>
  );
};

interface SwitchCalendarList {
  filterView: 'calendar' | 'list' | null;
  setFilterView: (type: 'calendar' | 'list' | null) => void;
}
export const SwitchCalendarList = ({ filterView, setFilterView }: SwitchCalendarList) => {
  return (
    <div className={styles['view-options']}>
      <div
        className={styles['option']}
        style={{
          backgroundColor:
            filterView === 'calendar' ? COLOR.brandSurfaceDefaultPrimary : COLOR.backgroundLow,
          color: filterView !== 'calendar' ? COLOR.neutralTextTitleHeading : '',
          opacity: filterView === 'calendar' ? 1 : 0.6,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
        }}
        onClick={() => {
          setFilterView('calendar');
        }}
      >
        <CalendarMonthIcon width={20} height={20} />
        <div>Calendar</div>
      </div>
      <div
        className={styles['option']}
        style={{
          backgroundColor:
            filterView === 'list' ? COLOR.brandSurfaceDefaultPrimary : COLOR.backgroundLow,
          color: filterView !== 'list' ? COLOR.neutralTextTitleHeading : '',
          opacity: filterView === 'list' ? 1 : 0.6,
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
        }}
        onClick={() => {
          setFilterView('list');
        }}
      >
        <ListAlt width={20} height={20} />
        <div>List</div>
      </div>
    </div>
  );
};
