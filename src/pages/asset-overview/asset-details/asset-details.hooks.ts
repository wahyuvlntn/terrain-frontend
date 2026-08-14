import { ConditionEnum, StatusEnum, useAssetDetailsFilter } from '@digital-twin/components';
import {
  exportToExcel,
  formatDateTimeFull,
  formatDurationFromDate,
  formatDurationToMinutesFromDate,
  getDiffDays,
  getMessageTranslation,
  t,
} from '@digital-twin/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import {
  AssetDetails,
  getAssetDetails,
  getParametersData,
  TGetAsseOverview,
  TGetParametersData,
} from '../api';
import { ALARM_LIST_COLUMNS, MAINTENANCE_LIST_COLUMNS } from './constant';

const REFETCH_INTERVAL = 60 * 1000;

const recentListSchema = z.union([z.literal('alarm'), z.literal('maintenance')]).catch('alarm');
const recentListPageSchema = z.coerce.number().min(1).catch(1);

export const useAssetDetails = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const { to, locationNames, from, date, handleChangeDate, assetId, timezoneOffset } =
    useAssetDetailsFilter();
  const { data: assetDetails, isLoading } = useQuery({
    queryFn: () => getAssetDetails(assetId, timezoneOffset, date),
    queryKey: [
      'ASSET_DETAILS',
      {
        assetId,
        timezoneOffset,
        date,
      },
    ],
    placeholderData: () => getPlaceholderData(queryClient, assetId, date),
    enabled: !!assetId,
    refetchInterval: REFETCH_INTERVAL,
    meta: { toastId: 'ASSET_DETAILS' },
  });

  const onExport = (params: number[]) => {
    if (!assetDetails) return;

    queryClient
      .ensureQueryData<TGetParametersData>({
        queryFn: () => getParametersData(params, date, timezoneOffset),
        queryKey: [
          'MULTI_PARAMETER_DATA',
          {
            params,
            date,
            timezoneOffset,
          },
        ],
        meta: { toastId: 'MULTI_PARAMETER_DATA' },
      })
      .then((parameters) =>
        exportToExcel({
          workSheets: [
            generateEquipmentDetailsSheet(assetDetails),
            generateTimelineSheet(assetDetails),
            generateAlarmSheet(assetDetails),
            ...generateParameterSheets(parameters),
          ],
          start: new Date(date),
          end: new Date(date),
          fileName: `${t('common.equipment_details_report')}_${assetDetails.name}`,
        })
      );
  };

  const recentListValue = recentListSchema.parse(searchParams.get('recent'));
  const isAlarm = recentListValue === 'alarm';
  const handleRecentListValueChange = (recent: string) =>
    setSearchParams((prev) => {
      prev.set('recent', recent);
      prev.delete('recent-list-page');

      return prev;
    });

  const recentListPage = recentListPageSchema.parse(searchParams.get('recent-list-page'));

  return {
    assetDetails,
    isLoading,
    date,
    from,
    to,
    locationNames,
    handleChangeDate,
    onExport,
    isAlarm,
    recentListValue,
    handleRecentListValueChange,
    recentListPage,
    recentListTitle: isAlarm ? t('common.recent_alarm') : 'Maintenance Activity',
    recentListColumns: isAlarm ? ALARM_LIST_COLUMNS : MAINTENANCE_LIST_COLUMNS,
    recentListCount: isAlarm
      ? (assetDetails?.alarms?.length ?? 0)
      : (assetDetails?.maintenances?.length ?? 0),
  };
};

const getPlaceholderData = (
  queryClient: ReturnType<typeof useQueryClient>,
  assetId: number,
  date: string
) => {
  const queries = queryClient.getQueriesData<TGetAsseOverview>({
    queryKey: ['ASSET_OVERVIEW'],
  });
  for (const [key, data] of queries) {
    // @ts-expect-error: dynamic key
    const startDate = key[1]?.['start'];
    const isDateEqual =
      startDate === date &&
      // @ts-expect-error: dynamic key
      getDiffDays(new Date(key[1]?.['end']), new Date(startDate)) === 1;

    const asset = data?.assets?.find((asset) => asset?.id === assetId);
    if (asset)
      return {
        runningHours: 0,
        name: asset.name,
        locationName: '',
        productionTimeline: [],
        conditionStartTime: asset.conditionStartTime ?? null,
        condition: asset.condition,
        conditions: [],
        alarms: [],
        maintenances: [],
        criticalCount: isDateEqual ? asset.criticalCount : 0,
        uptime: 0,
        image: asset.image,
        status: asset.status,
        modelName: asset.model ?? '',
        performance: null,
        plannedDownCounts: 0,
        runningCounts: 0,
        statusStartTime: asset.statusStartTime,
        warningCount: isDateEqual ? asset.warningCount : 0,
        statuses: [],
        typeName: asset.type ?? '',
        unplannedDownCounts: 0,
        offlineCounts: 0,
        uptimeDuration: 0,
        totalDuration: 0,
      };
  }
  return undefined;
};

