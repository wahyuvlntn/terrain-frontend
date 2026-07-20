/* eslint-disable simple-import-sort/imports */
import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';
import { TreeNode } from '../components/type';

export const addUserGroup = async (data: {
  alias: string;
  description: string;
  locations: string;
  name: string;
}) => {
  const response = await jsRequest({
    url: `/user_management/addusergroup`,
    data,
  });

  return z.string().parse(response.message);
};

export const updateUserGroup = async (data: {
  alias: string;
  description: string;
  locations: string;
  name: string;
}) => {
  const response = await jsRequest({
    url: `/user_management/updateusergroup`,
    data,
  });

  return z.string().parse(response.message);
};

export const addUserGroupPermission = async (data: {
  alias: string;
  permissions: string;
}) => {
  const response = await jsRequest({
    url: `/user_management/addusergrouppermission`,
    data,
  });

  return z.string().parse(response.message);
};

export const deleteUserGroup = async (data: { alias: string }) => {
  const response = await jsRequest({
    url: `/user_management/deleteusergroup`,
    data,
  });

  return z.string().parse(response.message);
};

const userGroupSchema = z.object({
  alias: z.string(),
  description: z.string(),
  name: z.string(),
  locations: z
    .object({
      id: z.string(),
      label: z.string(),
    })
    .array(),
});

export const getUserGroupDetails = async (data: { alias: string }) => {
  const response = await jsRequest({
    url: `/user_management/getusergroupdetails`,
    data,
  });

  return userGroupSchema.parse(response);
};

const userGroupPermissionSchema = z.object({
  permission: z.string(),
  permission_alias: z.string(),
  permission_group: z.string(),
  permission_group_alias: z.string(),
  value: z.boolean(),
});

export const getUserGroupPermission = async (data: { alias: string }) => {
  const response = await jsRequest({
    url: `/user_management/getusergrouppermission`,
    data,
  });

  return userGroupPermissionSchema.array().parse(response);
};

export const getUserGroups = async (data: {
  search: string;
  ascending_loc: boolean | null;
  ascending_ug: boolean | null;
}) => {
  const response = await jsRequest({
    url: `/user_management/getusergroups`,
    data,
  });

  return userGroupSchema.array().parse(response);
};

const locationTreeSchema: z.ZodSchema<TreeNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    children: z.array(locationTreeSchema).optional(),
    checked: z.boolean(),
  })
);

export const getLocationTree = async (data: { search_filter: string }) => {
  const response = await jsRequest({
    url: `/user_management/getlocationtree`,
    data,
  });

  return locationTreeSchema.array().parse(response);
};
