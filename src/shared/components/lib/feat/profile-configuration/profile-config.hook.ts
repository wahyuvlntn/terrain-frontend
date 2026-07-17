import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { USER_DATA_QUERY_KEY } from '../auth/auth.context';
import {
  changePassword,
  getUserDetailsByUsername,
  TUpdateProfile,
  updateProfile,
  updateProfileSchema,
  verifyOldPassword,
} from './profile-config.api';

export const useProfileConfig = (open: boolean) => {
  const queryClient = useQueryClient();
  const [oldPassword, setOldPassword] = useState('');
  const { data: userDetailsData, refetch } = useQuery({
    queryKey: ['getUserDetail', open],
    queryFn: () => getUserDetailsByUsername(''),
    meta: { toastId: ['getUserDetail'] },
    enabled: open,
    staleTime: 0,
  });

  useEffect(() => {
    setOldPassword('');
  }, [userDetailsData, setOldPassword]);

  const { mutateAsync: mutateChangePassword } = useMutation({
    mutationFn: changePassword,
    meta: { toastId: 'CHANGE_PASSWORD' },
    onSuccess: () => setOldPassword(''),
  });
  const handleChangePassword = async (newPassword: string) => {
    mutateChangePassword({
      username: userDetailsData?.username ?? '',
      oldPassword: oldPassword,
      newPassword: newPassword,
    });
  };

  const { mutateAsync: mutateUpdateProfile } = useMutation({
    mutationFn: updateProfile,
    meta: { toastId: 'UPDATE_PROFILE' },
    onSuccess: () => {
      setOldPassword('');
      refetch();
      queryClient.refetchQueries({
        queryKey: USER_DATA_QUERY_KEY,
      });
    },
  });
  const handleUpdateProfile = async (
    fullName: string,
    newProfilePic: File | null
  ) => {
    const parsed = updateProfileSchema.safeParse({
      fullName: fullName,
      photo: newProfilePic,
      username: userDetailsData?.username ?? '',
    } satisfies TUpdateProfile);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message, {
        toastId: 'UPDATE_PROFILE',
      });
      throw new Error(parsed.error.issues[0]?.message);
    }

    await mutateUpdateProfile(parsed.data);
  };

  const handleValidateNewPassword = (newPassword: string) => {
    const schema = z
      .string()
      .min(8, { message: t('common.err_password_minimum_length') })
      .max(72, { message: t('common.err_password_maximum_length') })
      .regex(/[A-Z]/, {
        message: t('common.err_password_contain_one_uppercase'),
      })
      .regex(/[a-z]/, {
        message: t('common.err_password_contain_one_lowercase'),
      })
      .regex(/[0-9]/, {
        message: t('common.err_password_contain_one_numeric'),
      })
      .regex(/[^A-Za-z0-9]/, {
        message: t('common.err_password_contain_one_special_character'),
      });
    const parsed = schema.safeParse(newPassword);

    return parsed.success ? null : parsed.error.issues[0]?.message ?? '';
  };

  const { mutateAsync: mutateVerifyOldPassword } = useMutation({
    mutationFn: verifyOldPassword,
    onSuccess: (_data, oldPassword) => setOldPassword(oldPassword),
  });
  const handleVerifyOldPassword = async (oldPassword: string) => {
    await mutateVerifyOldPassword(oldPassword);
  };

  return {
    handleChangePassword,
    handleUpdateProfile,
    handleValidateNewPassword,
    handleVerifyOldPassword,
    userDetailsData,
  };
};
