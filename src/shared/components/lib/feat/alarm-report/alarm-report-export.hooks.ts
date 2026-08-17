import { exportToExcel, t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { QueryKey, useQueryClient } from '@tanstack/react-query';
import excel from 'exceljs';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAlarmReportGetFilter, useGetModelNames } from '../../../index';
import { useGetLocationNames } from '../filter/filter.location';
import {
  AlarmCountChartType,
  AlarmLogType,
  AlarmStatusChartType,
  AlarmtEventDataSchema,
  formatDate,
  getAbnormalCountChart,
  getAlarmCountChart,
  getAlarmEventsExport,
  getAlarmLogs,
  getAlarmMetrics,
  getAlarmStatusChart,
  localDateToUTC,
} from './api/alarm-report';

type TUseAlarmExport = {
  assets: string | null | undefined;
  startDate: string;
  endDate: string;
  getTypeNamesQueryKey: (selected: number[] | null) => QueryKey;
  filterTypeKey: string;
  selectedPeriod?: string;
} & ReturnType<typeof useAlarmReportGetFilter>;

export const useAlarmExport = ({
  assets,
  startDate,
  endDate,
  isReady,
  getTypeNamesQueryKey,
  selectedPeriod,
  data,
  eventview,
  search,
  filterTypeKey,
}: TUseAlarmExport) => {
  const [, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { alarmTypeIds, modelIds, assetIds, locationIds, ...filterDataRest } =
    data;
  // @ts-expect-error TS7053: Element implicitly has an any type because expression of type string can't be used to index type {}
  const typeIds = filterDataRest[filterTypeKey] as number[] | null;
  const alarmTypeId =
    alarmTypeIds && alarmTypeIds.length === 0
      ? '-1'
      : !alarmTypeIds
      ? '0'
      : alarmTypeIds[0] === 'ALARM'
      ? '1'
      : '2';
  const searchFilter = search;

  const modelNames = useGetModelNames(modelIds);
  const { names: locationNamesRaw } = useGetLocationNames({
    isReady,
    queryParams: {
      locationIds,
      assetIds,
    },
  });
  const locationNames = locationNamesRaw
    ?.filter((item) => item.isLocation)
    ?.map((item) => item.data.map((item) => item.name).join(','))
    ?.join(',');

  const assetNames = locationNamesRaw
    ?.filter((item) => !item.isLocation && item.data.length>0)
    ?.map((item) => item.data.map((item) => item.name).join(','))
    ?.join(',');

  const typeNames =
    typeIds === null
      ? t('common.all')
      : queryClient
          .getQueryData<string[]>(getTypeNamesQueryKey(typeIds))
          ?.join(',');

  const handleExportFile = async () => {
    const workSheets: {
      sheetName: string;
      rows: unknown[];
      skipHeader?: boolean;
      columns: ({ header?: string } & Omit<Partial<excel.Column>, 'header'>)[];
    }[] = [];

    try {
      setLoading(true);
      const alarmMetrics = await queryClient.ensureQueryData({
        queryKey: [
          'getAlarmMetrics' + 'EXPORT',
          {
            startDate,
            endDate,
            assets,
            searchFilter,
            alarmTypeId,
            eventview,
          },
        ],
        queryFn: async () => {
          if (!startDate || !endDate || !assets) return null;
          return await getAlarmMetrics({
            startDate: localDateToUTC(startDate),
            endDate: localDateToUTC(endDate),
            assets,
            alarmTypeId: parseInt(alarmTypeId ?? '0'),
            searchFilter: String(searchFilter),
          });
        },
        meta: {
          toastId: [
            'getAlarmMetrics' + 'EXPORT',
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

      workSheets.push({
        sheetName: t('common.alarm_reports'),
        columns: [],
        skipHeader: true,
        rows: [
          [t('common.selected_location'), locationNames?.toString()],
          [t('common.selected_equipment'), assetNames?.toString()],
          [t('common.selected_model'), modelNames?.toString()],
          [t('common.selected_type'), typeNames?.toString()],
          [t('common.total_alarms'), alarmMetrics?.totalAlarm.toString()],
          [t('common.critical_alarms'), alarmMetrics?.totalCritical.toString()],
          [t('common.warning_alarms'), alarmMetrics?.totalWarning.toString()],
          [
            t('common.abnormal_alarms'),
            alarmMetrics?.totalAbnormal
              ? alarmMetrics?.totalAbnormal.toString()
              : 0,
          ],
        ],
      });

      const abnormalData = await queryClient.ensureQueryData({
        queryKey: [
          'getAbnormalChartData' + 'EXPORT',
          {
            startDate,
            endDate,
            assets,
            searchFilter,
            alarmTypeId,
            eventview,
          },
        ],
        queryFn: async () => {
          if (!startDate || !endDate || !assets) return null;
          return await getAbnormalCountChart({
            startDate: localDateToUTC(startDate),
            endDate: localDateToUTC(endDate),
            assets,
            alarmTypeId: parseInt(alarmTypeId ?? '0'),
            searchFilter: String(searchFilter),
          });
        },
        meta: {
          toastId: [
            'getAbnormalChartData' + 'EXPORT',
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

      const occurenceData = await queryClient.ensureQueryData({
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
      });

      if (abnormalData && occurenceData) {
        const othersAbnormalData = abnormalData.find(
          (data) => data.assetName === 'Others'
        );
        const filteredAbnormalData = [
          ...abnormalData.filter((alarm) => alarm.assetName !== 'Others'),
        ];
        if (othersAbnormalData) {
          filteredAbnormalData.push(othersAbnormalData);
        }

        const othersOccurenceData = occurenceData.find(
          (data) => data.assetName === 'Others'
        );
        const filteredOccurenceData = [
          ...occurenceData.filter((alarm) => alarm.assetName !== 'Others'),
        ];
        if (othersOccurenceData) {
          filteredOccurenceData.push(othersOccurenceData);
        }

        workSheets.push({
          sheetName: t('common.equipment_alarm_occurrence'),
          skipHeader: true,
          columns: [{ key: 'x1' }, { key: 'x2' }, { key: 'x3' }],
          rows: [
            { x1: t('common.critical_and_warning_alarms') },
            {
              x1: t('common.equipment_name'),
              x2: t('common.critical'),
              x3: t('common.warning'),
            },
            ...filteredOccurenceData.map((data) => ({
              x1: data.assetName,
              x2: data.criticalCount,
              x3: data.warningCount,
            })),
            {},
            { x1: t('common.abnormal') },
            { x1: t('common.equipment_name'), x2: t('common.alarm_count') },
            ...filteredAbnormalData.map((data) => ({
              x1: data.assetName,
              x2: data.abnormalCount,
            })),
            {},
          ],
        });
      }

      const alarmStatusData = await queryClient.ensureQueryData({
        queryKey: [
          'getAlarmStatusChartData' + 'EXPORT',
          {
            startDate,
            endDate,
            assets,
            searchFilter,
            alarmTypeId,
            eventview,
            selectedPeriod,
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
            period: selectedPeriod,
          });
        },
        meta: {
          toastId: [
            'getAlarmStatusChartData' + 'EXPORT',
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

      if (alarmStatusData)
        workSheets.push({
          sheetName: t('common.alarm_status_chart'),
          columns: [
            { key: 'date', header: t('common.date') },
            { key: 'warning', header: t('common.warning') },
            { key: 'critical', header: t('common.critical') },
            { key: 'abnormal', header: t('common.abnormal') },
          ],
          rows: alarmStatusData.map((alarm) => {
            return {
              date: alarm.date,
              warning: alarm.warningCount,
              critical: alarm.criticalCount,
              abnormal: alarm.abnormalCount,
            };
          }),
        });

      const alarmLogsQuery = await queryClient.ensureQueryData({
        queryKey: [
          'getAlarmLogsTable' + 'EXPORT',
          {
            startDate,
            endDate,
            assets,
            searchFilter,
            alarmTypeId,
            eventview,
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
            page: 1,
            orderTimestamp: true,
            orderEquipment: null,
            orderAlarmType: null,
            orderAlarmStatus: null,
            orderAlarmMessage: null,
            limit: Number.MAX_SAFE_INTEGER,
          });
        },
        meta: {
          toastId: [
            'getAlarmLogsTable' + 'EXPORT',
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

      if (alarmLogsQuery)
        workSheets.push({
          sheetName: t('common.alarm_log'),
          columns: [
            { key: 'timestamp', header: t('common.timestamp') },
            { key: 'equipment', header: t('common.equipment') },
            { key: 'type', header: t('common.type') },
            { key: 'status', header: t('common.status') },
            { key: 'alarmMessage', header: t('common.alarm_message') },
          ],
          rows: alarmLogsQuery.data.map((data) => {
            return {
              timestamp: formatDate(new Date(data.timestamp)),
              equipment: data.assetName,
              type: data.alarmType
                ? t(`common.${data.alarmType.toLowerCase()}`)
                : t('common.alarm'),
              status: t(`common.${data.alarmStatus.toLowerCase()}`),
              alarmMessage: data.alarmMessage,
            };
          }),
        });

      const alarmEvents = await queryClient.ensureQueryData({
        queryKey: [
          'getRawAssetAlarmData' + 'EXPORT',
          { startDate, endDate, alarmTypeId, assets, searchFilter },
        ],
        queryFn: async (): Promise<AlarmtEventDataSchema[] | null> => {
          if (!startDate || !endDate || !assets || !alarmTypeId) return null;

          return await getAlarmEventsExport({
            startDate: localDateToUTC(startDate),
            endDate: localDateToUTC(endDate),
            assets,
            alarmTypeId: parseInt(alarmTypeId ?? '0'),
            searchFilter: String(searchFilter),
          });
        },
        meta: {
          toastId: [
            'getRawAssetAlarmData' + 'EXPORT',
            { startDate, endDate, alarmTypeId, assets, searchFilter },
          ],
        },
      });

      if (alarmEvents)
        workSheets.push({
          sheetName: t('common.alarm_event'),
          columns: [
            { key: 'equipmentName', header: t('common.equipment_name') },
            { key: 'condition', header: t('common.condition') },
            { key: 'model', header: t('common.model') },
            { key: 'timestamp', header: t('common.timestamp') },
            { key: 'alarm', header: t('common.alarm') },
            { key: 'description', header: t('common.description') },
            { key: 'date', header: t('common.date') },
            //TODO: remove id params inside map fn since it's not used
            ...alarmEvents[0].data.map((d, _id) => ({
              key: d.timestamp,
              header: d.timestamp,
            })),
          ],
          rows: alarmEvents.map((event, id) => ({
            equipmentName: event.assetName,
            condition: event.lastAlarmStatus
              ? t(`common.${event.lastAlarmStatus.toLowerCase()}`)
              : t('common.normal'),
            model: event.modelName,
            timestamp: event.lastAlarmTimestamp
              ? formatDate(new Date(event.lastAlarmTimestamp))
              : '-',
            alarm: event.lastAlarmType ?? '-',
            description: event.lastAlarmMessage,
            date:
              id === 0
                ? `(${t('common.total')}/${t('common.warning')}/${t(
                    'common.critical'
                  )}/${t('common.abnormal')})`
                : '',
            ...event.data.reduce((acc, curr) => {
              acc[curr.timestamp] = `(${
                curr.abnormalCount ?? 0 + curr.criticalCount + curr.warningCount
              }/${curr.warningCount}/${curr.criticalCount}/${
                curr.abnormalCount
              })`;

              return acc;
            }, {} as Record<string, string>),
          })),
        });

      await exportToExcel({
        workSheets: workSheets,
        start: new Date(startDate as string),
        end: new Date(endDate as string),
        fileName: t('common.alarm_report'),
      });
    } catch (error) {
      const err = error as Error;
      setLoading(false);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleExportFile, setSearchParams };
};
