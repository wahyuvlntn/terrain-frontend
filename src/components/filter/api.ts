import { dbRequest, jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const getTypeNames = (ids: number[]) =>
  jsRequest({
    url: '/filter/gettypenames',
    data: {
      ids: ids.join(','),
    },
  }).then((data) => z.string().array().parse(data));

const typesSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export const getTypes = async () => {
  const data = await dbRequest({
    url: `/filter/getalltypes`,
    dbType: 'business',
  });

  return z.array(typesSchema).parse(data);
};
