import { z } from 'zod';

export const modelParameterDTSchema = z.union([
  z.literal('string'),
  z.literal('number'),
  z.literal('boolean'),
]);

export const masterDataEntrySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

export type MasterDataEntryType = z.infer<typeof masterDataEntrySchema>;

export const baseModelEntrySchema = masterDataEntrySchema.extend({
  type_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_type'),
  brand_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_brand'),
  series_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_series'),
});

export type BaseModelEntryType = z.infer<typeof baseModelEntrySchema>;

export const modelParameterTypeEntrySchema = masterDataEntrySchema.extend({
  data_type: modelParameterDTSchema.nullable(),
  unit: z.string().nullable(),
});

export type ModelParameterTypeEntryType = z.infer<
  typeof modelParameterTypeEntrySchema
>;

export const modelEntrySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  brand: z.string(),
  series: z.string(),
  base_model: z.string().nullable(),
  equipment_counts: z.number().int().nonnegative(),
});

export type ModelEntryType = z.infer<typeof modelEntrySchema>;

export const modelListSchema = z.object({
  total: z.number().int().nonnegative(),
  entries: modelEntrySchema.array(),
});
export const addModelFormSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  type_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_type'),
  brand_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_brand'),
  series_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_series'),
  base_model_id: z
    .number()
    .int()
    .nullable()
    .optional()
    .refine((id) => id == null || id > 0, 'common.err_invalid_base_model'),
});

export type AddModelFormType = z.infer<typeof addModelFormSchema>;

export const modelInformationSchema = addModelFormSchema.extend({
  id: z.number().int().positive(),
});

export type ModelInformationType = z.infer<typeof modelInformationSchema>;

export const equipmentConnectionEntrySchema = z.object({
  alias: z.string(),
  name: z.string(),
  license_type: z.string().nullable(),
  license_is_active: z.boolean().nullable(),
  license_status: z.string().nullable(),
  mapped_params: z.number().int().nonnegative(),
});

export type EquipmentConnectionEntryType = z.infer<
  typeof equipmentConnectionEntrySchema
>;

export const modelParameterSchema = z.object({
  alias: z.string(),
  name: z.string(),
  unit: z.string(),
  data_type: modelParameterDTSchema,
  scale: z.number().nullable(),
  gain_id: z.optional(z.number().positive()),
  model_parameter_type_id: z.optional(z.number().positive()),
});

export type ModelParameterType = z.infer<typeof modelParameterSchema>;

export const upsertModelParameterFormSchema = modelParameterSchema.extend({
  model_id: z.number().positive(),
});

export type UpsertModelParameterFormType = z.infer<
  typeof upsertModelParameterFormSchema
>;

export const modelStatusDefinitionSchema = z.object({
  is_extended: z.boolean(),
  unplanned_down_script: z.string().nullable(),
  planned_down_script: z.string().nullable(),
  running_script: z.string().nullable(),
  base_unplanned_down_script: z.string().nullable(),
  base_planned_down_script: z.string().nullable(),
  base_running_script: z.string().nullable(),
});

export type ModelStatusDefinitionType = z.infer<
  typeof modelStatusDefinitionSchema
>;

const scriptSchema = z.object({
  is_overriden: z.boolean(),
  script: z.string().nullable(),
});

export const setModelStatusDefinitionFormSchema = z.object({
  model_id: z.number().positive(),
  is_extended: z.boolean(),
  unplanned_down: scriptSchema,
  planned_down: scriptSchema,
  running: scriptSchema,
});

export type SetModelStatusDefinitionFormType = z.infer<
  typeof setModelStatusDefinitionFormSchema
>;

const modelAlarmBaseSchema = z.object({
  model_id: z.number().int().positive(),
  name: z.string().min(1),
  criticality: z.number().int().positive(),
  issue_category_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_category'),
  issue_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_issue'),
  message: z.string(),
  script: z.string().nullable(),
});

export const modelAlarmEntrySchema = modelAlarmBaseSchema.extend({
  alarm_id: z.number().int().positive(),
  is_disabled: z.boolean(),
  base_script: z.string().nullable(),
});

export type ModelAlarmEntryType = z.infer<typeof modelAlarmEntrySchema>;

export const addModelAlarmFormSchema = modelAlarmBaseSchema;

export type AddModelAlarmFormType = z.infer<typeof addModelAlarmFormSchema>;

export const updateModelAlarmFormSchema = modelAlarmBaseSchema.extend({
  alarm_id: z.number().int().positive(),
  is_extended: z.boolean(),
  script: scriptSchema,
});

export type UpdateModelAlarmFormType = z.infer<
  typeof updateModelAlarmFormSchema
>;

export const testFormSchema = z.object({
  model_id: z.number().int().positive(),
  values: z.record(
    z.object({
      v: z.union([z.number(), z.string(), z.boolean()]),
      q: z.boolean(),
      unit: z.string().nullable().optional(),
    })
  ),
});

export type TestFormType = z.infer<typeof testFormSchema>;

