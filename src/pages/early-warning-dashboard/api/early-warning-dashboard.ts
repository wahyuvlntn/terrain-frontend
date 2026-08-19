import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const earlyWarningTypeCountSchema = z.object({
  typeName: z.string(),
  count: z.number(),
  percentage: z.number(),
});

export type TEarlyWarningTypeCount = z.infer<typeof earlyWarningTypeCountSchema>;

type TCommonParams = {
  assetIds: number[];
  locationIds: number[] | null;
  modelIds: number[] | null;
  typeIds: number[] | null;
  start: string;
  end: string;
  timezoneOffset: number;
};

export const getEarlyWarningType = async ({
  assetIds,
  end,
  locationIds,
  modelIds,
  start,
  typeIds,
  timezoneOffset,
}: TCommonParams) => {
  const data = await jsRequest({
    url: `/early_warning_dashboard/get_early_warning_types`,
    data: {
      start_date: start,
      end_date: end,
      type_ids: typeIds?.join(','),
      model_ids: modelIds?.join(','),
      location_ids: locationIds?.join(','),
      asset_ids: assetIds.join(','),
      timezone_offset: timezoneOffset,
    },
  });

  return earlyWarningTypeCountSchema.array().parse(
    data.map((item: { type_name: unknown }) => ({
      ...item,
      typeName: item.type_name,
    }))
  );
};

const earlyWarningStatusCountSchema = z.object({
  statusName: z.string(),
  count: z.number(),
  percentage: z.number(),
});

export type TEarlyWarningStatusCount = z.infer<typeof earlyWarningStatusCountSchema>;

export const getEarlyWarningStatus = async ({
  assetIds,
  end,
  locationIds,
  modelIds,
  start,
  typeIds,
  timezoneOffset,
}: TCommonParams) => {
  const data = await jsRequest({
    url: `/early_warning_dashboard/get_early_warning_statuses`,
    data: {
      start_date: start,
      end_date: end,
      type_ids: typeIds?.join(','),
      model_ids: modelIds?.join(','),
      location_ids: locationIds?.join(','),
      asset_ids: assetIds.join(','),
      timezone_offset: timezoneOffset,
    },
  });

  return earlyWarningStatusCountSchema.array().parse(
    data.map((item: { status_name: unknown }) => ({
      ...item,
      statusName: item.status_name,
    }))
  );
};

const parameterWarningOccurrenceSchema = z.object({
  parameterName: z.string(),
  count: z.number(),
});

export type TParameterWarningOccurrence = z.infer<typeof parameterWarningOccurrenceSchema>;

export const getParameterWarningOccurrence = async ({
  assetIds,
  end,
  locationIds,
  modelIds,
  start,
  typeIds,
  timezoneOffset,
}: TCommonParams) => {
  const data = await jsRequest({
    url: `/early_warning_dashboard/get_parameter_warning_occurences`,
    data: {
      start_date: start,
      end_date: end,
      type_ids: typeIds?.join(','),
      model_ids: modelIds?.join(','),
      location_ids: locationIds?.join(','),
      asset_ids: assetIds.join(','),
      timezone_offset: timezoneOffset,
    },
  });

  return parameterWarningOccurrenceSchema.array().parse(
    data.map((item: { parameter_name: unknown }) => ({
      ...item,
      parameterName: item.parameter_name,
    }))
  );
};

const errorCodeOccurrenceSchema = z.object({
  errorCode: z.string(),
  count: z.number(),
});

export type TErrorCodeOccurrence = z.infer<typeof errorCodeOccurrenceSchema>;

export const getErrorCodeOccurrence = async ({
  assetIds,
  end,
  locationIds,
  modelIds,
  start,
  typeIds,
  timezoneOffset,
}: TCommonParams) => {
  const data = await jsRequest({
    url: `/early_warning_dashboard/get_error_code_occurences`,
    data: {
      start_date: start,
      end_date: end,
      type_ids: typeIds?.join(','),
      model_ids: modelIds?.join(','),
      location_ids: locationIds?.join(','),
      asset_ids: assetIds.join(','),
      timezone_offset: timezoneOffset,
    },
  });

  return errorCodeOccurrenceSchema.array().parse(
    data.map((item: { error_code: unknown }) => ({
      ...item,
      errorCode: item.error_code,
    }))
  );
};

