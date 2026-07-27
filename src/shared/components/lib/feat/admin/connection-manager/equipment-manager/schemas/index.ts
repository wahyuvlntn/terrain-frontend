import { z } from 'zod';

export const masterDataEntrySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

export const masterDataChildEntrySchema = masterDataEntrySchema.extend({
  category_id: z.number().int().positive(),
});

export const equipmentEntrySchema = z.object({
  id: z.number().int().positive(),
  alias: z.string(),
  name: z.string(),
  image_path: z.string().nullable(),
  model_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  license_id: z.number().int().positive().nullable(),
  power_meter_type_id: z.optional(z.number()),
  source_type_id: z.optional(z.number()),
});

export type EquipmentEntryType = z.infer<typeof equipmentEntrySchema>;

export const normalizedEquipmentEntrySchema = equipmentEntrySchema.extend({
  model: z.string(),
  type: z.string(),
  brand: z.string(),
  series: z.string(),
  l_active: z.boolean(),
  l_status: z.string(),
});

export type NormalizedEquipmentEntryType = z.infer<
  typeof normalizedEquipmentEntrySchema
>;

export const equipmentInfoSchema = z.object({
  alias: z.string(),
  name: z.string(),
  image_path: z.string().nullable(),
  model_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.invalid_model'),
  created_at: z.number().int().positive(),
  location_id: z.number().int().positive(),
  license_id: z
    .number()
    .int()
    .nullable()
    .refine((id) => id == null || id > 0, 'common.invalid_license'),
  is_utility: z.boolean(),
});

//TODO: remove this since it's not used anywhere
// export type EquipmentInfoType = z.infer<typeof equipmentInfoSchema>;

export const rateLimitPercentageSchema = z.object({
  cost_type_id: z.number(),
  value: z.union([z.number(), z.string()]).nullable(),
});

export const equipmentInfoEmSchema = z.object({
  alias: z.string(),
  name: z.string(),
  image_path: z.string().nullable(),
  model_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.invalid_model'),
  installation_date: z.string(),
  location_id: z.number().int().positive(),
  license_id: z
    .number()
    .int()
    .nullable()
    .refine((id) => id == null || id > 0, 'common.invalid_license'),
  power_meter_type_id: z.number().int().positive(),
  source_type_id: z.number().int().positive(),
  usage_limit_use: z.boolean(),
  usage_limit_rate_kwh: z.number(),
  usage_limit_interval: z.string(),
  limit_notification_use: z.boolean(),
  limit_notification_warning_percentage: z.number(),
  limit_notification_critical_percentage: z.number(),
  rate_limit_use: z.boolean(),
  rate_limit_holiday_percentage: z.number(),
  rate_limit_percentages: rateLimitPercentageSchema.array(),
  not_calculate_efficiency: z.boolean(),
});

export const equipmentImageSchema = z.object({
  path: z.string().nullable().optional(),
  file: z
    .custom<File>((file) => file instanceof File)
    .nullable()
    .optional(),
});

export type EquipmentImageType = z.infer<typeof equipmentImageSchema>;

export const addEquipmentFormSchema = z.object({
  alias: z
    .string()
    .refine(
      (alias) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(alias),
      'common.id_only_contains_alphanumerics_underscores'
    ),
  name: z.string(),
  image: equipmentImageSchema,
  model_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_model'),
  created_at: z.number().int().positive(),
  location_id: z.number().int().positive(),
  license_id: z
    .number()
    .int()
    .nullable()
    .refine((id) => id == null || id > 0, 'common.err_invalid_license'),
  is_utility: z.boolean(),
});

export type AddEquipmentFormType = z.infer<typeof addEquipmentFormSchema>;

export const addEquipmentFormEmSchema = z.object({
  alias: z
    .string()
    .refine(
      (alias) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(alias),
      'common.id_only_contains_alphanumerics_underscores'
    ),
  name: z.string(),
  image: equipmentImageSchema,
  model_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_model'),
  installation_date: z.string(),
  location_id: z.number().int().positive(),
  license_id: z
    .number()
    .int()
    .nullable()
    .refine((id) => id == null || id > 0, 'common.err_invalid_license'),
  power_meter_type_id: z.number().int().positive(),
  source_type_id: z.number().int().positive(),
  usage_limit_use: z.boolean(),
  usage_limit_rate_kwh: z.number(),
  usage_limit_interval: z.string(),
  limit_notification_use: z.boolean(),
  limit_notification_warning_percentage: z.number(),
  limit_notification_critical_percentage: z.number(),
  rate_limit_use: z.boolean(),
  rate_limit_holiday_percentage: z.number(),
  rate_limit_percentages: rateLimitPercentageSchema.array(),
  not_calculate_efficiency: z.boolean(),
});

export type AddEquipmentFormEmType = z.infer<typeof addEquipmentFormEmSchema>;

