import { z } from 'zod';

export const licenseSchema = z.object({
  key: z.string(),
  name: z.string(),
  type: z.string(),
  total: z.number(),
  used: z.number(),
  is_active: z.boolean(),
  status_message: z.string(),
  description: z.string().nullable(),
  expired_at: z.number().nullable(),
});

export type LicenseType = z.infer<typeof licenseSchema>;

export const licenseContentSchema = z.object({
  key: z.string(),
  type: z.string(),
  description: z.string(),
  asset_keys: z.string().array(),
  expired_at: z.number(),
});

export type LicenseContentType = z.infer<typeof licenseContentSchema>;

export const verifyLicenseFileFormSchema = z.object({
  license_file: z.custom<File>(
    (file) => file instanceof File,
    'common.err_select_license_file'
  ),
});

export type VerifyLicenseFileFormType = z.infer<
  typeof verifyLicenseFileFormSchema
>;

export const uploadLicenseFileFormSchema = verifyLicenseFileFormSchema.extend({
  license_name: z.string(),
});

export type UploadLicenseFileFormType = z.infer<
  typeof uploadLicenseFileFormSchema
>;

export const updateLicenseFormSchema = uploadLicenseFileFormSchema.extend({
  license_key: z.string(),
  license_file: z.instanceof(File).nullable().optional(),
});

export type UpdateLicenseFormType = z.infer<typeof updateLicenseFormSchema>;

export const equipmentSchema = z.object({
  id: z.number().int().positive(),
  alias: z.string(),
  name: z.string(),
});
export const licenseInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  total: z.number().int().nonnegative(),
  used: equipmentSchema.array(),
  is_active: z.boolean(),
  status_message: z.string(),
  description: z.string().nullable(),
  expired_at: z.number().nullable(),
});
