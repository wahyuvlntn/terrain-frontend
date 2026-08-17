import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const alarmSchema = z.object({
  assetName: z.string(),
  timestamp: z.string(),
  alarmType: z.string().optional(),
  alarmStatus: z.string(),
  alarmMessage: z.string(),
});

export const alarmLogSchema = z.object({
  total: z.number(),
  data: z.array(alarmSchema),
});

export const alarmStatusSchema = z.object({
  date: z.string(),
  dateAlt: z.string(),
  warningCount: z.number(),
  criticalCount: z.number(),
  abnormalCount: z.number().optional(),
});

export const alarmCountChartSchema = z.object({
  assetName: z.string(),
  warningCount: z.number(),
  criticalCount: z.number(),
});

export const abnormalCountChartSchema = z.object({
  assetName: z.string(),
  abnormalCount: z.number(),
});

export const alarmMetricSchema = z.object({
  totalWarning: z.number(),
  totalCritical: z.number(),
  totalAbnormal: z.number().optional(),
  totalAlarm: z.number(),
});

const alarmEventCountChartSchema = z.object({
  timestamp: z.string(),
  dateAlt: z.string().optional(),
  warningCount: z.number(),
  criticalCount: z.number(),
  abnormalCount: z.number().optional(),
});

const alarmEventDataSchema = z.object({
  assetId: z.number(),
  assetName: z.string(),
  data: z.array(alarmEventCountChartSchema),
  lastAlarmMessage: z.string().nullable(),
  lastAlarmTimestamp: z.string().nullable(),
  lastAlarmName: z.string().nullable(),
  lastAlarmStatus: z.string().nullable(),
  lastAlarmType: z.string().nullable().optional(),
  assetImagePath: z.string().nullable(),
  modelName: z.string(),
});

const alarmEventSchema = z.object({
  count: z.number(),
  data: z.array(alarmEventDataSchema),
});
export type AlarmLogType = z.infer<typeof alarmLogSchema>;
export type AlarmStatusChartType = z.infer<typeof alarmStatusSchema>;
export type AlarmCountChartType = z.infer<typeof alarmCountChartSchema>;
export type AbnormalCountChartType = z.infer<typeof abnormalCountChartSchema>;
export type AlarmMetricType = z.infer<typeof alarmMetricSchema>;
export type AlarmEventType = z.infer<typeof alarmEventSchema>;
export type AlarmEventCountChartType = z.infer<
  typeof alarmEventCountChartSchema
>;
export type AlarmtEventDataSchema = z.infer<typeof alarmEventDataSchema>;

type TGetAssetsByFilter = {
  locationIds: string | null;
  assetIds: string | null;
  modelIds: string | null;
  typeIds: string | null;
};
export const getAssetsByFilter = async ({
  locationIds,
  assetIds,
  typeIds,
  modelIds,
}: TGetAssetsByFilter): Promise<{ id: number }[] | null> => {
  const data = await jsRequest({
    url: `/alarm/getallassetbyfilter`,
    data: {
      location_ids: locationIds,
      asset_ids: assetIds,
      type_ids: typeIds,
      model_ids: modelIds,
    },
  });

  return z.array(z.object({ id: z.number() })).parse(data);
};

type TGetAlarmLogs = {
  startDate: string;
  endDate: string;
  assets: string;
  alarmTypeId: number;
  searchFilter: string;
  page: number;
  orderTimestamp: boolean | null;
  orderEquipment: boolean | null;
  orderAlarmType: boolean | null;
  orderAlarmStatus: boolean | null;
  orderAlarmMessage: boolean | null;
  limit: number;
};
export const getAlarmLogs = async ({
  alarmTypeId,
  assets,
  endDate,
  limit,
  orderAlarmMessage,
  orderAlarmStatus,
  orderAlarmType,
  orderEquipment,
  orderTimestamp,
  page,
  searchFilter,
  startDate,
}: TGetAlarmLogs): Promise<AlarmLogType | null> => {
  const data = await jsRequest({
    url: `/alarm/getalarmbyassetid`,
    data: {
      start_ts: startDate,
      end_ts: endDate,
      asset_ids: assets,
      alarm_type_id: alarmTypeId,
      search_filter: searchFilter,
      page,
      limit,
      order_timestamp: orderTimestamp,
      order_equipment: orderEquipment,
      order_alarm_type: orderAlarmType,
      order_alarm_status: orderAlarmStatus,
      order_alarm_message: orderAlarmMessage,
    },
  });
  return alarmLogSchema.parse(data);
};

