import { z } from 'zod';

export const formSchema = z
  .object({
    maintenanceType: z.string().min(1, 'Maintenance type is required'),
    building: z.string().min(1, 'Building is required'),
    floor: z.string().min(1, 'Floor is required'),
    room: z.string().min(1, 'Room is required'),
    equipment: z.string().min(1, 'Equipment is required'),

    repeatBy: z.string(),
    repeatEndDate: z.string(),
    repeatEndTime: z.string(),

    plannedStartDate: z.string().min(1, 'Planned start date is required'),
    plannedStartTime: z.string().min(1, 'Planned start time is required'),
    plannedFinishDate: z.string(),
    plannedFinishTime: z.string(),

    priority: z.string(),
    severity: z.string().min(1, 'Severity is required'),
    description: z.string(),
    technicians: z.string(),
    instructions: z.string(),
    otherIssues: z.string(),
    spv_view: z.boolean(),
    reject_reason: z.string(),
    is_recurring: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.spv_view) {
      const requiredWhenSpv: Array<{
        field: keyof typeof data;
        label: string;
      }> = [
        { field: 'instructions', label: 'Instructions' },
        { field: 'technicians', label: 'Technicians' },
        { field: 'priority', label: 'Priority' },
        { field: 'plannedFinishDate', label: 'Planned finish date' },
        { field: 'plannedFinishTime', label: 'Planned finish time' },
      ];

      for (const item of requiredWhenSpv) {
        if (!data[item.field] || (data[item.field] as string).length === 0) {
          ctx.addIssue({
            path: [item.field],
            message: `${item.label} is required`,
            code: z.ZodIssueCode.custom,
          });
        }
      }
    }
    if (
      new Date(`${data.plannedStartDate} ${data.plannedStartTime}`).getTime() >
      new Date(`${data.plannedFinishDate} ${data.plannedFinishTime}`).getTime()
    ) {
      ctx.addIssue({
        path: ['plannedStartDate'],
        message: 'Finish time should be greater than start time',
        code: z.ZodIssueCode.custom,
      });
      ctx.addIssue({
        path: ['plannedStartTime'],
        message: 'Finish time should be greater than start time',
        code: z.ZodIssueCode.custom,
      });
      ctx.addIssue({
        path: ['plannedFinishDate'],
        message: 'Finish time should be greater than start time',
        code: z.ZodIssueCode.custom,
      });
      ctx.addIssue({
        path: ['plannedFinishTime'],
        message: 'Finish time should be greater than start time',
        code: z.ZodIssueCode.custom,
      });
    }
    if (
      data.repeatEndDate &&
      data.repeatEndTime &&
      data.plannedStartDate &&
      data.plannedStartTime &&
      new Date(`${data.plannedStartDate} ${data.plannedStartTime}`).getTime() >
        new Date(`${data.repeatEndDate} ${data.repeatEndTime}`).getTime()
    ) {
      ctx.addIssue({
        path: ['plannedStartDate'],
        message: 'Planned start cannot be after repeat end',
        code: z.ZodIssueCode.custom,
      });
      ctx.addIssue({
        path: ['plannedStartTime'],
        message: 'Planned start cannot be after repeat end',
        code: z.ZodIssueCode.custom,
      });
      ctx.addIssue({
        path: ['repeatEndDate'],
        message: 'Repeat end cannot be before planned start',
        code: z.ZodIssueCode.custom,
      });
      ctx.addIssue({
        path: ['repeatEndTime'],
        message: 'Repeat end cannot be before planned start',
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type FormType = z.infer<typeof formSchema>;

// Type for initial/default data that can be injected from API
export interface MaintenanceOrderData {
  id?: string | number;
  maintenanceType?: string;
  building?: string;
  floor?: string;
  room?: string;
  equipment?: string;
  repeatBy?: string;
  scheduleTime?: string;
  scheduleDate?: string;
  scheduleDay?: string;
  scheduleMonth?: string;
  repeatEndDate?: string;
  repeatEndTime?: string;
  plannedStartDate?: string;
  plannedStartTime?: string;
  plannedFinishDate?: string;
  plannedFinishTime?: string;
  priority?: string;
  severity?: string;
  description?: string;
  // SPV view metadata
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  estimatedTime?: string;
  actualTime?: string;
  status?: 'REQUESTED' | 'REJECTED' | 'IN_PROGRESS' | 'DONE' | 'CLOSED' | 'OPEN' | 'PAUSED';
  maintenanceId: number | null;
  instructions: string;
  technicians: string;
  approved_by: string;
  edited_by: string;
  reject_reason: string;
  isTimeExceed?: boolean | null;
  issue_relation_id: number | null;
  other_alarm_codes: string;
}

// View mode type
export type ViewMode = 'technician' | 'spv';

export type PopupType =
  | 'APPROVE'
  | 'REJECT'
  | 'CREATE'
  | 'CANCEL'
  | 'DELETE'
  | 'EDIT'
  | 'SAVE_DRAFT'
  | null;
