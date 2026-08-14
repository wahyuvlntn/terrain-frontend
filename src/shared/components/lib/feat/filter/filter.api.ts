import { dbRequest, jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const assetSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const technicianSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// const selectedFilterSchema = z.object({
//   data: z.array(
//     z.object({
//       id: z.number().nullable(),
//       name: z.string(),
//     })
//   ),
//   type: z.union([
//     z.literal('location'),
//     z.literal('asset'),
//     z.literal('type'),
//     z.literal('model'),
//     z.literal('brand'),
//     z.literal('series'),
//     z.literal('source'),
//     z.literal('distribution'),
//     z.literal('load'),
//   ]),
// });

// const getSelectedFilterNameSchema = z.array(selectedFilterSchema);

//TODO: remove this since it's not used anywhere
// export type TGetSelectedFilterName = z.infer<
//   typeof getSelectedFilterNameSchema
// >;

const getAllLocationsAndAssetsSchema = z
  .object({
    id: z.number(),
    parentId: z.number().nullable(),
    name: z.string(),
    assets: z.array(assetSchema),
  })
  .array();

export type TGetAllLocationsAndAssets = z.infer<
  typeof getAllLocationsAndAssetsSchema
>;

// type TGetSelectedFilterNameParams = {
//   locationIds: number[] | null;
//   assetIds: number[];
//   typeIds: number[] | null;
//   modelIds: number[] | null;
//   brandIds: number[] | null;
//   seriesIds: number[] | null;
// };
//TODO: remove this since it's not used anywhere
// export const getSelectedFilterName = async ({
//   assetIds,
//   brandIds,
//   locationIds,
//   modelIds,
//   seriesIds,
//   typeIds,
// }: TGetSelectedFilterNameParams) => {
//   const data = await jsRequest({
//     url: `/filter/getfilternames`,
//     data: {
//       location_ids: locationIds ? locationIds.join(',') : null,
//       asset_ids: assetIds.join(','),
//       type_ids: typeIds ? typeIds.join(',') : null,
//       model_ids: modelIds ? modelIds.join(',') : null,
//       brand_ids: brandIds ? brandIds.join(',') : null,
//       series_ids: seriesIds ? seriesIds.join(',') : null,
//     },
//   });
//
//   return getSelectedFilterNameSchema.parse(
//     data.map((item: { data: unknown; type: unknown }) => ({
//       data: item.data,
//       type: item.type,
//     }))
//   );
// };

export const getAllLocationsAndAssets = async () => {
  const data = await jsRequest({
    url: `/filter/getalllocationsandassets`,
  });

  return getAllLocationsAndAssetsSchema.parse(
    data.map(
      (item: {
        id: unknown;
        parent_id: unknown;
        name: unknown;
        assets: unknown;
      }) => ({
        id: item.id,
        parentId: item.parent_id,
        name: item.name,
        assets: item.assets,
      })
    )
  );
};

//TODO: remove this since it's not used anywhere
// export const getAllTypes = async () => {
//   const data = await dbRequest({
//     url: `/filter/getalltypes`,
//     dbType: 'business',
//   });
//
//   return z.array(assetSchema).parse(data);
// };

export const getAllModels = async () => {
  const data = await dbRequest({
    url: `/filter/getallmodels`,
    dbType: 'business',
  });

  return z.array(assetSchema).parse(data);
};

export const getAllSeverities = async () => {
  const data = await dbRequest({
    url: `/filter/GetAllSeverities`,
    dbType: 'business',
  });

  return z.array(assetSchema).parse(data);
};

export const getAllPriorities = async () => {
  const data = await dbRequest({
    url: `/filter/GetAllPriorities`,
    dbType: 'business',
  });

  return z.array(assetSchema).parse(data);
};

export const getAllMaintenanceTypes = async () => {
  const data = await dbRequest({
    url: `/filter/GetAllMaintenanceTypes`,
    dbType: 'business',
  });

  return z.array(assetSchema).parse(data);
};

export const getAllBrands = async () => {
  const data = await dbRequest({
    url: `/filter/getallbrands`,
    dbType: 'business',
  });

  return z.array(assetSchema).parse(data);
};

export const getAllSeries = async () => {
  const data = await dbRequest({
    url: `/filter/getallseries`,
    dbType: 'business',
  });

  return z.array(assetSchema).parse(data);
};

export const getAllTechnicians = () =>
  jsRequest({
    url: '/filter/GetAllTechnicians',
  }).then((data) => z.array(technicianSchema).parse(data));

export const getSeverityNames = (ids: number[]) =>
  jsRequest({
    url: '/filter/GetSeverityNames',
    data: {
      ids: ids.join(','),
    },
  }).then((data) => z.string().array().parse(data));

export const getPriorityNames = (ids: number[]) =>
  jsRequest({
    url: '/filter/GetPriorityNames',
    data: {
      ids: ids.join(','),
    },
  }).then((data) => z.string().array().parse(data));

export const getMaintenanceTypeNames = (ids: number[]) =>
  jsRequest({
    url: '/filter/GetMaintenanceTypeNames',
    data: {
      ids: ids.join(','),
    },
  }).then((data) => z.string().array().parse(data));

export const getTechnicianNames = (usernames: string[]) =>
  jsRequest({
    url: '/filter/GetTechnicianNames',
    data: {
      usernames: usernames.join(','),
    },
  }).then((data) => z.string().array().parse(data));

export const getModelNames = (ids: number[]) =>
  jsRequest({
    url: '/filter/getmodelnames',
    data: {
      ids: ids.join(','),
    },
  }).then((data) => z.string().array().parse(data));
export const getBrandNames = (ids: number[]) =>
  jsRequest({
    url: '/filter/getbrandnames',
    data: {
      ids: ids.join(','),
    },
  }).then((data) => z.string().array().parse(data));
export const getSeriesNames = (ids: number[]) =>
  jsRequest({
    url: '/filter/getseriesnames',
    data: {
      ids: ids.join(','),
    },
  }).then((data) => z.string().array().parse(data));

const getLocationAssetNamesSchema = z.object({
  isLocation: z.boolean(),
  data: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .array(),
});
export type TGetLocationAssetNames = z.infer<
  typeof getLocationAssetNamesSchema
>;

export const getLocationAssetNames = (
  locationIds: number[] | null,
  assetIds: number[]
) =>
  jsRequest({
    url: '/filter/getlocationassetnames',
    data: {
      location_ids: locationIds === null ? null : locationIds.join(','),
      asset_ids: assetIds.join(','),
    },
  }).then((data) =>
    z.array(getLocationAssetNamesSchema).parse(
      data.map((item: { is_location: boolean }) => ({
        ...item,
        isLocation: item.is_location,
      }))
    )
  );
