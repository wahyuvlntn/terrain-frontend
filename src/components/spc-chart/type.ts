import { markAreaSchema, timeSeriesDataPoint } from '@digital-twin/components';
import { z } from 'zod';

export const spcMetricSchema = z.object({
  grandMean: z.union([z.number(), z.literal('-')]),
  stdDev: z.union([z.number(), z.literal('-')]),
  cp: z.union([z.number(), z.literal('-')]),
  cpk: z.union([z.number(), z.literal('-')]),
  ucl: z.union([z.number(), z.literal('-')]),
  lcl: z.union([z.number(), z.literal('-')]),
  lsl: z.union([z.number(), z.literal('-')]),
  usl: z.union([z.number(), z.literal('-')]),
});

export const spcDataSchema = z.object({
  metrics: spcMetricSchema.nullable(),
  data: z.array(timeSeriesDataPoint),
  yMin: z.number().nullable(),
  yMax: z.number().nullable(),
  markArea: z.array(
    markAreaSchema.extend({
      start: z.string().datetime().optional(),
      end: z.string().datetime().nullable().optional(),
    })
  ),
  offlineRanges: z
    .array(
      z.object({
        start: z.number(),
        end: z.number(),
      })
    )
    .optional(),
});

export type TSpcData = z.infer<typeof spcDataSchema>;
