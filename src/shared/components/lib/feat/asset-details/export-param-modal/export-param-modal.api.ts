import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const parameterSchema = z.object({
  name: z.string(),
  id: z.number(),
});

export const getAllParameters = async (assetId: number) => {
  const data = await jsRequest({
    url: `/asset/getallparameters`,
    data: {
      asset_id: assetId,
    },
  });

  return z.array(parameterSchema).parse(data);
};
