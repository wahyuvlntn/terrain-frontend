import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const getAssetNameById = async (id: number) => {
  const data = await jsRequest({
    url: `/asset/getassetname`,
    data: { asset_id: id },
  });

  return z.string().parse(data.name);
};
