import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const addUser = async (data: {
  user_group_alias: string;
  password: string;
  user_id: string;
  username: string;
  name: string;
  email: string;
  photo?: File;
}) => {
  const response = await jsRequest({
    url: `/user_management/adduser`,
    data,
  });

  return z.string().parse(response.message);
};

export const deleteUser = async (data: { username: string }) => {
  const response = await jsRequest({
    url: `/user_management/deleteuser`,
    data,
  });

  return z.string().parse(response.message);
};

export const updateUser = async (data: {
  user_group_alias: string;
  old_user_group_alias: string;
  user_id: string;
  username: string;
  name: string;
  email: string;
  photo?: File;
  old_password?: string;
  password?: string;
}) => {
  const response = await jsRequest({
    url: `/user_management/updateuser`,
    data: { ...data },
  });

  return z.string().parse(response.message);
};

const userPermissionSchema = z.object({
  permission: z.string(),
  permission_alias: z.string(),
  permission_group: z.string(),
  permission_group_alias: z.string(),
  value: z.boolean(),
});

export const getUserPermission = async (data: { username: string }) => {
  const response = await jsRequest({
    url: `/user_management/getuserpermission`,
    data,
  });

  return userPermissionSchema.array().parse(response);
};

const userSchema = z.object({
  name: z.string(),
  photo: z.string(),
  username: z.string(),
  employee_id: z.string(),
  email: z.string(),
  user_group_alias: z.string(),
});

const userOverviewSchema = z.object({
  name: z.string(),
  photo: z.string(),
  username: z.string(),
});

export const getUsersByUserGroup = async (data: {
  user_group_alias: string;
}) => {
  const response = await jsRequest({
    url: `/user_management/getusersbyusergroup`,
    data,
  });

  return userOverviewSchema.array().parse(response);
};

export const getUserDetails = async (data: { username: string }) => {
  const response = await jsRequest({
    url: `/user_management/getuserdetails`,
    data,
  });

  return userSchema.parse(response);
};
