import { z } from 'zod';

export const issueRelationSchema = z.object({
  id: z.string(),
  name: z.string(),
  model_id: z
    .number()
    .int()
    .refine((id) => id > 0),
  model_name: z.string(),
});
export type issueRelationType = z.infer<typeof issueRelationSchema>;

export const alarmSchema = z.object({
  id: z.number().optional(),
  code: z.string(),
  name: z.string(),
});
export type alarmType = z.infer<typeof alarmSchema>;

export const parameterSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
});
export type parameterType = z.infer<typeof parameterSchema>;

export const sourceMappingSchema = z
  .object({
    type: z.literal('alarm'),
    meta: alarmSchema,
  })
  .or(
    z.object({
      type: z.literal('parameter'),
      meta: parameterSchema,
    })
  );
export type sourceMappingType = z.infer<typeof sourceMappingSchema>;

export const relationMappingSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  source_alarm_code: z.string(), // comma separated int
  target_alarm_code: z.string(), // comma separated string
  source_parameter: z.string(),
});
export type relationMappingType = z.infer<typeof relationMappingSchema>;

export const mappingSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      position: z
        .object({
          x: z.number(),
          y: z.number(),
        })
        .optional(),
      data: z.object({
        code: z.string().optional(),
        name: z.string().optional(),
      }),
      type: z.string().nullish(),
    })
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      type: z.string().nullish(),
    })
  ),
});
export type mappingType = z.infer<typeof mappingSchema>;