type TGetAlarmStatusChart = {
  startDate: string;
  endDate: string;
  assets: string;
  alarmTypeId: number;
  searchFilter: string;
  period?: string;
};
export const getAlarmStatusChart = async ({
  alarmTypeId,
  assets,
  endDate,
  searchFilter,
  startDate,
  period,
}: TGetAlarmStatusChart): Promise<AlarmStatusChartType[] | null> => {
  const data = await jsRequest({
    url: `/alarm/getalarmcountperday`,
    data: {
      start_ts: startDate,
      end_ts: endDate,
      asset_ids: assets,
      alarm_type_id: alarmTypeId,
      search_filter: searchFilter,
      timezone_offset: new Date().getTimezoneOffset(),
      period,
    },
  });
  return z.array(alarmStatusSchema).parse(data);
};

type TGetAlarmCountChart = {
  startDate: string;
  endDate: string;
  assets: string;
  alarmTypeId: number;
  searchFilter: string;
};
export const getAlarmCountChart = async ({
  alarmTypeId,
  assets,
  endDate,
  searchFilter,
  startDate,
}: TGetAlarmCountChart): Promise<AlarmCountChartType[] | null> => {
  const data = await jsRequest({
    url: `/alarm/getmostoccuralarmperasset`,
    data: {
      start_ts: startDate,
      end_ts: endDate,
      asset_ids: assets,
      alarm_type_id: alarmTypeId,
      search_filter: searchFilter,
    },
  });
  return z.array(alarmCountChartSchema).parse(data);
};

type TGetAbnormalCountChart = {
  startDate: string;
  endDate: string;
  assets: string;
  alarmTypeId: number;
  searchFilter: string;
};
export const getAbnormalCountChart = async ({
  alarmTypeId,
  assets,
  endDate,
  searchFilter,
  startDate,
}: TGetAbnormalCountChart): Promise<AbnormalCountChartType[] | null> => {
  const data = await jsRequest({
    url: `/alarm/getmostoccurabnormalperasset`,
    data: {
      start_ts: startDate,
      end_ts: endDate,
      asset_ids: assets,
      alarm_type_id: alarmTypeId,
      search_filter: searchFilter,
    },
  });
  return z.array(abnormalCountChartSchema).parse(data);
};

type TGetAlarmMetrics = {
  startDate: string;
  endDate: string;
  assets: string;
  alarmTypeId: number;
  searchFilter: string;
};
export const getAlarmMetrics = async ({
  alarmTypeId,
  assets,
  endDate,
  searchFilter,
  startDate,
}: TGetAlarmMetrics): Promise<AlarmMetricType | null> => {
  const data = await jsRequest({
    url: `/alarm/getalarmcount`,
    data: {
      start_ts: startDate,
      end_ts: endDate,
      asset_ids: assets,
      alarm_type_id: alarmTypeId,
      search_filter: searchFilter,
    },
  });
  return alarmMetricSchema.parse(data);
};

type TGetAlarmEvents = {
  startDate: string;
  endDate: string;
  assets: string;
  alarmTypeId: number;
  searchFilter: string;
  page: number;
  period?: string;
};
export const getAlarmEvents = async ({
  alarmTypeId,
  assets,
  endDate,
  page,
  searchFilter,
  startDate,
  period,
}: TGetAlarmEvents): Promise<AlarmEventType | null> => {
  const data = await jsRequest({
    url: `/alarm/getalarmevents`,
    data: {
      page,
      limit: 3,
      start_ts: startDate,
      end_ts: endDate,
      asset_ids: assets,
      alarm_type_id: alarmTypeId,
      search_filter: searchFilter,
      timezone_offset: new Date().getTimezoneOffset(),
      period,
    },
  });
  return alarmEventSchema.parse(data);
};

type TGetAlarmEventsExport = {
  startDate: string;
  endDate: string;
  assets: string;
  alarmTypeId: number;
  searchFilter: string;
};
export const getAlarmEventsExport = async ({
  startDate,
  endDate,
  assets,
  alarmTypeId,
  searchFilter,
}: TGetAlarmEventsExport): Promise<AlarmtEventDataSchema[] | null> => {
  const data = await jsRequest({
    url: `/alarm/getalarmeventsexport`,
    data: {
      start_ts: startDate,
      end_ts: endDate,
      asset_ids: assets,
      alarm_type_id: alarmTypeId,
      search_filter: searchFilter,
      timezone_offset: new Date().getTimezoneOffset(),
    },
  });
  return z.array(alarmEventDataSchema).parse(data);
};

export const formatDate = (date: Date | null) => {
  if (!date) {
    return '';
  }
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year} ${hour}:${minute}`;
};

export const localDateToUTC = (dateString: string) => {
  return new Date(new Date(dateString).setHours(0, 0, 0, 0)).toISOString();
};
