import { jsRequest } from '@digital-twin/utils';
import { format } from 'date-fns';
import { z } from 'zod';

// ============================================
// EXISTING API SCHEMAS AND FUNCTIONS
// ============================================

const maintenanceOrderListSchema = z.object({
  data: z
    .object({
      id: z.number(),
      name: z.string(),
      equipment_id: z.string(),
      planned_start: z.string(),
      status: z.enum(['REQUESTED', 'REJECTED', 'IN_PROGRESS', 'DONE', 'CLOSED', 'OPEN', 'PAUSED']),
      severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW', '']),
      assignee: z.string(),
      is_corrective: z.boolean(),
      from_system: z.boolean(),
    })
    .array(),
  count: z.number(),
  all_data_ids: z.number().array(),
});

export type MaintenanceOrderListType = z.infer<typeof maintenanceOrderListSchema>;

export const getMaintenanceOrderList = async (body: {
  filter: string;
  page: number;
  search: string;
  start_time: string;
  end_time: string;
}): Promise<MaintenanceOrderListType> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_maintenance_order_list`,
    data: body,
  });

  return maintenanceOrderListSchema.parse(data);
};

export const getMaintenanceOrderStatus = async (orderId: number) => {
  const data = await jsRequest({
    url: '/maintenance_order/get_maintenance_status',
    data: {
      order_id: orderId,
    },
  });

  return z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val.toUpperCase().replace(' ', '_');
      }
      return val;
    }, z.string())
    .parse(data);
};

const maintenanceNameAndTypeSchema = z.object({
  name: z.string(),
  is_corrective: z.boolean(),
});

export type MaintenanceNameAndTypeType = z.infer<typeof maintenanceNameAndTypeSchema>;

export const getMaintenanceNameAndType = async (body: {
  maintenance_id: number;
}): Promise<MaintenanceNameAndTypeType> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_maintenance_name_and_type`,
    data: body,
  });

  return maintenanceNameAndTypeSchema.parse(data);
};

const dropdownOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export type DropdownOptionType = z.infer<typeof dropdownOptionSchema>;

export const getMaintenanceOrderTypes = async (): Promise<DropdownOptionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_maintenance_order_types`,
  });

  return dropdownOptionSchema.array().parse(data);
};

export const getBuildings = async (): Promise<DropdownOptionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_buildings`,
  });

  return dropdownOptionSchema.array().parse(data);
};

export const getFloors = async (body: { building_id: number }): Promise<DropdownOptionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_floors`,
    data: body,
  });

  return dropdownOptionSchema.array().parse(data);
};

export const getRooms = async (body: { floor_id: number }): Promise<DropdownOptionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_rooms`,
    data: body,
  });

  return dropdownOptionSchema.array().parse(data);
};

export const getEquipments = async (body: { room_id: number }): Promise<DropdownOptionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_equipments`,
    data: body,
  });

  return dropdownOptionSchema.array().parse(data);
};

export const getRepeatBy = async (): Promise<DropdownOptionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_repeat_by`,
  });

  return dropdownOptionSchema.array().parse(data);
};

export const getPriorities = async (): Promise<DropdownOptionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_priorities`,
  });

  return dropdownOptionSchema.array().parse(data);
};

export const getSeverities = async (): Promise<DropdownOptionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_severities`,
  });

  return dropdownOptionSchema.array().parse(data);
};

const maintenanceInstructionSchema = z.object({
  label: z.string(),
  value: z.string(),
  estimated_time_minute: z.number(),
  is_diagnostic: z.boolean(),
  is_repair: z.boolean(),
});

export type MaintenanceInstructionType = z.infer<typeof maintenanceInstructionSchema>;

export const getMaintenanceInstructions = async (body: {
  asset_id: number;
}): Promise<MaintenanceInstructionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_maintenance_instructions`,
    body,
  });

  return maintenanceInstructionSchema.array().parse(data);
};

export const getTechnicians = async (body: {
  building_id: number | null;
  equipment_id: number;
  planned_start: string | null;
  planned_end: string | null;
  maintenance_id: number;
}): Promise<DropdownOptionType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_technicians`,
    body,
  });

  return dropdownOptionSchema.array().parse(data);
};

