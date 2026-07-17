import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const userDetailsSchema = z.object({
  assignedLocation: z.string(),
  employeeID: z.string().nullable(),
  name: z.string(),
  photoURL: z.string().nullable(),
  username: z.string(),
  role: z.string(),
});
export const getUserDetailsByUsername = (username: string) =>
  jsRequest({
    url: `/user/getuserprofiledetail`,
    data: { username },
  }).then((response) => userDetailsSchema.parse(response));

type TChangePassword = {
  oldPassword: string;
  newPassword: string;
  username: string;
};
export const changePassword = (data: TChangePassword) =>
  jsRequest({
    url: `/user/changepassword`,
    data: {
      old_password: data.oldPassword,
      new_password: data.newPassword,
    },
  }).then((response) => z.string().parse(response));

export const updateProfileSchema = z.object({
  username: z.string(),
  fullName: z.string(),
  photo: z
    .custom<File>((file) => file instanceof File)
    .refine(
      (file) => ['image/jpg', 'image/jpeg', 'image/png'].includes(file.type),
      'Accepted Formats: JPG/JPEG/PNG'
    )
    .nullable(),
});
export type TUpdateProfile = z.infer<typeof updateProfileSchema>;
export const updateProfile = (data: TUpdateProfile) =>
  jsRequest({
    url: `/user/updateprofile`,
    data: {
      name: data.fullName,
      photo: data.photo,
    },
  }).then((response) => z.string().parse(response));

export const verifyOldPassword = (oldPassword: string) =>
  jsRequest({
    url: `/user/verifypassword`,
    data: { old_password: oldPassword },
  }).then(() => {});
