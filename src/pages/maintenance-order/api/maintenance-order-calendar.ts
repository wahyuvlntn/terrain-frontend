import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const maintenanceCalendarMonthlySchema = z
  .object({
    id: z.number(),
    name: z.string(),
    equipment_id: z.string(),
    planned_start: z.string(),
    status: z.enum(['REQUESTED', 'IN_PROGRESS', 'DONE', 'REJECTED', 'OPEN', 'CLOSED', 'PAUSED']),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW', '']),
    assignee: z.string(),
    is_corrective: z.boolean(),
    from_system: z.boolean(),
    requested_by: z.string().optional().nullable(),
  })
  .array();

export type MaintenanceCalendarMontlyType = z.infer<typeof maintenanceCalendarMonthlySchema>;

export const getMaintenanceCalendarMonthly = async (
  month: number,
  year: number,
  filterData: string
): Promise<MaintenanceCalendarMontlyType> => {
  const result = await jsRequest({
    url: '/maintenance_order/get_calendar_monthly',
    data: {
      month,
      year,
      filter: filterData,
    },
  });

  return maintenanceCalendarMonthlySchema.parse(result);
};

const maintenanceCalendarWeeklySchema = z
  .object({
    id: z.number(),
    name: z.string(),
    equipment_id: z.string(),
    planned_start: z.string(),
    planned_end: z.string(),
    planned_start_sc: z.string(),
    planned_end_sc: z.string(),
    status: z.enum(['REQUESTED', 'IN_PROGRESS', 'DONE', 'REJECTED', 'OPEN', 'CLOSED', 'PAUSED']),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW', '']),
    assignee: z.string(),
    is_corrective: z.boolean(),
    from_system: z.boolean(),
    requested_by: z.string().optional().nullable(),
  })
  .array();

export type MaintenanceCalendarWeeklyType = z.infer<typeof maintenanceCalendarWeeklySchema>;

export const getMaintenanceCalendarWeekly = async (
  startTime: string,
  endTime: string,
  filterData: string
): Promise<MaintenanceCalendarWeeklyType> => {
  const result = await jsRequest({
    url: '/maintenance_order/get_calendar_weekly',
    data: {
      start_time: startTime,
      end_time: endTime,
      filter: filterData,
      timezone_offset: new Date().getTimezoneOffset(),
    },
  });

  return maintenanceCalendarWeeklySchema.parse(result);
};