export const testResultSchema = z.object({
  status: z.number().int().positive(),
  alarms: z.array(
    z.object({
      name: z.string(),
      criticality: z.number().int().positive(),
      message: z.string(),
    })
  ),
  dynamic_alarms: z.array(
    z.object({
      name: z.string(),
      alarm_name: z.string(),
      criticality: z.number().int().positive(),
      issue_category: z.string().optional(),
      issue: z.string().optional(),
      message: z.string(),
    })
  ),
});

export type TestResultType = z.infer<typeof testResultSchema>;

export const modelAlarmCsvRowSchema = z.object({
  name: z.string().min(1),
  criticality: z.union([z.literal('warning'), z.literal('critical')]),
  // issue_category: z.string().min(1),
  // issue: z.string().min(1),
  message: z.string().min(1),
  script: z.string().min(1),
});

export type ModelAlarmCsvRowType = z.infer<typeof modelAlarmCsvRowSchema>;

export const modelAlarmCsvRowEmSchema = modelAlarmCsvRowSchema.omit({
  // issue_category: true,
  // issue: true,
});

export const importModelAlarmsFormSchema = z.object({
  model_id: z.number().int().positive(),
  alarms: modelAlarmCsvRowSchema.array(),
});

export type ImportModelAlarmsFormType = z.infer<
  typeof importModelAlarmsFormSchema
>;

export const importModelAlarmsFormEmSchema = z.object({
  model_id: z.number().int().positive(),
  alarms: modelAlarmCsvRowEmSchema.array(),
});

export type ImportModelAlarmsFormEmType = z.infer<
  typeof importModelAlarmsFormEmSchema
>;

const modelDynamicAlarmBaseSchema = z.object({
  model_id: z.number().int().positive(),
  name: z.string().min(1),
  script: z.string().nullable(),
});

export const modelDynamicAlarmEntrySchema = modelDynamicAlarmBaseSchema.extend({
  alarm_id: z.number().int().positive(),
  is_disabled: z.boolean(),
  base_script: z.string().nullable(),
});

export type ModelDynamicAlarmEntryType = z.infer<
  typeof modelDynamicAlarmEntrySchema
>;

export const addModelDynamicAlarmFormSchema = modelDynamicAlarmBaseSchema;

export type AddModelDynamicAlarmFormType = z.infer<
  typeof addModelDynamicAlarmFormSchema
>;

export const updateModelDynamicAlarmFormSchema =
  modelDynamicAlarmBaseSchema.extend({
    alarm_id: z.number().int().positive(),
    is_extended: z.boolean(),
    script: scriptSchema,
  });

export type UpdateModelDynamicAlarmFormType = z.infer<
  typeof updateModelDynamicAlarmFormSchema
>;

export const modelDynamicAlarmCsvRowSchema = z.object({
  name: z.string().min(1),
  script: z.string().min(1),
});

export type ModelDynamicAlarmCsvRowType = z.infer<
  typeof modelDynamicAlarmCsvRowSchema
>;

export const importModelDynamicAlarmsFormSchema = z.object({
  model_id: z.number().int().positive(),
  alarms: modelDynamicAlarmCsvRowSchema.array(),
});

export type ImportModelDynamicAlarmsFormType = z.infer<
  typeof importModelDynamicAlarmsFormSchema
>;

export const modelParameterCsvRowSchema = z.object({
  variable_name: z.string().min(1),
  display_name: z.string().min(1),
  unit: z.string(),
  data_type: modelParameterDTSchema,
  decimals: z.string(),
});

export type ModelParameterCsvRowType = z.infer<
  typeof modelParameterCsvRowSchema
>;

export const modelParameterCsvRowEmSchema = modelParameterCsvRowSchema.extend({
  prefix: z.string(),
  parameter_type: z.string(),
});

export const importModelParametersFormSchema = z.object({
  model_id: z.number().int().positive(),
  parameters: modelParameterCsvRowSchema.array(),
});

export type ImportModelParametersFormType = z.infer<
  typeof importModelParametersFormSchema
>;

export const importModelParametersFormEmSchema = z.object({
  model_id: z.number().int().positive(),
  parameters: modelParameterCsvRowEmSchema.array(),
});

export type ImportModelParametersFormEmType = z.infer<
  typeof importModelParametersFormEmSchema
>;

export const modelRunningHourLimitSchema = z
  .object({
    warningHour: z.number().int().nonnegative(),
    criticalHour: z.number().int().nonnegative(),
    isNotifyWarning: z.boolean(),
    isNotifyCritical: z.boolean(),
    isAutoCreateMaintenance: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // If warning is enabled, hour must be greater than 0
    if (data.isNotifyWarning && data.warningHour === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Warning hour must be greater than 0 when notifications are enabled",
        path: ["warningHour"],
      });
    }

    // If critical is enabled, hour must be greater than 0
    if ((data.isNotifyCritical || data.isAutoCreateMaintenance) && data.criticalHour === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Critical hour must be greater than 0 when notifications are enabled",
        path: ["criticalHour"],
      });
    }
  });

export type ModelRunningHourLimitType = z.infer<typeof modelRunningHourLimitSchema>