const generateEquipmentDetailsSheet = (assetDetails: AssetDetails) => {
  const status =
    assetDetails.status === StatusEnum.enum.OFFLINE ? 'OFF_OFFLINE' : assetDetails.status;
  const condition =
    assetDetails.condition === ConditionEnum.enum.OFFLINE ? 'OFF_OFFLINE' : assetDetails.condition;

  return {
    columns: [{ key: 'key' }, { key: 'value' }],
    rows: [
      { key: t('common.equipment_name'), value: assetDetails.name },
      { key: t('common.type'), value: assetDetails.typeName },
      { key: t('common.model'), value: assetDetails.modelName },
      {
        key: t('common.current_status'),
        value: `${getMessageTranslation(status?.toLowerCase() ?? '').toUpperCase()} ${
          assetDetails.statusStartTime
            ? formatDurationToMinutesFromDate(new Date(assetDetails.statusStartTime))
            : '-'
        }`,
      },
      {
        key: t('common.current_condition'),
        value: `${getMessageTranslation(condition?.toLowerCase() ?? '').toUpperCase()} ${
          assetDetails.conditionStartTime
            ? formatDurationFromDate(new Date(assetDetails.conditionStartTime))
            : '-'
        }`,
      },
      { key: t('common.warning_alarm'), value: assetDetails.warningCount },
      { key: t('common.critical_alarm'), value: assetDetails.criticalCount },
      { key: 'Uptime', value: `${assetDetails.uptime ?? '-'}%` },
      {
        key: t('common.status_change_history'),
        value:
          assetDetails.runningCounts +
          assetDetails.offlineCounts +
          assetDetails.plannedDownCounts +
          assetDetails.unplannedDownCounts,
      },
      { key: t('common.running'), value: assetDetails.runningCounts },
      { key: t('common.planned_down'), value: assetDetails.plannedDownCounts },
      {
        key: t('common.unplanned_down'),
        value: assetDetails.unplannedDownCounts,
      },
      { key: t('common.off_offline'), value: assetDetails.offlineCounts },
    ],
    sheetName: t('common.equipment_details'),
    skipHeader: true,
  };
};

const generateTimelineSheet = (assetDetails: AssetDetails) => {
  return {
    sheetName: t('common.status_and_condition_timeline'),
    columns: [
      { key: 'timestamp', header: t('common.timestamp') },
      { key: 'status', header: t('common.status') },
      { key: 'condition', header: t('common.condition') },
    ],
    rows: [...assetDetails.statuses, ...assetDetails.conditions]
      .map(({ start }) => start)
      .filter((val, idx, arr) => arr.indexOf(val) === idx)
      .map((start) => {
        const statusLabel = assetDetails.statuses.find((item) => item.start === start)?.value;
        const conditionLabel = assetDetails.conditions.find((item) => item.start === start)?.value;
        const status = statusLabel === StatusEnum.enum.OFFLINE ? 'OFF_OFFLINE' : statusLabel;
        const condition =
          conditionLabel === ConditionEnum.enum.OFFLINE ? 'OFF_OFFLINE' : conditionLabel;
        return {
          timestamp: formatDateTimeFull(new Date(start)),
          status: getMessageTranslation(status?.toLowerCase() ?? '').toUpperCase(),
          condition: getMessageTranslation(condition?.toLowerCase() ?? '').toUpperCase(),
        };
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  };
};

const generateAlarmSheet = (assetDetails: AssetDetails) => {
  return {
    sheetName: t('common.recent_alarm'),
    columns: [
      { key: 'timestamp', header: t('common.timestamp') },
      { key: 'typeId', header: t('common.type') },
      { key: 'statusId', header: t('common.criticality') },
      { key: 'message', header: t('common.message') },
      { key: 'alarmName', header: t('common.alarm_name') },
    ],
    rows: assetDetails.alarms.map(({ timestamp, ...item }) => ({
      ...item,
      timestamp: formatDateTimeFull(new Date(timestamp)),
    })),
  };
};

const generateParameterSheets = (parameters: TGetParametersData) => {
  const realtimeSheets = parameters.realTime.map((item) => ({
    sheetName: `${t('common.real_time')}_${item.name}`,
    columns: [
      { key: 'timestamp', header: t('common.timestamp') },
      { key: 'value', header: 'v' },
    ],
    rows: item.data.map((dataItem) => ({
      ...dataItem,
      timestamp: formatDateTimeFull(new Date(dataItem.timestamp)),
    })),
  }));

  const spcSheets = parameters.spc.map((item) => ({
    sheetName: `SPC_${item.name}`,
    columns: [
      { key: 'timestamp', header: t('common.timestamp') },
      { key: 'value', header: t('common.value') },
      { key: 'grandMean', header: t('common.grand_mean') },
      { key: 'stdDev', header: t('common.std_dev') },
      { key: 'cp', header: 'cp' },
      { key: 'cpk', header: 'cpk' },
      { key: 'ucl', header: 'ucl' },
      { key: 'lcl', header: 'lcl' },
    ],
    rows: item.data.map((dataItem) => ({
      ...dataItem,
      timestamp: formatDateTimeFull(new Date(dataItem.timestamp)),
    })),
  }));

  return [...realtimeSheets, ...spcSheets];
};
