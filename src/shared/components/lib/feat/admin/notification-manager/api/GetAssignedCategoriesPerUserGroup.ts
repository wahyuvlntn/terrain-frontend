import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

/* SCHEMA */
const categoryIdSchema = z.object({
  id: z.number(),
});

/* TYPE */
type CategoryIdType = z.infer<typeof categoryIdSchema>;

export const getAssignedCategoriesPerUserGroup = async (data: {
  notification_alias: string;
  type_id: number;
  ug_alias: string;
}): Promise<CategoryIdType[]> => {
  const response = await jsRequest({
    url: `/notification/getassignedcategoriesperusergroup`,
    data,
  });

  return categoryIdSchema.array().parse(response);
};
