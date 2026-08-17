import { useLanguageSwitcher } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import i18next from 'i18next';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  FILTER_KEY_MODEL,
  useDebounce,
  useExtractFilter,
} from '../../../../index';
import {
  AlarmEventType,
  AlarmMetricType,
  getAlarmEvents,
  getAlarmMetrics,
  localDateToUTC,
} from '../api/alarm-report';
import { getKeyByValue } from './alarm-report-view.hooks';

type TUserAlarmEventViewParams = {
  assets: string | null | undefined;
  startDate: string;
  endDate: string;
  period?: string;
};

export const useAlarmEventView = ({
  assets,
  startDate,
  endDate,
  period,
}: TUserAlarmEventViewParams) => {
  const {
    filter: {
      search,
      //TODO: remove page since it's not used
      //page
    },
    data: { alarmTypeIds },
    setFilter,
  } = useExtractFilter<
    {
      [FILTER_KEY_MODEL]: number;
      alarmTypeIds: string;
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
  >();
  const { currentLanguage } = useLanguageSwitcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const [totalAlarm, setTotalAlarm] = useState<number | null>(null);
  const [totalCriticalAlarm, setTotalCriticalAlarm] = useState<number | null>(
    null
  );
  const [totalWarningAlarm, setTotalWarningAlarm] = useState<number | null>(
    null
  );
  const [totalAbnormalParameter, setTotalAbnormalParameter] = useState<
    number | null
  >(null);

  const [searchInput, setSearchInput] = useState<
    string | number | readonly string[] | undefined
  >(search);

  const alarmTypeId =
    alarmTypeIds === null ? '0' : alarmTypeIds?.[0] === 'ALARM' ? '1' : '2';

  const pageParam = searchParams.get('page');

  const commonSearch = useMemo(() => {
    const mainSearch = i18next.getDataByLanguage('en')?.translation?.common as
      | Record<string, string>
      | undefined;

    const translateSearch = getKeyByValue(
      i18next.getDataByLanguage(currentLanguage)?.translation
        ?.common as unknown as Record<string, string>,
      String(searchInput)
    );

    // If no translation is found, return the original search input
    if (!translateSearch) return searchInput as string;

    // If mainSearch is available, try to return the corresponding translated value
    if (mainSearch && mainSearch[translateSearch]) {
      return mainSearch[translateSearch] as string;
    }

    // If no match is found, return the search input as a fallback
    return searchInput as string;
  }, [searchInput, currentLanguage]);

  const { debouncedVal: searchFilter } = useDebounce(commonSearch, 1000);

  const { data: alarmEvents, isFetching: isEventChartFetching } = useQuery({
    queryKey: [
      'getAlarmEvents',
      {
        startDate,
        endDate,
        alarmTypeId,
        assets,
        searchFilter,
        pageParam,
        period,
      },
    ],
    queryFn: async (): Promise<AlarmEventType | null> => {
      if (!startDate || !endDate || !assets || !alarmTypeId) return null;

      return await getAlarmEvents({
        startDate: localDateToUTC(startDate),
        endDate: localDateToUTC(endDate),
        assets,
        alarmTypeId: parseInt(alarmTypeId ?? '0'),
        searchFilter: String(searchFilter),
        page: pageParam ? Number(pageParam) : 1,
        period,
      });
    },
    enabled: !!startDate && !!endDate && !!assets && !!alarmTypeId,
    refetchInterval: 60000,
    meta: {
      toastId: [
        'getRawAssetAlarmData',
        { startDate, endDate, alarmTypeId, assets, search },
      ],
    },
  });

  const { data: alarmMetricsData, isFetching: isAlarmMetricsFetching } =
    useQuery({
      queryKey: [
        'getAlarmMetrics',
        {
          startDate,
          endDate,
          assets,
          searchFilter,
          alarmTypeId,
        },
      ],
      queryFn: async (): Promise<AlarmMetricType | null> => {
        if (!startDate || !endDate || !assets || !alarmTypeId) return null;
        return await getAlarmMetrics({
          startDate: localDateToUTC(startDate),
          endDate: localDateToUTC(endDate),
          assets,
          alarmTypeId: parseInt(alarmTypeId ?? '0'),
          searchFilter: String(searchFilter),
        });
      },
      enabled: !!startDate && !!endDate && !!assets && !!alarmTypeId,
      refetchInterval: 60000,
      meta: {
        toastId: [
          'getAlarmMetrics',
          {
            startDate,
            endDate,
            assets,
            searchFilter,
            alarmTypeId,
          },
        ],
      },
    });

  const handleSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setFilter((prev) => ({ ...prev, page: 1 }));
  };

  // const handlePageChange = (page: number) =>
  //   setFilter((prev) => ({
  //     ...prev,
  //     page,
  //   }));

  useEffect(() => {
    if (alarmMetricsData) {
      setTotalAlarm(alarmMetricsData.totalAlarm);
      setTotalCriticalAlarm(alarmMetricsData.totalCritical);
      setTotalWarningAlarm(alarmMetricsData.totalWarning);
      setTotalAbnormalParameter(alarmMetricsData.totalAbnormal ?? 0);
    }
  }, [alarmMetricsData]);

  useEffect(
    () =>
      setFilter((prev) => ({
        ...prev,
        search: String(searchInput ?? ''),
        page: !prev.page ? 1 : prev.page,
      })),
    [searchFilter]
  );

  return {
    startDate,
    endDate,
    //TODO: remove page since it's not used
    // page,
    alarmMetricsData,
    alarmEvents,
    totalAlarm,
    totalCriticalAlarm,
    totalWarningAlarm,
    totalAbnormalParameter,
    searchParams,
    searchInput,
    isAlarmMetricsFetching,
    isEventChartFetching,
    setSearchParams,
    setFilter,
    handleSearchInputChange,
    //TODO: remove handlePageChange since it's not used
    // handlePageChange,
  };
};