const earlyWarningAndDiagnosticTrendSchema = z.object({
  day: z.string(),
  degradation: z.number(),
  compoundDegradation: z.number(),
});

export type TEarlyWarningAndDiagnosticTrend = z.infer<typeof earlyWarningAndDiagnosticTrendSchema>;

export const getEarlyWarningAndDiagnosticTrend = async ({
  assetIds,
  end,
  locationIds,
  modelIds,
  start,
  typeIds,
  timezoneOffset,
}: TCommonParams) => {
  const data = await jsRequest({
    url: `/early_warning_dashboard/get_early_warning_and_diagnostic_trend`,
    data: {
      start_date: start,
      end_date: end,
      type_ids: typeIds?.join(','),
      model_ids: modelIds?.join(','),
      location_ids: locationIds?.join(','),
      asset_ids: assetIds.join(','),
      timezone_offset: timezoneOffset,
    },
  });

  return earlyWarningAndDiagnosticTrendSchema.array().parse(
    data.map((item: { compound_degradation: unknown }) => ({
      ...item,
      compoundDegradation: item.compound_degradation,
    }))
  );
};

const timeseriesSchema = z.object({
  timestamp: z.string(),
  count: z.number(),
});

export type TTimeseries = z.infer<typeof timeseriesSchema>;

const issuePatternSchema = z.object({
  alarmCodeId: z.number(),
  issueCode: z.string(),
  issueName: z.string(),
  // data: timeseriesSchema.array()
});

export type TIssuePattern = z.infer<typeof issuePatternSchema>;

const issuePatternPaginatedSchema = z.object({
  count: z.number(),
  data: issuePatternSchema.array(),
});

export const getIssuePatternList = async ({
  assetIds,
  end,
  locationIds,
  modelIds,
  start,
  typeIds,
  page,
  timezoneOffset,
}: TCommonParams & { page: number }) => {
  const data = await jsRequest({
    url: `/early_warning_dashboard/get_issue_pattern_list`,
    data: {
      start_date: start,
      end_date: end,
      type_ids: typeIds?.join(','),
      model_ids: modelIds?.join(','),
      location_ids: locationIds?.join(','),
      asset_ids: assetIds.join(','),
      timezone_offset: timezoneOffset,
      page,
    },
  });

  return issuePatternPaginatedSchema.parse({
    ...data,
    data: data.data.map(
      (item: { alarm_code_id: unknown; issue_code: unknown; issue_name: unknown }) => ({
        ...item,
        alarmCodeId: item.alarm_code_id,
        issueCode: item.issue_code,
        issueName: item.issue_name,
      })
    ),
  });
};

type TGetIssuePatternChartParams = {
  alarmCodeId: number;
  issueName: string;
  start: string;
  end: string;
  type: string | undefined;
  timezoneOffset: number;
};

export const getIssuePatternChart = async ({
  alarmCodeId,
  issueName,
  start,
  end,
  type,
  timezoneOffset,
}: TGetIssuePatternChartParams) => {
  const data = await jsRequest({
    url: `/early_warning_dashboard/get_issue_pattern_chart_v2`,
    data: {
      start_date: start,
      end_date: end,
      timezone_offset: timezoneOffset,
      alarm_code_id: alarmCodeId,
      model_parameter_name: issueName,
      type,
    },
  });

  return timeseriesSchema.array().parse(data);
};

const issuePatternDetailSchema = issuePatternSchema.extend({
  totalCount: z.number(),
  mttr: z.string(),
  effectedUnit: z.number(),
});

export type TIssuePatternDetail = z.infer<typeof issuePatternDetailSchema>;

export const getIssuePatternDetail = async ({
  alarmCodeId,
  issueName,
  start,
  end,
  type,
  timezoneOffset,
}: TGetIssuePatternChartParams) => {
  const data = await jsRequest({
    url: `/early_warning_dashboard/get_issue_pattern_detail_v2`,
    data: {
      start_date: start,
      end_date: end,
      timezone_offset: timezoneOffset,
      alarm_code_id: alarmCodeId,
      model_parameter_name: issueName,
      type,
    },
  });

  return issuePatternDetailSchema.parse({
    ...data,
    alarmCodeId: data.alarm_code_id,
    issueCode: data.issue_code,
    issueName: data.issue_name,
    totalCount: data.total_count,
    effectedUnit: data.effected_unit,
  });
};
