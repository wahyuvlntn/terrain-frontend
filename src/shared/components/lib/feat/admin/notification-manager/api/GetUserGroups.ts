import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

/* SCHEMA */
const userGroupsSchema = z.object({
  alias: z.string(),
  category_count: z.number(),
  locations: z.string(),
  name: z.string(),
  user_count: z.number(),
});

/* TYPE */
export type UserGroupsType = z.infer<typeof userGroupsSchema>;

export const getUserGroups = async (data: {
  notification_alias: string;
  search: string;
  location_id?: number;
}): Promise<UserGroupsType[]> => {
  const response = await jsRequest({
    url: `/notification/getusergroups`,
    data,
  });

  return userGroupsSchema.array().parse(response);
};
