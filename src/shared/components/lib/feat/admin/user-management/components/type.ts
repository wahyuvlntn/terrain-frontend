import { z } from 'zod';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  checked: boolean;
}

export interface SelectedLocations {
  id: string;
  label: string;
}

export const mutateUserGroupSchema = z.object({
  name: z.string().min(1, 'common.err_name_is_required'),
  alias: z.string().min(1, 'common.err_alias_is_required'),
  /* Check the location ids so that its JSON form has array length greater than 0 */
  locations: z.string(),
  // .refine(
  //   (l) => JSON.parse(l).length > 0,
  //   'common.location_name_is_required'
  // ),
  description: z.string().max(160),
});

export type MutateUserGroup = z.infer<typeof mutateUserGroupSchema>;

export const mutateUserSchema = z
  .object({
    user_group_alias: z.string().min(1, 'common.err_user_group_required'),
    password: z.string().min(1, 'common.err_password_required'),
    confirm_password: z.string(),
    user_id: z.string().min(1, 'common.err_user_id_required'),
    username: z.string().min(1, 'common.err_user  name_required'),
    name: z.string().min(1, 'common.err_name_is_required'),
    email: z
      .string()
      .min(1, 'common.err_email_is_required')
      .refine(
        (email) => {
          const emailRegex =
            // eslint-disable-next-line no-useless-escape
            /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/; /* Validaiton regex for email */
          return emailRegex.test(email);
        },
        {
          message: 'common.err_invalid_email_address',
        }
      ),
    photo: z.instanceof(File).optional(),
  })
  .superRefine(({ confirm_password, password }, ctx) => {
    if (confirm_password !== password) {
      ctx.addIssue({
        code: 'custom',
        message: 'common.err_password_not_match',
      });
    }
  });

export type MutateUser = z.infer<typeof mutateUserSchema>;

export const updateUserSchema = z
  .object({
    user_group_alias: z.string().min(1, 'common.err_user_group_required'),
    old_user_group_alias: z.string(),
    password: z.string().optional(),
    old_password: z.string().optional(),
    confirm_password: z.string().optional(),
    user_id: z.string().min(1, 'common.err_user_id_required'),
    email: z
      .string()
      .min(1, 'common.err_email_is_required')
      .refine(
        (email) => {
          const emailRegex =
            // eslint-disable-next-line no-useless-escape
            /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/; /* Validaiton regex for email */
          return emailRegex.test(email);
        },
        {
          message: 'common.err_invalid_email_address',
        }
      ),
    username: z
      .string()
      .min(1, 'common.err_username_required')
      .refine((str) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(str), {
        message: 'common.err_username_validation',
      }),
    name: z.string().min(1, 'common.err_name_is_required'),
    photo: z.instanceof(File).optional(),
  })
  .superRefine(({ confirm_password, password }, ctx) => {
    if (confirm_password !== password) {
      ctx.addIssue({
        code: 'custom',
        message: 'common.err_password_not_match',
      });
    }
  });

export type UpdateUser = z.infer<typeof updateUserSchema>;