// ============================================
// MAINTENANCE ORDER DETAIL
// ============================================

export const maintenanceOrderDetailSchema = z.object({
  id: z.number().optional(),
  maintenanceType: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  room: z.string().optional(),
  equipment: z.string().optional(),
  repeatBy: z.string().optional(),
  repeatEndDate: z.string().optional(),
  repeatEndTime: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedStartTime: z.string().optional(),
  plannedFinishDate: z.string().optional(),
  plannedFinishTime: z.string().optional(),
  priority: z.string().optional(),
  severity: z.string().optional(),
  description: z.string().optional(),
  // SPV metadata
  createdAt: z.string().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.string().optional(),
  estimatedTime: z.string().optional(),
  actualTime: z.string().optional(),
  status: z
    .enum(['REQUESTED', 'REJECTED', 'IN_PROGRESS', 'DONE', 'CLOSED', 'OPEN', 'PAUSED'])
    .optional(),
  maintenanceId: z.number().nullable(),
  instructions: z.string(),
  technicians: z.string(),
  approved_by: z.string(),
  edited_by: z.string(),
  reject_reason: z.string(),
  isTimeExceed: z.boolean().nullable(),
  issue_relation_id: z.number().nullable(),
  other_alarm_codes: z.string(),
});

export type MaintenanceOrderDetail = z.infer<typeof maintenanceOrderDetailSchema>;

export const maintenanceOrderDetailAPISchema = z.object({
  actual_time: z.number(),
  building: z.string(),
  created_at: z.string(),
  description: z.string(),
  equipment: z.string(),
  estimated_time: z.number(),
  floor: z.string(),
  id: z.number(),
  maintenance_id: z.number().nullable(),
  maintenance_type_id: z.string(),
  planned_end: z.string().nullable(),
  planned_start: z.string(),
  priority: z.string().nullable(),
  repeat_end: z.string().nullable(),
  repeat_type_id: z.string().nullable(),
  requested_by: z.string(),
  room: z.string(),
  severity: z.string(),
  status: z.enum(['REQUESTED', 'REJECTED', 'IN_PROGRESS', 'DONE', 'CLOSED', 'OPEN', 'PAUSED']),
  updated_at: z.string().nullable(),
  instructions: z.string(),
  technicians: z.string(),
  approved_by: z.string(),
  edited_by: z.string(),
  reject_reason: z.string(),
  is_started: z.boolean(),
  issue_relation_id: z.number().nullable(),
  other_alarm_codes: z.string(),
});

export type MaintenanceOrderDetailAPIType = z.infer<typeof maintenanceOrderDetailAPISchema>;

function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) return '0 seconds';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];

  if (hours > 0) parts.push(`${hours} hours`);
  parts.push(`${minutes} minutes`);

  return parts.join(' ');
}

