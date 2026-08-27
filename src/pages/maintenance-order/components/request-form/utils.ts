import { format } from 'date-fns';

export function calculateFinishDateTime(
  startDate: string,
  startTime: string,
  durationMinute: number
): {
  finishDate: string; // YYYY-MM-DD
  finishTime: string; // HH:mm
} {
  const startDateTime = new Date(`${startDate}T${startTime}:00`);

  if (isNaN(startDateTime.getTime())) {
    throw new Error('Invalid startDate or startTime format');
  }

  startDateTime.setMinutes(startDateTime.getMinutes() + durationMinute);

  const finishDate = format(startDateTime, 'yyyy-MM-dd');
  const finishTime = format(startDateTime, 'HH:mm');

  return {
    finishDate,
    finishTime,
  };
}

export function getDefaultFormValues(
  initialData?: {
    maintenanceType?: string;
    building?: string;
    floor?: string;
    room?: string;
    equipment?: string;
    repeatBy?: string;
    repeatEndDate?: string;
    repeatEndTime?: string;
    plannedStartDate?: string;
    plannedStartTime?: string;
    plannedFinishDate?: string;
    plannedFinishTime?: string;
    priority?: string;
    severity?: string;
    description?: string;
    instructions?: string;
    technicians?: string;
    reject_reason?: string;
    other_alarm_codes?: string;
  },
  isSPVView = false
) {
  return {
    maintenanceType: initialData?.maintenanceType || '',
    building: initialData?.building || '',
    floor: initialData?.floor || '',
    room: initialData?.room || '',
    equipment: initialData?.equipment || '',
    repeatBy: initialData?.repeatBy || '',
    repeatEndDate: initialData?.repeatEndDate || '',
    repeatEndTime: initialData?.repeatEndTime || '',
    plannedStartDate: initialData?.plannedStartDate || '',
    plannedStartTime: initialData?.plannedStartTime || '',
    plannedFinishDate: initialData?.plannedFinishDate || '',
    plannedFinishTime: initialData?.plannedFinishTime || '',
    priority: initialData?.priority || '',
    severity: initialData?.severity || '',
    description: initialData?.description || '',
    instructions: initialData?.instructions || '',
    technicians: initialData?.technicians || '',
    reject_reason: initialData?.reject_reason || '',
    otherIssues: initialData?.other_alarm_codes || '',
    spv_view: isSPVView,
    is_recurring: false,
  };
}
