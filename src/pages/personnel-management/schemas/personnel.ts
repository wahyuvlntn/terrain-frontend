import { z } from 'zod';

export const personnelListFilterSchema = z.object({
  buildingIds: z.string().array().nullable(),
  equipmentTypeIds: z.string().array().nullable(),
  capacityIds: z.string().array().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  search: z.string(),
  page: z.number(),
  limit: z.number(),
});

export type PersonnelListFilterType = z.infer<typeof personnelListFilterSchema>;

export const personnelEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullish(),
  assignedBuildings: z.string().nullish(),
  assignedEquipmentTypes: z.string().nullish(),
  currentMaintenanceOrder: z.string().nullish(),
  capacityPercentage: z.number().nullish(),
  isDeleted: z.boolean(),
});

export type PersonnelEntry = z.infer<typeof personnelEntrySchema>;

export const personnelListSchema = z.object({
  total: z.number(),
  entries: personnelEntrySchema.array(),
});

export type PersonnelList = z.infer<typeof personnelListSchema>;

export const personnelDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  assignedBuildingIds: z.string().array(),
  assignedEquipmentTypeIds: z.string().array(),
  currentMaintenanceOrder: z.string().nullish(),
  createdAt: z.number(),
  updatedAt: z.number().nullish(),
  isDeleted: z.boolean(),
});

export type PersonnelDetails = z.infer<typeof personnelDetailsSchema>;

export const updatePersonnelDetailsFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  assignedBuildingIds: z.string().array(),
  assignedEquipmentTypeIds: z.string().array(),
});

export type UpdatePersonnelDetailsFormType = z.infer<typeof updatePersonnelDetailsFormSchema>;
