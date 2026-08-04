import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

/* SCHEMA */
const unsubscribedUsersSchema = z.object({
  username: z.string(),
});

/* TYPE */
type unsubscribedUsersType = z.infer<typeof unsubscribedUsersSchema>;

export const getUnsubscribedUsers = async (data: {
  type_id: number;
  ug_alias: string;
}): Promise<unsubscribedUsersType[]> => {
  const response = await jsRequest({
    url: `/notification/getunsubscribedusers`,
    data,
  });

  return unsubscribedUsersSchema.array().parse(response);
};
