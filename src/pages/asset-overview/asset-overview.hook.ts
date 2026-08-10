import { ConditionEnum, StatusEnum, TGetAssetEnergyOverviewParams } from '@digital-twin/components';
import {
  convertToPascalCase,
  formatDuration,
  formatDurationFromDate,
  formatDurationToMinutesFromDate,
  getMessageTranslation,
  t,
} from '@digital-twin/utils';
import { useQueryClient } from '@tanstack/react-query';

import { Asset, exportAssetOverview } from './api';

export const useAssetOverview = () => {
  const queryClient = useQueryClient();

  const sheetsParserFn = (assets: Asset[]) => {
    return {
      workSheets: [
        {
          sheetName: t('common.equipment_list'),
          rows: assets.map(
            ({
              status,
              statusStartTime,
              condition,
              conditionStartTime,
              runningDuration,
              totalDuration,
              runningHours,
              ...item
            }) => {
              const newStatus = status === StatusEnum.enum.OFFLINE ? 'OFF_OFFLINE' : status;
              const newCondition =
                condition === ConditionEnum.enum.OFFLINE ? 'OFF_OFFLINE' : condition;
              return {
                ...item,
                status: newStatus
                  ? convertToPascalCase(getMessageTranslation(newStatus.toLowerCase()))
                  : '',
                statusDuration: statusStartTime
                  ? formatDurationToMinutesFromDate(new Date(statusStartTime))
                  : '',
                condition: newCondition
                  ? convertToPascalCase(getMessageTranslation(newCondition.toLowerCase()))
                  : '',
                conditionDuration: conditionStartTime
                  ? formatDurationFromDate(new Date(conditionStartTime))
                  : '',
                /* TODO: apply runningTime changes throughout the app */
                runningTime: formatDuration(runningDuration),
                totalTime: totalDuration ? formatDuration(totalDuration) : '',
                totalRunningHours: `${runningHours}h`,
              };
            }
          ),
          columns: [
            { key: 'name', header: t('common.equipment_name') },
            { key: 'location', header: t('common.location_name') },
            { key: 'status', header: t('common.status') },
            { key: 'statusDuration', header: t('common.status_duration') },
            { key: 'condition', header: t('common.condition') },
            {
              key: 'conditionDuration',
              header: t('common.condition_duration'),
            },
            { key: 'model', header: t('common.model') },
            { key: 'type', header: t('common.type') },
            { key: 'warningCount', header: t('common.warning_alarm') },
            { key: 'criticalCount', header: t('common.critical_alarm') },
            { key: 'runningTime', header: t('common.running_time') },
            { key: 'uptime', header: t('common.uptime') },
            { key: 'totalTime', header: t('common.total_time') },
            { key: 'totalRunningHours', header: 'Total Running Hours' },
          ],
        },
      ],
      fileName: t('common.equipment_overview_report'),
    };
  };

  const exportFn = async (
    params: Omit<TGetAssetEnergyOverviewParams, 'limit' | 'page' | 'search'>
  ) => {
    return await queryClient.ensureQueryData({
      queryKey: ['EXPORT_ASSET_OVERVIEW', params] as const,
      queryFn: ({ queryKey }) => exportAssetOverview(queryKey[1]),
    });
  };

  return {
    sheetsParserFn,
    exportFn,
  };
};
