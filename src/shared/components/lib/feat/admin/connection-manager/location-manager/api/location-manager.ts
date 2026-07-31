import { jsRequest, t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { z } from 'zod';

export const locationDetails = z
  .object({
    id: z.number(),
    locationName: z.string(),
    parentId: z.number().nullable(),
    parentLocation: z.string().nullable(),
    locationImagePath: z.string().nullable(),
    availabilityTh: z.number().optional(),
    performanceTh: z.number().optional(),
    qualityTh: z.number().optional(),
    currencyId: z.string().optional(),
    timezone: z.string().optional(),
    energyTh: z.number().optional(),
    carbonTh: z.number().optional(),
    costTh: z.number().optional(),
  })
  .nullable();

export const locationFormAddSchema = z.object({
  parentLocation: z.string().nullable(),
  locationName: z
    .string()
    .refine((value) => value, t('common.location_name_is_required'))
    .refine(
      (value) => value.length > 3,
      t('common.location_name_must_be_at_least_characters', '4')
    ),
  locationImage: z
    .custom<File>()
    .refine((file) => {
      if (file) return true;
    }, t('common.location_image_is_required'))
    .refine((file) => {
      if (file) return file.size < 4 * 1024 * 1024;
    }, t('common.file_size_is_too_large_maximum_size_is', '4')),
  availabilityTh: z
    .number()
    .min(0, t('common.availability_must_be_between', '0', '100'))
    .max(100, t('common.availability_must_be_between', '0', '100'))
    .optional(),
  performanceTh: z
    .number()
    .min(0, t('common.performance_must_be_between', '0', '100'))
    .max(100, t('common.performance_must_be_between', '0', '100'))
    .optional(),
  qualityTh: z
    .number()
    .min(0, t('common.quality_must_be_between', '0', '100'))
    .max(100, t('common.quality_must_be_between', '0', '100'))
    .optional(),
  energyTh: z
    .number()
    .min(0, t('common.energy_threshold_must_be_between', '0', '100'))
    .optional(),
  carbonTh: z
    .number()
    .min(0, t('common.carbon_threshold_must_be_between', '0', '100'))
    .optional(),
  costTh: z
    .number()
    .min(0, t('common.cost_threshold_must_be_between', '0', '100'))
    .optional(),
  timezone: z
    .string()
    .optional()
    .refine((value) => value !== '-2', t('common.timezone_is_required')),
  currencyId: z
    .string()
    .optional()
    .refine((value) => value !== '-2', t('common.currency_is_required')),
});

export const locationFormEditSchema = z.object({
  id: z.number(),
  parentId: z.number().nullable(),
  parentLocation: z.string().nullable(),
  locationName: z
    .string()
    .refine((value) => value, t('common.location_name_is_required'))
    .refine(
      (value) => value.length > 3,
      t('common.location_name_must_be_at_least_characters', '4')
    ),
  locationImage: z
    .custom<File>()
    .optional()
    .refine((file) => {
      return file === undefined ? true : file.size < 4 * 1024 * 1024;
    }, t('common.file_size_is_too_large')),
  availabilityTh: z
    .number()
    .min(0, t('common.availability_must_be_between', '0', '100'))
    .max(100, t('common.availability_must_be_between', '0', '100'))
    .optional(),
  performanceTh: z
    .number()
    .min(0, t('common.performance_must_be_between', '0', '100'))
    .max(100, t('common.performance_must_be_between', '0', '100'))
    .optional(),
  qualityTh: z
    .number()
    .min(0, t('common.quality_must_be_between', '0', '100'))
    .max(100, t('common.quality_must_be_between', '0', '100'))
    .optional(),
  energyTh: z
    .number()
    .min(0, t('common.energy_threshold_must_be_between', '0', '100'))
    .optional(),
  carbonTh: z
    .number()
    .min(0, t('common.carbon_threshold_must_be_between', '0', '100'))
    .optional(),
  costTh: z
    .number()
    .min(0, t('common.cost_threshold_must_be_between', '0', '100'))
    .optional(),
  timezone: z.string().optional(),
  currencyId: z.string().optional(),
});

export const qrSchema = z.object({
  value: z.string(),
  firstField: z.object({
    name: z.string(),
    value: z.string(),
    excluded: z.boolean(),
  }),
  secondField: z.object({
    name: z.string(),
    value: z.string(),
    excluded: z.boolean(),
  }),
  thirdField: z.object({
    name: z.string(),
    value: z.string(),
    excluded: z.boolean(),
  }),
  fourthField: z.object({
    name: z.string(),
    value: z.string(),
    excluded: z.boolean(),
  }),
  fifthField: z.object({
    name: z.string(),
    value: z.string(),
    excluded: z.boolean(),
  }),
});

export const currencyListSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export type TreeNode = {
  id: number;
  name: string;
  childs?: TreeNode[];
};

export type LocationFormAddType = z.infer<typeof locationFormAddSchema>;
export type LocationFormEditType = z.infer<typeof locationFormEditSchema>;
export type LocationDetailsType = z.infer<typeof locationDetails>;
export type UpdateParentInput = {
  locationId: number;
  targetParentId: number | null;
};
export type QRType = z.infer<typeof qrSchema>;

type TGetLocationTree = {
  searchFilter: string | null;
  locationId: number | null;
};

export const getLocationTree = async ({
  searchFilter,
  locationId,
}: TGetLocationTree): Promise<TreeNode[] | null> => {
  const data = await jsRequest({
    url: `/location/getlocationtreebyfilter`,
    data: {
      search_filter: searchFilter,
      excluded_id: null,
      username: localStorage.getItem('digital-twin-username'),
      selected_location: locationId === -1 ? null : locationId,
    },
  });

  return data.map((item: { build_location_tree: string }) =>
    JSON.parse(item.build_location_tree)
  );
};

export const getLocationTreeDel = async ({
  searchFilter,
  locationId,
}: TGetLocationTree): Promise<TreeNode[] | null> => {
  const data = await jsRequest({
    url: `/location/getlocationtreebyfilterdel`,
    data: {
      search_filter: searchFilter,
      excluded_id: null,
      username: localStorage.getItem('digital-twin-username'),
      selected_location: locationId === -1 ? null : locationId,
    },
  });

  return data.map((item: { build_location_tree: string }) =>
    JSON.parse(item.build_location_tree)
  );
};

type TGetGeneratedQRInformation = {
  locationIds: string | null;
  assetIds: string | null;
};

export const getGeneratedQRInformation = async ({
  locationIds,
  assetIds,
}: TGetGeneratedQRInformation): Promise<QRType[][] | null> => {
  const data = await jsRequest({
    url: `/location/getgeneratedqrinformation`,
    data: {
      location_ids: locationIds,
      asset_ids: assetIds,
    },
  });

  return z.array(z.array(qrSchema)).parse(data);
};

type TGetLocationDetails = {
  location_id: number | null;
};

export const getLocationDetails = async ({
  location_id,
}: TGetLocationDetails): Promise<LocationDetailsType | null> => {
  const data = await jsRequest({
    url: `/location/getlocationdetailsbyid`,
    data: {
      location_id,
    },
  });

  return locationDetails.parse(data);
};

type TDeleteLocation = {
  location_id: number;
};

export const deleteLocation = async ({
  location_id,
}: TDeleteLocation): Promise<void> => {
  return await jsRequest({
    url: `/location/deletelocation`,
    data: { location_id },
  });
};

type TAddLocation = {
  name: string;
  parentId: number | null;
  locationImage: File;
  qualityTh?: number | null;
  performanceTh?: number | null;
  availabilityTh?: number | null;
  currencyId?: string | null;
  timezone?: string | null;
  energyTh?: number | null;
  carbonTh?: number | null;
  costTh?: number | null;
};

export const addNewLocation = async ({
  name,
  parentId,
  locationImage,
  qualityTh,
  performanceTh,
  availabilityTh,
  currencyId,
  timezone,
  energyTh,
  carbonTh,
  costTh,
}: TAddLocation): Promise<void> => {
  return await jsRequest({
    url: `/location/insertnewlocation`,
    data: {
      quality_th: qualityTh,
      performance_th: performanceTh,
      parent_id: parentId,
      name: name,
      availability_th: availabilityTh,
      location_image: locationImage,
      currency_id: parseInt(currencyId!),
      timezone,
      energy_th: energyTh,
      carbon_th: carbonTh,
      cost_th: costTh,
    },
  });
};

type TUpdateLocationParentID = {
  locationId: number;
  parentId: number | null;
};

export const updateLocationParentID = async ({
  locationId,
  parentId,
}: TUpdateLocationParentID): Promise<void> => {
  return await jsRequest({
    url: `/location/updatelocationparentid`,
    data: { location_id: locationId, parent_id: parentId },
  });
};

type TUpdateLocation = {
  id: number;
  name: string;
  parentId: number | null;
  locationImage: File | null;
  performanceTh?: number | null;
  avalabilityTh?: number | null;
  qualityTh?: number | null;
  currencyId?: string | null;
  timezone?: string | null;
  energyTh?: number | null;
  carbonTh?: number | null;
  costTh?: number | null;
};

export const updateLocation = async ({
  id,
  name,
  parentId,
  locationImage,
  performanceTh,
  avalabilityTh,
  qualityTh,
  currencyId,
  timezone,
  energyTh,
  carbonTh,
  costTh,
}: TUpdateLocation): Promise<void> => {
  return await jsRequest({
    url: `/location/updatelocation`,
    data: {
      location_id: id,
      name,
      parent_id: parentId,
      location_image: locationImage,
      performance_th: performanceTh,
      availability_th: avalabilityTh,
      quality_th: qualityTh,
      currency_id: parseInt(currencyId!),
      timezone,
      energy_th: energyTh,
      carbon_th: carbonTh,
      cost_th: costTh,
    },
  });
};

export const fileToBase64 = (
  file: File,
  callback: (base64String: string) => void
) => {
  const reader = new FileReader();

  reader.onload = () => {
    if (reader.result) {
      const base64String = reader.result.toString().split(',')[1];
      callback(base64String || '');
    }
  };

  reader.onerror = (error) => {
    toast.error(error.toString());
    callback('');
  };

  reader.readAsDataURL(file);
};
