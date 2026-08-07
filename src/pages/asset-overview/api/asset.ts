import {
  AlarmEnum,
  ConditionEnum,
  MaintenanceStatusEnum,
  StatusEnum,
  TGetAssetEnergyOverviewParams,
} from '@digital-twin/components';
import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

import { alarmSchema } from './alarm-status';

const statusSchema = z.object({
  value: StatusEnum,
  start: z.string().datetime(),
  end: z.string().datetime(),
});

const conditionSchema = z.object({
  value: ConditionEnum,
  start: z.string().datetime(),
  end: z.string().datetime(),
});

const assetAlarmSchema = alarmSchema.extend({
  alarmId: z.number().nullable(),
  alarmName: z.string(),
  typeId: z.number(),
  statusId: z.number(),
  severity: AlarmEnum.exclude([AlarmEnum.enum.NORMAL]),
});
export type TAssetAlarm = z.infer<typeof assetAlarmSchema>;

const assetMaintenanceSchema = z.object({
  id: z.number(),
  name: z.string(),
  typeName: z.string(),
  issue: z.string().nullable(),
  status: MaintenanceStatusEnum,
  updatedAt: z.string().datetime(),
});
export type TAssetMaintenance = z.infer<typeof assetMaintenanceSchema>;

const assetDetailsSchema = z.object({
  name: z.string(),
  status: StatusEnum.nullable(),
  statusStartTime: z.string().datetime().nullable(),
  statuses: z.array(statusSchema),
  runningCounts: z.number(),
  unplannedDownCounts: z.number(),
  plannedDownCounts: z.number(),
  offlineCounts: z.number(),
  typeName: z.string(),
  modelName: z.string(),
  locationName: z.string(),
  condition: ConditionEnum.nullable(),
  conditionStartTime: z.string().datetime().nullable(),
  conditions: z.array(conditionSchema),
  warningCount: z.number(),
  criticalCount: z.number(),
  image: z.string().nullable(),
  uptime: z.number(),
  alarms: z.array(assetAlarmSchema),
  maintenances: assetMaintenanceSchema.array(),
  uptimeDuration: z.number(),
  totalDuration: z.number(),
  runningHours: z.number(),
});
export type AssetDetails = z.infer<typeof assetDetailsSchema>;

export const getAssetDetails = async (id: number, timezoneOffset: number, date: string) => {
  const data = await jsRequest({
    url: `/asset/getassetdetails`,
    data: {
      asset_id: id,
      timezone_offset: timezoneOffset,
      date,
    },
  });

  return assetDetailsSchema.parse({
    name: data.name,
    status: data.status,
    statusStartTime: data.status_start_time,
    statuses: data.statuses,
    runningCounts: data.running_counts,
    unplannedDownCounts: data.unplanned_down_counts,
    /* TODO: check planned_down field */
    plannedDownCounts: data.planned_down,
    offlineCounts: data.offline_counts,
    typeName: data.type_name,
    modelName: data.model_name,
    locationName: data.location_name,
    condition: data.condition,
    conditionStartTime: data.condition_start_time,
    conditions: data.conditions,
    warningCount: data.warning_counts,
    criticalCount: data.critical_counts,
    image: data.image,
    uptime: data.uptime,
    alarms: data.alarms.map(
      (item: { alarm_id: unknown; alarm_name: unknown; type_id: unknown; status_id: unknown }) => ({
        ...item,
        alarmId: item.alarm_id,
        alarmName: item.alarm_name,
        typeId: item.type_id,
        statusId: item.status_id,
      })
    ),
    maintenances: data.maintenances.map((item: { updated_at: unknown; type_name: unknown }) => ({
      ...item,
      updatedAt: item.updated_at,
      typeName: item.type_name,
    })),
    isUtility: data.is_utility,
    uptimeDuration: data.uptime_duration,
    totalDuration: data.total_duration,
    runningHours: data.running_duration_hours,
  });
};

const assetSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: StatusEnum.nullable(),
  statusStartTime: z.string().datetime().nullable(),
  type: z.string(),
  model: z.string(),
  condition: ConditionEnum.nullable(),
  warningCount: z.number(),
  criticalCount: z.number(),
  image: z.string().nullable(),
  conditionStartTime: z.string().datetime().nullable(),
  uptime: z.number().nullable(),
  runningDuration: z.number(),
  totalDuration: z.number(),
  location: z.string(),
  runningHours: z.number(),
});
export type Asset = z.infer<typeof assetSchema>;

const getAssetOverviewSchema = z.object({
  assets: z.array(assetSchema),
  counts: z.number(),
});

export type TGetAsseOverview = z.infer<typeof getAssetOverviewSchema>;
export const getAssetOverview = async ({
  status,
  assetIds,
  locationIds,
  search,
  page,
  modelIds,
  typeIds,
  start,
  end,
  timezoneOffset,
  limit,
  conditions,
}: TGetAssetEnergyOverviewParams) => {
  const data = await jsRequest({
    url: `/asset/getassetoverview`,
    data: {
      start_date: start,
      end_date: end,
      status: status?.join(','),
      conditions: conditions?.join(','),
      type_ids: typeIds?.join(','),
      model_ids: modelIds?.join(','),
      location_ids: locationIds?.join(','),
      timezone_offset: timezoneOffset,
      asset_ids: assetIds.join(','),
      page,
      limit,
      search,
    },
  });

  return getAssetOverviewSchema.parse({
    counts: data.counts,
    assets: data.assets.map(
      (item: {
        type_name: unknown;
        model_name: unknown;
        status_start_time: unknown;
        condition_start_time: unknown;
        warning_counts: unknown;
        critical_counts: unknown;
        running_duration: unknown;
        total_duration: unknown;
        running_duration_hours: unknown;
      }) => ({
        ...item,
        type: item.type_name ?? '-',
        model: item.model_name ?? '-',
        statusStartTime: item.status_start_time,
        conditionStartTime: item.condition_start_time,
        warningCount: item.warning_counts,
        criticalCount: item.critical_counts,
        runningDuration: item.running_duration,
        totalDuration: item.total_duration,
        runningHours: item.running_duration_hours,
      })
    ),
  });
};

export const exportAssetOverview = async ({
  status,
  assetIds,
  locationIds,
  modelIds,
  typeIds,
  start,
  end,
  timezoneOffset,
  conditions,
}: Omit<TGetAssetEnergyOverviewParams, 'limit' | 'page' | 'search'>) => {
  const data = await jsRequest({
    url: `/asset/exportassetoverview`,
    data: {
      start_date: start,
      end_date: end,
      status: status?.join(','),
      conditions: conditions?.join(','),
      type_ids: typeIds?.join(','),
      model_ids: modelIds?.join(','),
      location_ids: locationIds?.join(','),
      timezone_offset: timezoneOffset,
      asset_ids: assetIds.join(','),
    },
  });

  return assetSchema.array().parse(
    data.map(
      (item: {
        type_name: unknown;
        model_name: unknown;
        status_start_time: unknown;
        condition_start_time: unknown;
        warning_counts: unknown;
        critical_counts: unknown;
        running_duration: unknown;
        total_duration: unknown;
        running_duration_hours: unknown;
      }) => ({
        ...item,
        type: item.type_name,
        model: item.model_name,
        statusStartTime: item.status_start_time,
        conditionStartTime: item.condition_start_time,
        warningCount: item.warning_counts,
        criticalCount: item.critical_counts,
        runningDuration: item.running_duration,
        totalDuration: item.total_duration,
        runningHours: item.running_duration_hours,
      })
    )
  );
};
