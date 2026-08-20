import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const alarmCodeSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export type TAlarmCode = z.infer<typeof alarmCodeSchema>;

export const getAlarmCodes = async () => {
  const data = await jsRequest({
    url: '/maintenance_instruction/get_alarm_codes',
  });
  return alarmCodeSchema.array().parse(data);
};
