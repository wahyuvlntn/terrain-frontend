import { AlarmEnum } from '@digital-twin/components';
import { z } from 'zod';

export const alarmSchema = z.object({
  severity: AlarmEnum,
  message: z.string(),
  timestamp: z.string().datetime(),
});

export type Alarm = z.infer<typeof alarmSchema>;
