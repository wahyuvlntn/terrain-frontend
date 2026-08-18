import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const currentIssueSchema = z.object({
  code: z.string(),
  name: z.string(),
});

const earlyWarningItemSchema = z.object({
  id: z.number(),
  model: z.string(),
  current_issues: z.array(currentIssueSchema).nullable(),
  timestamp: z.string(),
  severity: z.string(),
  asset_name: z.string(),
});

const earlyWarningListResponseSchema = z.object({
  data: z.array(earlyWarningItemSchema).nullable(),
  compound_count: z.number(),
  degradation_count: z.number(),
});

export type CurrentIssueType = z.infer<typeof currentIssueSchema>;
export type EarlyWarningItem = z.infer<typeof earlyWarningItemSchema>;
export type EarlyWarningListResponse = z.infer<typeof earlyWarningListResponseSchema>;

type GetEarlyWarningListParams = {
  start_time: string;
  end_time: string;
  filter: string;
  include_compound: boolean;
  include_degradation: boolean;
  page: number;
  search: string;
  limit: number;
};

export const getEarlyWarningList = async (
  params: GetEarlyWarningListParams
): Promise<EarlyWarningListResponse> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/get_early_warning_list`,
    data: {
      start_time: params.start_time,
      end_time: params.end_time,
      filter: params.filter,
      include_compound: params.include_compound,
      include_degradation: params.include_degradation,
      page: params.page,
      search: params.search,
      limit: params.limit,
    },
  });

  return earlyWarningListResponseSchema.parse(data);
};

const alarmCodeSchema = z.object({
  code: z.string(),
  label: z.string(),
  alarm_status: z.string(),
  timestamp: z.string().optional(),
});

const maintenanceOrderOverviewSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.string(),
  severity: z.string(),
  priority: z.string(),
  planned_start: z.string(),
  planned_end: z.string(),
  estimated_time: z.number().nullable(),
  actual_time: z.number().nullable(),
  assignee: z.string(),
  maintenance_type: z.string(),
  alarm_codes: z.array(alarmCodeSchema),
  other_alarm_codes: z.array(alarmCodeSchema),
  asset_id: z.number(),
  is_deduction: z.boolean(),
  approved_by: z.string(),
});

const maintenanceOrderOverviewResponseSchema = z.array(maintenanceOrderOverviewSchema);

export type AlarmCode = z.infer<typeof alarmCodeSchema>;
export type MaintenanceOrderOverview = z.infer<typeof maintenanceOrderOverviewSchema>;

export const getMaintenanceOrderOverview = async (
  orderId: number
): Promise<MaintenanceOrderOverview | null> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/get_maintenance_order_overview`,
    data: {
      order_id: orderId,
    },
  });

  const parsed = maintenanceOrderOverviewResponseSchema.parse(data);
  return parsed[0] ?? null;
};

const assetOverviewSchema = z.object({
  id: z.number(),
  name: z.string(),
  model_name: z.string(),
  type_name: z.string(),
  location: z.string(),
  image: z.string(),
  status: z.string().nullable(),
  status_start_time: z.string().nullable(),
  status_duration: z.number().nullable(),
  condition: z.string().nullable(),
  condition_start_time: z.string().nullable(),
  condition_duration: z.number().nullable(),
  uptime: z.number().nullable(),
  warning_counts: z.number(),
  critical_counts: z.number(),
  running_duration: z.number().nullable(),
  running_duration_hours: z.number().nullable(),
  total_duration: z.number().nullable(),
  is_utility: z.boolean(),
});

const assetOverviewResponseSchema = z.array(assetOverviewSchema);

export type AssetOverview = z.infer<typeof assetOverviewSchema>;

type GetAssetOverviewParams = {
  asset_id: number;
  start_date: string;
  end_date: string;
  timezone_offset: number;
};

