import { z } from 'zod';

export const alarmSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  map: z.boolean(),
});
export type alarmType = z.infer<typeof alarmSchema>;

export const parameterSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export type parameterType = z.infer<typeof parameterSchema>;

export const mappingSchema = z.object({
  model: z.number(),
  alarm: z.number(),
  parameter: z.array(z.number()),
});
export type mappingType = z.infer<typeof mappingSchema>;
