import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

/* SCHEMA */
const notificationCategorySchema = z.object({
  id: z.number(),
  category: z.string(),
});

/* TYPE */
type NotificationCategoryType = z.infer<typeof notificationCategorySchema>;

export const getNotificationCategories = async (data: {
  search: string;
}): Promise<NotificationCategoryType[]> => {
  const response = await jsRequest({
    url: `/notification/getnotificationcategories`,
    data,
  });

  return notificationCategorySchema.array().parse(response);
};
