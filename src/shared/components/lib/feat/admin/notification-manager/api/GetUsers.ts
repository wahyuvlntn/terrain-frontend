import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

/* SCHEMA */
const usersSchema = z.object({
  id: z.string(),
  user: z.string(),
});

/* TYPE */
export type UsersType = z.infer<typeof usersSchema>;

export const getUsers = async (data: {
  ug_alias: string;
  search: string;
  ascending?: boolean;
}): Promise<UsersType[]> => {
  const response = await jsRequest({
    url: `/notification/getusers`,
    data,
  });

  return usersSchema.array().parse(response);
};
