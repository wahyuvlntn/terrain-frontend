import { getDataZoomHandler, t, useLanguageSwitcher } from '@digital-twin/utils';
import { TableColumn, TableData } from '@digital-twin/reusables';
import { useQuery } from '@tanstack/react-query';
import { LabelFormatterCallback } from 'echarts';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import i18next from 'i18next';
import { ChangeEvent, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { useSearchParams } from 'react-router-dom';

import {
  ALARM_COLOR,
  COLOR,
  FILTER_KEY_MODEL,
  ThemeContext,
  useDebounce,
  useExtractFilter,
} from '../../../../index';
import {
  AbnormalCountChartType,
  AlarmCountChartType,
  AlarmLogType,
  AlarmMetricType,
  AlarmStatusChartType,
  formatDate,
  getAbnormalCountChart,
  getAlarmCountChart,
  getAlarmLogs,
  getAlarmMetrics,
  getAlarmStatusChart,
  localDateToUTC,
} from '../api/alarm-report';
import StatusIndicator from './status-indicator';

export type Column = {
  key: string;
  name: string;
  width?: string | number;
  alignment?: 'left' | 'right' | 'center';
  sortState?: boolean;
  showOrderIcon?: boolean;
};

interface ColumnOrderType {
  timestamp: boolean | null;
  assetName: boolean | null;
  alarmType: boolean | null;
  alarmStatus: boolean | null;
  alarmMessage: boolean | null;
}

export interface Row {
  id: string;

  data: {
    [key: string]: ReactNode;
  };
}

export interface AlarmDataLogsType extends Row {
  data: {
    timestamp: ReactNode;
    assetName: ReactNode;
    alarmType: ReactNode;
    alarmStatus: ReactNode;
    alarmMessage: ReactNode;
  };
}

export const getKeyByValue = (
  object: Record<string, string>,
  value: string
): string | undefined => {
  for (const [key, val] of Object.entries(object)) {
    if (val === value) {
      return key;
    }
  }
  return undefined;
};

type TUseAlarmReportViewParams = {
  mainRef: {
    width: number;
    height: number;
  };
  assets: string | null | undefined;
  startDate: string;
  endDate: string;
  period?: string;
};

export const useAlarmReportView = ({
  mainRef,
  assets,
  startDate,
  endDate,
  period,
}: TUseAlarmReportViewParams) => {
  const { currentLanguage } = useLanguageSwitcher();

  const {
    filter: { search, orderBy, orderType, page, eventview },
    setFilter,
    data: { alarmTypeIds },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [maxPage, setMaxPage] = useState(0);
  const [totalAlarm, setTotalAlarm] = useState<number | null>(null);
  const [totalCriticalAlarm, setTotalCriticalAlarm] = useState<number | null>(null);
  const [totalWarningAlarm, setTotalWarningAlarm] = useState<number | null>(null);
  const [totalAbnormalParameter, setTotalAbnormalParameter] = useState<number | null>(null);

  const [searchInput, setSearchInput] = useState<string | number | readonly string[] | undefined>(
    search ?? ''
  );

  const [columnData] = useState<TableColumn<TableData>[]>([
    {
      field: 'timestamp',
      header: t('common.timestamp'),
      alignment: 'left',
    },
    {
      header: t('common.equipment'),
      field: 'assetName',
      alignment: 'left',
    },
    {
      header: t('common.type'),
      field: 'alarmType',
      alignment: 'left',
    },
    {
      header: t('common.status'),
      field: 'alarmStatus',
      alignment: 'left',
    },
    {
      header: t('common.alarm_message'),
      field: 'alarmMessage',
      alignment: 'left',
    },
  ]);

  const columnOrder: ColumnOrderType = {
    timestamp:
      orderBy === 'timestamp'
        ? orderType === 'ASC'
          ? true
          : orderType === 'DESC'
            ? false
            : null
        : null,
    assetName:
      orderBy === 'assetName'
        ? orderType === 'ASC'
          ? true
          : orderType === 'DESC'
            ? false
            : null
        : null,
    alarmType:
      orderBy === 'alarmType'
        ? orderType === 'ASC'
          ? true
          : orderType === 'DESC'
            ? false
            : null
        : null,
    alarmStatus:
      orderBy === 'alarmStatus'
        ? orderType === 'ASC'
          ? true
          : orderType === 'DESC'
            ? false
            : null
        : null,
    alarmMessage:
      orderBy === 'alarmMessage'
        ? orderType === 'ASC'
          ? true
          : orderType === 'DESC'
            ? false
            : null
        : null,
  };

  const pageParam = searchParams.get('page');

  const collapsibleRef = useRef<ImperativePanelHandle>(null);
  const alarmChartRef = useRef<HTMLDivElement>(null);
  const statusChartRef = useRef<ReactECharts>(null);
  const criticalWarningChartRef = useRef<ReactECharts>(null);
  const abnormalChartRef = useRef<ReactECharts>(null);

  const {
    colors: {
      neutralTextTitleHeading,
      conditionWarningSecondary,
      conditionCriticalSecondary,
      conditionAbnormalPrimary,
      backgroundHighest,
      borderDefault,
    },
  } = useContext(ThemeContext);

  const [alarmOccurenceOption, setAlarmOccurenceOption] = useState<EChartsOption>({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      confine: true,
      backgroundColor: COLOR.backgroundDefault,
      borderColor: COLOR.borderDefault,
      textStyle: {
        color: COLOR.neutralTextTitleHeading,
      },
      formatter: function (params: unknown[]) {
        if (!params || params.length === 0) return '';

        const typedParams = params as Array<{
          seriesName: string;
          marker: string;
          value: number;
          name: string;
        }>;
        const reversed = [...typedParams].reverse();

        const title = typedParams[0].name;
        const rows = reversed
          .map(
            (p) => `
      <div style="display: flex; justify-content: space-between; gap: 16px;">
        <span>${p.marker} ${p.seriesName}</span>
        <b>${p.value.toLocaleString()}</b>
      </div>
    `
          )
          .join('');

        return `${title}<br/>${rows}`;
      },
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '10%',
      top: '10%',
      containLabel: true,
    },
    xAxis: [
      {
        name: t('common.critical_and_warning_alarms'),
        nameLocation: 'middle',
        nameTextStyle: {
          color: neutralTextTitleHeading,
          fontWeight: 600,
          width: '50px',
          fontSize: '16px',
        },
        nameGap: 30,
        axisLabel: {
          color: neutralTextTitleHeading,
          interval: 0,
          width: 60,
          overflow: 'truncate',
          hideOverlap: true,
        },
        type: 'category',
        data: [],
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        splitNumber: 3,
        axisLabel: {
          color: neutralTextTitleHeading,
          formatter: function (value: LabelFormatterCallback) {
            const suffixes = ['', 'k', 'm', 'b', 't'];
            const val = value as unknown as number;

            if (val < 1000) {
              return value.toString();
            }

            const exp = Math.floor(Math.log(val) / Math.log(1000));
            const formattedValue = (val / Math.pow(1000, exp)).toFixed(1);

            return formattedValue.replace(/\.0$/, '') + suffixes[exp];
          },
        },
        splitLine: {
          lineStyle: {
            color: neutralTextTitleHeading,
            opacity: 0.3,
          },
        },
        minInterval: 1,
      },
    ],
    series: [
      {
        name: t('common.warning'),
        type: 'bar',
        stack: 'Ad',
        barCategoryGap: '50%',
        color: conditionWarningSecondary,
        emphasis: {
          focus: 'series',
        },
        data: [],
      },
      {
        name: t('common.critical'),
        type: 'bar',
        stack: 'Ad',
        color: conditionCriticalSecondary,
        emphasis: {
          focus: 'series',
        },
        data: [],
      },
    ],
  });
  const [abnormalChartOption, setAbnormalChartOption] = useState<EChartsOption>({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      confine: true,
      backgroundColor: COLOR.backgroundDefault,
      borderColor: COLOR.borderDefault,
      textStyle: {
        color: COLOR.neutralTextTitleHeading,
      },
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '10%',
      top: '10%',
      containLabel: true,
    },
    xAxis: [
      {
        name: t('common.abnormal_parameters'),
        nameLocation: 'middle',
        nameTextStyle: {
          color: neutralTextTitleHeading,
          fontWeight: 600,
          fontSize: '16px',
        },
        nameGap: 30,
        axisLabel: {
          color: neutralTextTitleHeading,
          interval: 0,
          width: 60,
          overflow: 'truncate',
          hideOverlap: true,
        },
        type: 'category',
        data: [],
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        splitNumber: 3,
        axisLabel: {
          color: neutralTextTitleHeading,
        },
        splitLine: {
          lineStyle: {
            color: neutralTextTitleHeading,
            opacity: 0.3,
          },
        },
        minInterval: 1,
      },
    ],
    series: [
      {
        name: t('common.abnormality'),
        type: 'bar',
        stack: 'Ad',
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        barCategoryGap: '50%',
        color: conditionAbnormalPrimary,
        emphasis: {
          focus: 'series',
        },
        data: [],
      },
    ],
  });
  const [alarmStatusChartOption, setAlarmStatusChartOption] = useState<EChartsOption>({
    borderRadius: 6,
    tooltip: {
      appendToBody: true,
      backgroundColor: COLOR.backgroundDefault,
      borderColor: COLOR.borderDefault,
      textStyle: {
        color: COLOR.neutralTextTitleHeading,
      },
      formatter:
        //@ts-expect-error unknown param type
        (e) => {
          let tooltipHTML = `<div style='display: flex; flex-direction: column; gap: 6px; color: ${neutralTextTitleHeading}; font-weight: 500; font-size: 16px; padding: 4px;'>`;
          tooltipHTML += `<div style='border-bottom: 1px solid white; padding-bottom: 4px; text-align: left;'>${e.data[4]}</div>`;

          tooltipHTML += `<div style='display: flex; flex-direction: column; align-items: flex-start; gap: 6px; font-size: 16px;'>`;

          tooltipHTML += `<div style='display: flex; align-items: center; gap: 6px;'>`;
          tooltipHTML += `<div style='width: 10px; height: 10px; border-radius: 50%; background-color: ${ALARM_COLOR.CRITICAL};'></div>`;
          tooltipHTML += `<div>${t('common.critical')}:</div>`;
          tooltipHTML += `<div>${e.data[1].toLocaleString()}</div>`;
          tooltipHTML += `</div>`;

          tooltipHTML += `<div style='display: flex; align-items: center; gap: 6px;'>`;
          tooltipHTML += `<div style='width: 10px; height: 10px; border-radius: 50%; background-color: ${ALARM_COLOR.WARNING};'></div>`;
          tooltipHTML += `<div>${t('common.warning')}:</div>`;
          tooltipHTML += `<div>${e.data[2].toLocaleString()}</div>`;
          tooltipHTML += `</div>`;

          tooltipHTML += `<div style='display: flex; align-items: center; gap: 6px;'>`;
          tooltipHTML += `<div style='width: 10px; height: 10px; border-radius: 50%; background-color: ${COLOR.conditionAbnormalPrimary};'></div>`;
          tooltipHTML += `<div>${t('common.abnormal')}:</div>`;
          tooltipHTML += `<div>${e.data[3].toLocaleString()}</div>`;
          tooltipHTML += `</div>`;

          tooltipHTML += `</div>`;
          tooltipHTML += `</div>`;
          return tooltipHTML;
        },
    },
    grid: {
      top: '15%',
      left: '5%',
      right: '2%',
      bottom: '23%',
      borderRadius: 6,
    },
    dataZoom: getDataZoomHandler({
      bottomPadding: '10%',
      maxValue: 6,
      minValue: 0,
      show: true,
      colors: {
        primary: backgroundHighest,
        secondary: borderDefault,
      },
    }),
    dataset: {
      source: [],
    },
    yAxis: {
      axisLabel: {
        color: neutralTextTitleHeading,
        fontSize: '12px',
        formatter: function (value: LabelFormatterCallback) {
          const suffixes = ['', 'k', 'm', 'b', 't'];
          const val = value as unknown as number;

          if (val < 1000) {
            return value.toString();
          }

          const exp = Math.floor(Math.log(val) / Math.log(1000));
          const formattedValue = (val / Math.pow(1000, exp)).toFixed(1);

          return formattedValue.replace(/\.0$/, '') + suffixes[exp];
        },
      },
      splitNumber: 4,
      splitLine: {
        show: true,
        lineStyle: {
          color: neutralTextTitleHeading,
          opacity: 0.3,
        },
      },
      minInterval: 1,
    },
    series: [
      {
        type: 'bar',
        color: conditionCriticalSecondary,
        barGap: 0,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
        },
      },
      {
        type: 'bar',
        color: conditionWarningSecondary,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
        },
      },
      {
        type: 'bar',
        color: conditionAbnormalPrimary,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  });

  const alarmTypeId =
    alarmTypeIds && alarmTypeIds.length === 0
      ? '-1'
      : !alarmTypeIds
        ? '0'
        : alarmTypeIds[0] === 'ALARM'
          ? '1'
          : '2';

  const commonSearch = useMemo(() => {
    const mainSearch = i18next.getDataByLanguage('en')?.translation?.common as
      | Record<string, string>
      | undefined;

    const translateSearch = getKeyByValue(
      i18next.getDataByLanguage(currentLanguage)?.translation?.common as unknown as Record<
        string,
        string
      >,
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

  /* QUERIES */
  const { data: alarmMetricsData, isFetching: isAlarmMetricsFetching } = useQuery({
    queryKey: [
      'getAlarmMetrics',
      {
        startDate,
        endDate,
        assets,
        searchFilter,
        alarmTypeId,
        eventview,
      },
    ],
    queryFn: async (): Promise<AlarmMetricType | null> => {
      if (!startDate || !endDate || !assets) return null;
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

  const [alarmTableData, setAlarmTableData] = useState<AlarmDataLogsType[] | null | undefined>(
    null
  );

  const { data: alarmLogsQuery, isFetching: isAlarmTableFetching } = useQuery({
    queryKey: [
      'getAlarmLogsTable',
      {
        startDate,
        endDate,
        assets,
        searchFilter,
        alarmTypeId,
        pageVal: pageParam,
        eventview,
        orderBy,
        orderType,
        columnOrder,
        currentLanguage,
      },
    ],
    queryFn: async (): Promise<AlarmLogType | null> => {
      if (!startDate || !endDate || !assets) return null;
      return await getAlarmLogs({
        startDate: localDateToUTC(startDate),
        endDate: localDateToUTC(endDate),
        assets,
        alarmTypeId: parseInt(alarmTypeId ?? '0'),
        searchFilter: String(searchFilter),
        page: pageParam ? parseInt(pageParam) : 1,
        orderTimestamp: columnOrder.timestamp,
        orderEquipment: columnOrder.assetName,
        orderAlarmType: columnOrder.alarmType || null,
        orderAlarmStatus: columnOrder.alarmStatus,
        orderAlarmMessage: columnOrder.alarmMessage,
        limit: 16,
      });
    },
    enabled: !!startDate && !!endDate && !!assets && !!alarmTypeId,
    meta: {
      toastId: [
        'getAlarmLogsTable',
        {
          startDate,
          endDate,
          assets,
          searchFilter,
          alarmTypeId,
          page,
          eventview,
          orderBy,
          orderType,
        },
      ],
    },
  });

  const { data: abnormalChartData, isFetching: isAbnormalChartFetching } = useQuery({
    queryKey: [
      'getAbnormalChartData',
      {
        startDate,
        endDate,
        assets,
        searchFilter,
        alarmTypeId,
        eventview,
      },
    ],
    queryFn: async (): Promise<AbnormalCountChartType[] | null> => {
      if (!startDate || !endDate || !assets) return null;

      return await getAbnormalCountChart({
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
        'getAbnormalChartData',
        {
          startDate,
          endDate,
          assets,
          searchFilter,
          alarmTypeId,
          eventview,
        },
      ],
    },
  });

  const { data: alarmOccurenceData, isFetching: isAlarmOccurenceFetching } = useQuery({
    queryKey: [
      'getAlarmOccurenceData',
      {
        startDate,
        endDate,
        assets,
        searchFilter,
        alarmTypeId,
        eventview,
      },
    ],
    queryFn: async (): Promise<AlarmCountChartType[] | null> => {
      if (!startDate || !endDate || !assets) return null;

      return await getAlarmCountChart({
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
        'getAlarmOccurenceData',
        {
          startDate,
          endDate,
          assets,
          searchFilter,
          alarmTypeId,
          eventview,
        },
      ],
    },
  });

  const { data: alarmStatusChartData, isFetching: isAlarmStatusChartFetching } = useQuery({
    queryKey: [
      'getAlarmStatusChartData',
      {
        startDate,
        endDate,
        assets,
        searchFilter,
        alarmTypeId,
        eventview,
        period,
      },
    ] as const,
    queryFn: async (): Promise<AlarmStatusChartType[] | null> => {
      if (!startDate || !endDate || !assets || !alarmTypeId) return null;
      return await getAlarmStatusChart({
        startDate: localDateToUTC(startDate),
        endDate: localDateToUTC(endDate),
        assets,
        alarmTypeId: parseInt(alarmTypeId),
        searchFilter: String(searchFilter),
        period,
      });
    },
    enabled: !!startDate && !!endDate && !!assets && !!alarmTypeId,
    refetchInterval: 60000,
    meta: {
      toastId: [
        'getAlarmStatusChartData',
        {
          startDate,
          endDate,
          assets,
          searchFilter,
          alarmTypeId,
          eventview,
        },
      ],
    },
  });

  const handleSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setFilter((prev) => ({ ...prev, page: 1 }));
  };

  const onPanelResizeHandler = () => {
    const widthPercentage = collapsibleRef.current?.getSize();
    if (abnormalChartRef.current && criticalWarningChartRef.current) {
      criticalWarningChartRef.current.getEchartsInstance().resize();
      abnormalChartRef.current.getEchartsInstance().resize();
    }
    if (widthPercentage) {
      if (widthPercentage >= 80) {
        collapsibleRef.current?.resize(100);
      } else if (widthPercentage <= 20) {
        collapsibleRef.current?.resize(0);
      }
    }
  };

  const resizerClickHandler = () => {
    const widthPercentage = collapsibleRef.current?.getSize();
    if (widthPercentage === 100 || widthPercentage === 0) {
      collapsibleRef.current?.resize(50);
    }
  };

  const handleSortColumn = (
    field: 'timestamp' | 'assetName' | 'alarmType' | 'alarmStatus' | 'alarmMessage',
    order: boolean | null
  ) => {
    setFilter((prev) => ({
      ...prev,
      orderType: order === null ? null : order ? 'ASC' : 'DESC',
      orderBy: order === null ? null : field,
      page: 1,
    }));
  };

  useEffect(() => {
    if (alarmMetricsData) {
      setTotalAlarm(alarmMetricsData.totalAlarm);
      setTotalCriticalAlarm(alarmMetricsData.totalCritical);
      setTotalWarningAlarm(alarmMetricsData.totalWarning);
      setTotalAbnormalParameter(alarmMetricsData.totalAbnormal ?? 0);
    }
  }, [alarmMetricsData]);

  useEffect(() => {
    if (abnormalChartData) {
      const othersData = abnormalChartData.find((data) => data.assetName === 'Others');
      const filteredData = [...abnormalChartData.filter((alarm) => alarm.assetName !== 'Others')];
      if (othersData) {
        filteredData.push(othersData);
      }
      setAbnormalChartOption((prev: EChartsOption) => {
        return {
          ...prev,
          series: [
            {
              ...prev.series[0],
              data: filteredData.map((alarm) => alarm?.abnormalCount),
            },
          ],
          xAxis: [
            {
              ...prev.xAxis[0],
              data: filteredData.map((alarm) => alarm?.assetName),
            },
          ],
        };
      });
    }
  }, [abnormalChartData]);

  useEffect(() => {
    if (alarmOccurenceData) {
      const othersData = alarmOccurenceData.find((data) => data.assetName === 'Others');
      const filteredData = [...alarmOccurenceData.filter((alarm) => alarm.assetName !== 'Others')];
      if (othersData) {
        filteredData.push(othersData);
      }
      setAlarmOccurenceOption((prev: EChartsOption) => {
        return {
          ...prev,
          series: [
            {
              ...prev.series[0],
              data: filteredData.map((alarm) => {
                if (alarm.criticalCount === 0) {
                  return {
                    value: alarm.warningCount,
                    itemStyle: { borderRadius: [6, 6, 0, 0] },
                  };
                }
                return alarm.warningCount;
              }),
            },
            {
              ...prev.series[1],
              data: filteredData.map((alarm) => {
                return {
                  value: alarm.criticalCount,
                  itemStyle: { borderRadius: [6, 6, 0, 0] },
                };
              }),
            },
          ],
          xAxis: [
            {
              ...prev.xAxis[0],
              data: filteredData.map((alarm) => alarm?.assetName),
            },
          ],
        };
      });
    }
  }, [alarmOccurenceData]);

  const tableItemStyle: React.CSSProperties | undefined = useMemo(
    () => ({
      fontSize: '16px',
      textOverflow: 'ellipsis',
      maxWidth: '250px',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }),
    []
  );

  useEffect(() => {
    if (alarmLogsQuery) {
      const rowData = alarmLogsQuery.data.map((item, idx) => {
        return {
          id: idx.toString(),
          data: {
            alarmMessage: (
              <div
                style={{
                  ...tableItemStyle,
                  flexGrow: 1,
                  width: 0,
                  textAlign: 'left',
                }}
                title={item.alarmMessage}
              >
                {item.alarmMessage}
              </div>
            ),
            assetName: (
              <div style={tableItemStyle} title={item.assetName}>
                {item.assetName}
              </div>
            ),
            alarmStatus: (
              <div style={tableItemStyle}>
                <StatusIndicator
                  status={
                    item.alarmStatus
                      ? item.alarmStatus === 'WARNING'
                        ? t('common.warning')
                        : t('common.critical')
                      : ''
                  }
                  statusType={item.alarmStatus}
                />
              </div>
            ),
            timestamp: (
              <div style={tableItemStyle} title={formatDate(new Date(item.timestamp))}>
                {formatDate(new Date(item.timestamp))}
              </div>
            ),
            alarmType: (
              <div style={tableItemStyle}>
                {item.alarmType === 'ABNORMAL' ? t('common.abnormal') : t('common.alarm')}
              </div>
            ),
          },
        };
      });

      const maxPageCount = Math.ceil(alarmLogsQuery.total / 16) * 16;
      setMaxPage(maxPageCount);
      const perPageData = rowData;

      setAlarmTableData(perPageData);
    }
  }, [alarmLogsQuery, tableItemStyle, currentLanguage]);

  useEffect(() => {
    if (alarmStatusChartData) {
      const statusChartData = alarmStatusChartData.map((alarm) => {
        return [
          alarm.date,
          alarm.criticalCount,
          alarm.warningCount,
          alarm.abnormalCount,
          alarm.dateAlt,
        ];
      });

      statusChartData.unshift(['date', 'Critical', 'Warning', 'Abnormal']);

      setAlarmStatusChartOption((prev: EChartsOption) => {
        const updatedOption = {
          ...prev,
          grid: {
            ...prev.grid,
            bottom: statusChartData.length > 6 ? '27%' : '20%',
          },
          dataZoom: [
            { ...prev.dataZoom[0] },
            {
              ...prev.dataZoom[1],
              show: statusChartData.length > 6 ? true : false,
            },
          ],
          dataset: {
            source: statusChartData.slice(1).every((status) => {
              const criticalCount = status[1] as number;
              const warningCount = status[2] as number;
              const abnormalCount = status[3] as number;

              return criticalCount + warningCount + abnormalCount === 0;
            })
              ? []
              : statusChartData,
          },
          xAxis: {
            type: 'category',
            axisTick: { show: false },
            axisLabel: {
              color: neutralTextTitleHeading,
              fontSize: '12px',
              formatter: function (value: string) {
                const padZero = (num: number) => (num < 10 ? `0${num}` : num);

                if (period === 'daily') {
                  const date = new Date(value);
                  return `${padZero(date.getDate())}/${padZero(date.getMonth() + 1)}`;
                }

                return value;
              },
            },
          },
        };
        if (statusChartRef && statusChartRef.current) {
          statusChartRef.current.getEchartsInstance().clear();
          statusChartRef.current.getEchartsInstance().setOption(updatedOption);
        }
        return updatedOption;
      });
    }
  }, [alarmStatusChartData, neutralTextTitleHeading, period]);

  //Responsive chart resizing
  useEffect(() => {
    if (statusChartRef.current && criticalWarningChartRef.current && abnormalChartRef.current) {
      statusChartRef.current.getEchartsInstance().resize();
      criticalWarningChartRef.current.getEchartsInstance().resize();
      abnormalChartRef.current.getEchartsInstance().resize();
    }
  }, [mainRef]);

  //Initial order
  useEffect(() => {
    if (!orderType && !orderBy)
      setFilter((prev) => ({
        ...prev,
        orderType: 'DESC',
        orderBy: 'timestamp',
      }));
  }, []);

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
    alarmStatusChartData,
    collapsibleRef,
    statusChartRef,
    abnormalChartRef,
    criticalWarningChartRef,
    alarmMetricsData,
    alarmTableData,
    searchInput,
    maxPage,
    alarmTypeId,
    columnData,
    alarmOccurenceOption,
    abnormalChartOption,
    alarmStatusChartOption,
    alarmChartRef,
    totalAlarm,
    totalCriticalAlarm,
    totalWarningAlarm,
    totalAbnormalParameter,
    isAlarmMetricsFetching,
    isAlarmTableFetching,
    isAbnormalChartFetching,
    isAlarmStatusChartFetching,
    isAlarmOccurenceFetching,
    columnOrder,
    searchParams,
    handleSearchInputChange,
    setAlarmOccurenceOption,
    onPanelResizeHandler,
    resizerClickHandler,
    handleSortColumn,
    setSearchParams,
  };
};
