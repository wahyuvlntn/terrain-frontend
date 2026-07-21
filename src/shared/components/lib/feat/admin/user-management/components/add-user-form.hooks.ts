import { zodResolver } from '@hookform/resolvers/zod';
import { t } from '@digital-twin/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import { addUser } from '../api/user';
import { getUserGroups } from '../api/user-group';
import { MutateUser, mutateUserSchema } from './type';

export const useAddUserForm = (
  userGroupAlias: string | null,
  closeDrawer: () => void
) => {
  /* useQuery for user group list */
  const userGroupsQuery = useQuery({
    queryKey: ['getUserGroups'],
    queryFn: () =>
      getUserGroups({ search: '', ascending_loc: null, ascending_ug: null }),
  });

  /* Options for user group dropdown */
  const userGroupOptions = userGroupsQuery.data?.map((userGroup) => {
    const label = userGroup.name;
    const value = userGroup.alias;

    return {
      label,
      value,
    };
  });

  /* Add user form initialization */
  const {
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    control,
  } = useForm<MutateUser>({
    resolver: zodResolver(mutateUserSchema),
  });

  /* Set user group alias default value by checking whether there's selected user group or not */
  useEffect(() => {
    if (userGroupAlias) {
      setValue('user_group_alias', userGroupAlias);
    } else {
      /* If no user group is selected, the user group alias default value will be the first value of the user group options */
      setValue(
        'user_group_alias',
        userGroupsQuery.data && userGroupsQuery.data?.length > 0
          ? userGroupsQuery.data[0].alias
          : ''
      );
    }
  }, [userGroupAlias, setValue, userGroupsQuery.data]);

  /* Query client for invalidating query */
  const queryClient = useQueryClient();

  /* useMutation for adding user. On success, it will invalidate users query */
  const addUserMutation = useMutation({
    mutationFn: async (data: MutateUser) => {
      const { confirm_password, ..._data } = data;
      const response = await addUser(_data);
      toast.success(t(`common.${response}`));
      reset();
      closeDrawer();
      queryClient.invalidateQueries({
        queryKey: ['getUsers', data.user_group_alias],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getUsers', userGroupAlias] });
    },
  });

  /* Submit handler for add user form */
  const onSubmit: SubmitHandler<MutateUser> = (data) => {
    addUserMutation.mutate(data);
  };

  return { userGroupOptions, handleSubmit, control, errors, onSubmit };
};
