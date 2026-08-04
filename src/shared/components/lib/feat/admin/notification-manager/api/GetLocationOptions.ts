import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

/* SCHEMA */
const locationOptionsSchema = z.object({
  value: z.string(),
  label: z.string(),
});

/* TYPE */
type LocationOptionsType = z.infer<typeof locationOptionsSchema>;

export const getLocationOptions = async (): Promise<LocationOptionsType[]> => {
  const response = await jsRequest({
    url: `/notification/getlocationoptions`,
  });

  return locationOptionsSchema.array().parse(response);
};
