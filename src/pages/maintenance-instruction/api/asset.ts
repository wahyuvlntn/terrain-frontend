import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const modelSchema = z.object({
  name: z.string(),
  id: z.number(),
});

export type TModel = z.infer<typeof modelSchema>;

export const getModels = async () => {
  const data = await jsRequest({
    url: '/maintenance_instruction/get_models',
  });
  return modelSchema.array().parse(data);
};