export const updateEquipmentFormSchema = z.object({
  alias: z.string(),
  name: z.string(),
  image: equipmentImageSchema,
  model_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_model'),
  prev_model_id: z.number().int().positive(),
  created_at: z.number().int().positive(),
  location_id: z.number().int().positive(),
  license_id: z
    .number()
    .int()
    .nullable()
    .refine((id) => id == null || id > 0, 'common.err_invalid_license'),
  prev_license_id: z.number().int().positive().nullable(),
});

export type UpdateEquipmentFormType = z.infer<typeof updateEquipmentFormSchema>;

export const updateEquipmentFormEmSchema = z.object({
  alias: z.string(),
  name: z.string(),
  image: equipmentImageSchema,
  model_id: z
    .number()
    .int()
    .refine((id) => id > 0, 'common.err_invalid_model'),
  prev_model_id: z.number().int().positive(),
  installation_date: z.string(),
  location_id: z.number().int().positive(),
  license_id: z
    .number()
    .int()
    .nullable()
    .refine((id) => id == null || id > 0, 'common.err_invalid_license'),
  prev_license_id: z.number().int().positive().nullable(),
  power_meter_type_id: z.number().int().positive(),
  source_type_id: z.number().int().positive(),
  usage_limit_use: z.boolean(),
  usage_limit_rate_kwh: z.number(),
  usage_limit_interval: z.string(),
  limit_notification_use: z.boolean(),
  limit_notification_warning_percentage: z.number(),
  limit_notification_critical_percentage: z.number(),
  rate_limit_use: z.boolean(),
  rate_limit_holiday_percentage: z.number(),
  rate_limit_percentages: rateLimitPercentageSchema.array(),
  not_calculate_efficiency: z.boolean(),
});

export type UpdateEquipmentFormEmType = z.infer<
  typeof updateEquipmentFormEmSchema
>;

export const equipmentModelSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  type_id: z.number().int().positive(),
  type: z.string(),
  brand_id: z.number().int().positive(),
  brand: z.string(),
  series_id: z.number().int().positive(),
  series: z.string(),
});

export type EquipmentModelType = z.infer<typeof equipmentModelSchema>;

export const equipmentLicenseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  used: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
  l_active: z.boolean(),
  l_status: z.string(),
});

export type EquipmentLicenseType = z.infer<typeof equipmentLicenseSchema>;

const baseLocationNodeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

export type LocationNodeType = z.infer<typeof baseLocationNodeSchema> & {
  childs?: LocationNodeType[];
};

export const locationNodeSchema: z.ZodType<LocationNodeType> =
  baseLocationNodeSchema.extend({
    childs: z.lazy(() => z.array(locationNodeSchema)).optional(),
  });

export const equipmentParameterSchema = z.object({
  alias: z.string(),
  name: z.string(),
  unit: z.string(),
  gateway_alias: z.string().nullable(),
  tag: z.string().nullable(),
  is_logged: z.boolean(),
  is_displayed: z.boolean(),
  data_type: z.string(),
  scale: z.number().nullable(),
  gain_id: z.optional(z.number()),
  model_parameter_type_id: z.optional(z.number()),
});

export type EquipmentParameterType = z.infer<typeof equipmentParameterSchema>;

export const vtqcSchema = z.object({
  v: z.string(),
  t: z.number().int().nonnegative(),
  q: z.number().int(),
  c: z.number().int(),
});
export const vtqcsSchema = z.record(vtqcSchema);
export const parameterMappingSchema = z.object({
  gateway_alias: z.string().nullable(),
  tag: z.string().nullable(),
  is_logged: z.boolean(),
  is_displayed: z.boolean(),
  gain_id: z.optional(z.number()),
});

export type ParameterMappingType = z.infer<typeof parameterMappingSchema>;

export const updateParameterMappingFormSchema = z.object({
  alias: z.string(),
  mappings: z.record(parameterMappingSchema),
});

export type UpdateParameterMappingFormType = z.infer<
  typeof updateParameterMappingFormSchema
>;

export const gatewayEntrySchema = z.object({
  alias: z.string(),
  name: z.string(),
  protocol_alias: z.string(),
  protocol_name: z.string(),
  status: z.boolean().nullable(),
});

export type GatewayEntryType = z.infer<typeof gatewayEntrySchema>;

export const gatewayTagEntrySchema = z.object({
  name: z.string(),
  address: z.string().nullable(),
  description: z.string().nullable(),
});

export const parameterMappingCsvRowSchema = z.object({
  parameter: z.string().min(1),
  data_source: z.string(),
  tag: z.string(),
  view: z.string(),
  log: z.string(),
  prefix: z.optional(z.string()),
});

export const normalizedParameterMappingCsvRowSchema = z.object({
  parameter_alias: z.string().min(1),
  gateway_alias: z.string().nullable(),
  gateway_name: z.string().nullable(),
  tag: z.string().nullable(),
  is_displayed: z.boolean(),
  is_logged: z.boolean(),
  prefix: z.optional(z.string()),
});

export type NormalizedParameterMappingCsvRowType = z.infer<
  typeof normalizedParameterMappingCsvRowSchema
>;