export const getMaintenanceOrderDetail = async (body: {
  order_id: number;
}): Promise<MaintenanceOrderDetail> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_maintenance_order_detail`,
    body,
  });
  const apiData = maintenanceOrderDetailAPISchema.array().parse(data);

  if (apiData.length === 0) {
    return maintenanceOrderDetailSchema.parse({
      instructions: '',
      technicians: '',
      approved_by: '',
      edited_by: '',
      reject_reason: '',
      maintenanceId: null,
      isTimeExceed: null,
      issue_relation_id: null,
      other_alarm_codes: '',
    });
  }

  // parse planned start and planned end
  const plannedStart = new Date(apiData[0].planned_start);
  const plannedStartDate = format(plannedStart, 'yyyy-MM-dd');
  const plannedStartTime = format(plannedStart, 'HH:mm');

  const plannedEnd = apiData[0].planned_end ? new Date(apiData[0].planned_end) : '';
  const plannedFinishDate = plannedEnd ? format(plannedEnd, 'yyyy-MM-dd') : '';
  const plannedFinishTime = plannedEnd ? format(plannedEnd, 'HH:mm') : '';

  // parse repeat end
  const repeatEnd = apiData[0].repeat_end ? new Date(apiData[0].repeat_end) : '';
  const repeatEndDate = repeatEnd ? format(repeatEnd, 'yyyy-MM-dd') : '';
  const repeatEndTime = repeatEnd ? format(repeatEnd, 'HH:mm') : '';

  const isTimeExceed = apiData[0].is_started
    ? apiData[0].actual_time > apiData[0].estimated_time
    : null;

  const parsedData: MaintenanceOrderDetail = {
    id: apiData[0].id,
    maintenanceType: apiData[0].maintenance_type_id,
    building: apiData[0].building,
    floor: apiData[0].floor,
    room: apiData[0].room,
    equipment: apiData[0].equipment,
    repeatBy: apiData[0].repeat_type_id || '',
    plannedStartDate,
    plannedStartTime,
    plannedFinishDate,
    plannedFinishTime,
    repeatEndDate,
    repeatEndTime,
    priority: apiData[0].priority || '',
    severity: apiData[0].severity || '',
    status: apiData[0].status,
    maintenanceId: apiData[0].maintenance_id,
    description: apiData[0].description,
    // SPV metadata
    createdAt: format(new Date(apiData[0].created_at), 'dd MMM yyyy HH:mm'),
    createdBy: apiData[0].requested_by,
    updatedAt: apiData[0].updated_at
      ? format(new Date(apiData[0].updated_at), 'dd MMM yyyy HH:mm')
      : '-',
    estimatedTime: apiData[0].estimated_time ? formatDuration(apiData[0].estimated_time) : '-',
    actualTime: apiData[0].actual_time ? formatDuration(apiData[0].actual_time) : '-',
    instructions: apiData[0].instructions,
    technicians: apiData[0].technicians,
    approved_by: apiData[0].approved_by,
    edited_by: apiData[0].edited_by,
    reject_reason: apiData[0].reject_reason,
    isTimeExceed,
    issue_relation_id: apiData[0].issue_relation_id,
    other_alarm_codes: apiData[0].other_alarm_codes,
  };

  return maintenanceOrderDetailSchema.parse(parsedData);
};

// ============================================
// CONSOLIDATED SUBMIT API
// ============================================

// Action types for the submit API
export type SubmitAction = 'CREATED' | 'APPROVED' | 'REJECTED' | 'SAVED';

// Submit request type
export interface SubmitMaintenanceOrderRequest {
  approved_by: string | null;
  asset_id: number | null;
  description: string | null;
  edited_by: string | null;
  id: number | null;
  instructions: string | null;
  other_alarm_codes: string | null;
  is_recurring: boolean | null;
  maintenance_type_id: number | null;
  planned_end: string | null;
  planned_start: string | null;
  priority_id: number | null;
  reject_reason: string | null;
  repeat_end: string | null;
  repeat_type_id: number | null;
  severity_id: number | null;
  status_id: number | null;
  technicians: string | null;
  submit_type: SubmitAction;
  requested_by: string | null;
}

export const submitMaintenanceOrder = async (
  data: SubmitMaintenanceOrderRequest
): Promise<{
  message: string;
  result: Record<string, string>;
}> => {
  const response = await jsRequest({
    url: `/maintenance_order/submit`,
    data,
  });

  return response;
};

export interface DeleteMaintenanceOrderRequest {
  id: number;
  is_recurring: boolean;
}

export const deleteMaintenanceOrder = async (
  data: DeleteMaintenanceOrderRequest
): Promise<string> => {
  const response = await jsRequest({
    url: `/maintenance_order/delete_maintenance_order`,
    data,
  });

  return response;
};

// ============================================
// PROGRESS API
// ============================================

// Progress Item Schema
const progressItemSchema = z.object({
  date: z.string(),
  time: z.string(),
  status: z.string(),
  details: z.record(z.string(), z.unknown()),
});

export type ProgressItem = z.infer<typeof progressItemSchema>;

const progressItemAPISchema = z.object({
  datetime: z.string(),
  status: z.string(),
  details: z.record(z.string(), z.unknown()),
});

/**
 * Get progress/activity timeline for a maintenance order
 */
export const getMaintenanceOrderProgress = async (body: {
  order_id: number;
}): Promise<ProgressItem[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_progress`,
    data: body,
  });

  const parsed = progressItemAPISchema
    .array()
    .parse(data)
    .map((d) => {
      const datetime = new Date(d.datetime);
      const date = format(datetime, 'dd MMM yyyy');
      const time = format(datetime, 'HH:mm');
      return {
        ...d,
        date,
        time,
      };
    });

  return progressItemSchema.array().parse(parsed);
};

