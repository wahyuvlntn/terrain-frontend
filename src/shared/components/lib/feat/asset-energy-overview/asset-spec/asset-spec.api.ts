import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const descriptionSchema = z.object({
  aspect: z.string(),
  information: z.string(),
});

export type Description = z.infer<typeof descriptionSchema>;

const assetSpecSchema = z.object({
  name: z.string(),
  image: z.string().nullable(),
  descriptions: z.object({
    critical: z.array(descriptionSchema),
    supporting: z.array(descriptionSchema),
  }),
});

export const getAssetSpec = async (id: number) => {
  const data = await jsRequest({
    url: `/asset/getassetaspectinfo`,
    data: {
      asset_id: id,
    },
  });

  return assetSpecSchema.parse(data);
};

export const updateSpecSchema = z.object({
  assetId: z.number(),
  critical: z.array(descriptionSchema),
  supporting: z.array(descriptionSchema),
});

export type UpdateSpec = z.infer<typeof updateSpecSchema>;

export const updateAssetSpec = async (data: UpdateSpec) => {
  const response = await jsRequest({
    url: `/asset/updateassetaspectinfo`,
    data: {
      asset_id: data.assetId,
      critical: JSON.stringify(data.critical),
      supporting: JSON.stringify(data.supporting),
    },
  });

  return z.string().parse(response);
};