export const getAssetOverview = async (
  params: GetAssetOverviewParams
): Promise<AssetOverview | null> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/get_asset_overview`,
    data: {
      asset_id: params.asset_id,
      start_date: params.start_date,
      end_date: params.end_date,
      timezone_offset: params.timezone_offset,
    },
  });

  const parsed = assetOverviewResponseSchema.parse(data);
  return parsed[0] ?? null;
};

const assetParameterSchema = z.object({
  id: z.number(),
  name: z.string(),
  unit: z.string(),
});

const assetParametersResponseSchema = z.array(assetParameterSchema);

export type AssetParameter = z.infer<typeof assetParameterSchema>;

export const getAssetParameters = async (assetId: number): Promise<AssetParameter[]> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/get_asset_parameters`,
    data: {
      asset_id: assetId,
    },
  });

  return assetParametersResponseSchema.parse(data);
};

const instructionItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  content: z.string().nullable(),
  isUsingPdf: z.boolean(),
  pdfUrl: z.string().nullable(),
  pdfName: z.string().nullable(),
  description: z.string(),
  duration: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
  modelNames: z.array(z.string()),
  isOther: z.boolean(),
  isValid: z.boolean().nullable(),
  typeId: z.number(),
  codeId: z.number(),
});

const instructionTypeSchema = z.object({
  typeName: z.string(),
  typeId: z.number(),
  isValid: z.boolean().nullable(),
  data: z.array(instructionItemSchema),
});

const groupedInstructionSchema = z.object({
  codeName: z.string(),
  codeId: z.number(),
  data: z.array(instructionTypeSchema),
});

const instructionListResponseSchema = z.object({
  instructions: z.array(groupedInstructionSchema),
  otherInstructions: z.array(groupedInstructionSchema),
  estimatedTime: z.string().nullable(),
  hasOtherInstructions: z.boolean(),
});

export type InstructionItem = z.infer<typeof instructionItemSchema>;
export type InstructionType = z.infer<typeof instructionTypeSchema>;
export type GroupedInstructionResponse = z.infer<typeof groupedInstructionSchema>;
export type InstructionListResponse = z.infer<typeof instructionListResponseSchema>;

export const getInstructionList = async (
  maintenanceId: number
): Promise<InstructionListResponse> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/get_instruction_list`,
    data: {
      maintenance_id: maintenanceId,
    },
  });

  return instructionListResponseSchema.parse(data);
};

type ChangeAlarmValidityParams = {
  maintenance_id: number;
  alarm_codes: string;
  changed_validities: string;
  created_by: string;
};

export const changeAlarmValidity = async (params: ChangeAlarmValidityParams): Promise<string> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/change_alarm_validity`,
    data: {
      maintenance_id: params.maintenance_id,
      alarm_codes: params.alarm_codes,
      changed_validities: params.changed_validities,
      created_by: params.created_by,
    },
  });

  return data as string;
};

const earlyWarningExportItemSchema = z.object({
  building: z.string(),
  detected_issue: z.string(),
  diagnostic_result: z.string(),
  equipment: z.string(),
  floor: z.string(),
  order_id: z.string(),
  other_possible_issue: z.string(),
  planned_finish: z.string(),
  planned_start: z.string(),
  related_parameter: z.string(),
  repair_result: z.string(),
  room: z.string(),
  severity: z.string(),
  status: z.string(),
  technician: z.string(),
});

const earlyWarningExportResponseSchema = z.array(earlyWarningExportItemSchema);

export type EarlyWarningExportItem = z.infer<typeof earlyWarningExportItemSchema>;

type GetEarlyWarningExportDataParams = {
  start_time: string;
  end_time: string;
  filter: string;
};

export const getEarlyWarningExportData = async (
  params: GetEarlyWarningExportDataParams
): Promise<EarlyWarningExportItem[]> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/export_early_warning_diagnostics`,
    data: {
      start_time: params.start_time,
      end_time: params.end_time,
      filter: params.filter,
    },
  });

  return earlyWarningExportResponseSchema.parse(data);
};