const maintenanceSupervisorAndTechnicians = z.object({
  supervisor: z.string(),
  technicians: z.string().array(),
});

export type MaintenanceSupervisorAndTechnicians = z.infer<
  typeof maintenanceSupervisorAndTechnicians
>;

export const getMaintenanceSupervisorAndTechnicians = async (data: {
  maintenance_id: number;
}): Promise<MaintenanceSupervisorAndTechnicians> => {
  const response = await jsRequest({
    url: `/maintenance_order/get_maintenance_supervisor_and_technicians`,
    data,
  });

  return maintenanceSupervisorAndTechnicians.parse(response);
};

// ============================================
// EXPORT API
// ============================================

const maintenanceExportDataSchema = z.object({
  no: z.number(),
  order_id: z.string(),
  planned_start: z.string().nullable(),
  planned_end: z.string().nullable(),
  maintenance_type: z.string(),
  priority: z.string(),
  issue: z.string().nullable(),
  severity: z.string(),
  building: z.string(),
  floor: z.string(),
  room: z.string(),
  equipment: z.string(),
  status: z.string(),
  requested_by: z.string(),
  technician: z.string(),
});

export type MaintenanceExportData = z.infer<typeof maintenanceExportDataSchema>;

export const getMaintenanceExportData = async (body: {
  start_time: string;
  end_time: string;
  filter: string;
}): Promise<MaintenanceExportData[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_maintenance_export_data`,
    data: body,
  });

  return maintenanceExportDataSchema.array().parse(data);
};

const otherPossibleIssueSchema = z.object({
  id: z.number(),
});

type OtherPossibleIssueType = z.infer<typeof otherPossibleIssueSchema>;

export const getOtherPossibleIssues = async (body: {
  maintenance_id: number;
}): Promise<OtherPossibleIssueType[]> => {
  const data = await jsRequest({
    url: `/maintenance_order/get_other_possible_issues`,
    data: body,
  });

  return otherPossibleIssueSchema.array().parse(data);
};

const diagnosticsOverviewSchema = z.object({
  is_compound: z.boolean(),
  is_deduction: z.boolean(),
});

export type DiagnosticsOverviewType = z.infer<typeof diagnosticsOverviewSchema>;

export const getDiagnosticsOverview = async (body: {
  maintenance_id: number;
}): Promise<DiagnosticsOverviewType> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/get_diagnostics_overview`,
    data: body,
  });

  return diagnosticsOverviewSchema.parse(data);
};

const alarmItemSchema = z.object({
  alarm_code: z.string(),
  alarm_name: z.string(),
  alarm_status: z.string(),
});

const parameterMessageSchema = z.object({
  message: z.string().nullable(),
  alarms: alarmItemSchema.array(),
  detected_at: z.string(),
  name: z.string(),
});

export type ParameterMessageType = z.infer<typeof parameterMessageSchema>;

export const getParameterMessage = async (body: {
  maintenance_id: number;
}): Promise<ParameterMessageType[]> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/get_parameter_message`,
    data: body,
  });

  return parameterMessageSchema.array().parse(data);
};

const maintenanceAlarmTimestampsSchema = z.object({
  timestamps: z.string().array(),
  max_timestamp: z.string(),
});

export type MaintenanceAlarmTimestamps = z.infer<typeof maintenanceAlarmTimestampsSchema>;

export const getMaintenanceAlarmTimestamps = async (body: {
  maintenance_id: number;
}): Promise<MaintenanceAlarmTimestamps> => {
  const data = await jsRequest({
    url: `/early_warning_diagnostics/get_maintenance_alarm_timestamps`,
    data: body,
  });

  return maintenanceAlarmTimestampsSchema.parse(data);
};
