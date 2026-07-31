import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const assetDetailsSchema = z.object({
  assetId: z.number(),
  locationName: z.string(),
  assetName: z.string(),
  modelName: z.string(),
  modelId: z.number(),
  brandName: z.string(),
  seriesName: z.string(),
  industrialGateway: z.string(),
  license: z.string(),
  isLicenseActive: z.boolean().nullable(),
  count: z.number(),
});

export type AssetDetailsType = z.infer<typeof assetDetailsSchema>;

export type Column = {
  key: string;
  name: string;
  width?: string | number;
  alignment?: 'left' | 'right' | 'center';
  sortState?: boolean;
  showOrderIcon?: boolean;
};

type TGetAssetBySelectedParent = {
  locationId: number;
  modelIds: string | null;
  brands: string | null;
  assetIds: string | null;
  licenses: string | null;
  orderName: boolean | null;
  orderId: boolean | null;
  orderBrand: boolean | null;
  orderSeries: boolean | null;
  orderModel: boolean | null;
  orderLicense: boolean | null;
  limit: number | null;
  page: number | null;
};

export const getAssetsBySelectedParent = async ({
  locationId,
  modelIds,
  brands,
  assetIds,
  licenses,
  orderName,
  orderId,
  orderBrand,
  orderSeries,
  orderModel,
  orderLicense,
  limit,
  page,
}: TGetAssetBySelectedParent): Promise<AssetDetailsType[] | null> => {
  const data = await jsRequest({
    url: `/location/getallassetsbyparentlocation`,
    data: {
      location_id: locationId,
      model_ids: modelIds,
      brands,
      asset_ids: assetIds,
      licenses,
      order_name: orderName,
      order_id: orderId,
      order_brand: orderBrand,
      order_series: orderSeries,
      order_model: orderModel,
      order_license: orderLicense,
      limit,
      page,
    },
  });
  return z.array(assetDetailsSchema).parse(data);
};

type TGetModelBySelectedLocation = {
  locationId: number;
};

export const getModelsBySelectedLocation = async ({
  locationId,
}: TGetModelBySelectedLocation): Promise<
  { modelId: number; name: string }[] | null
> => {
  const data = await jsRequest({
    url: `/location/getmodelsbyselectedlocation`,
    data: { location_id: locationId },
  });
  return z
    .array(z.object({ modelId: z.number(), name: z.string() }))
    .parse(data);
};

type TGetBrandsBySelectedModels = {
  modelIds: string;
};

export const getBrandsBySelectedModels = async ({
  modelIds,
}: TGetBrandsBySelectedModels): Promise<{ brand: string }[] | null> => {
  const data = await jsRequest({
    url: `/location/getbrandsbyselectedmodels`,
    data: { model_ids: modelIds },
  });

  return z.array(z.object({ brand: z.string() })).parse(data);
};

type TGetLicensesBySelectedAssets = {
  assetIds: string;
};

export const getLicensesBySelectedAssets = async ({
  assetIds,
}: TGetLicensesBySelectedAssets): Promise<{ license: string }[] | null> => {
  const data = await jsRequest({
    url: `/location/getlicensesbyassetids`,
    data: { asset_ids: assetIds },
  });

  return z.array(z.object({ license: z.string() })).parse(data);
};
