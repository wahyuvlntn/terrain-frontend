import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

import { deleteUser, getUserDetails, updateUser } from '../api/user';
import { getUserGroupDetails, getUserGroups } from '../api/user-group';
import { UpdateUser, updateUserSchema } from './type';

export const useUserForm = (
  username: string,
  setSelected: React.Dispatch<
    React.SetStateAction<{
      type: string;
      value: string | null;
    }>
  >
) => {
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [alias, setAlias] = useState('');
  const [openPopupDelete, setOpenPopupDelete] = useState(false);

  const userGroupsQuery = useQuery({
    queryKey: ['getUserGroupOptions'],
    queryFn: () =>
      getUserGroups({
        search: '',
        ascending_loc: null,
        ascending_ug: null,
      }),
  });

  const userGroupOptions = userGroupsQuery.data?.map((userGroup) => {
    const label = userGroup.name;
    const value = userGroup.alias;

    return {
      label,
      value,
    };
  });

  const userDetailsQuery = useQuery({
    queryKey: ['getUserDetails', username],
    queryFn: async () => await getUserDetails({ username }),
  });

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    control,
    getValues,
  } = useForm<UpdateUser>({
    resolver: zodResolver(updateUserSchema),
  });

  useEffect(() => {
    if (userDetailsQuery.data) {
      const data = userDetailsQuery.data;
      setValue('user_group_alias', data.user_group_alias);
      setValue('old_user_group_alias', data.user_group_alias);
      setValue('name', data.name);
      setValue('username', data.username);
      setValue('user_id', data.employee_id);
      setValue('email', data.email);
      setAlias(data.user_group_alias);
      setIsUpdatingImage(false);
      setIsUpdatingPassword(false);
    }
  }, [JSON.stringify(userDetailsQuery.data), setValue, setAlias]);

  useEffect(() => {
    setValue('user_group_alias', alias);
  }, [alias, setValue]);

  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ['getUsers', userDetailsQuery.data?.user_group_alias],
      });
      queryClient.refetchQueries({
        queryKey: ['getUsers', getValues('user_group_alias')],
      });
      userDetailsQuery.refetch();
      setIsUpdatingImage(false);
      setIsUpdatingPassword(false);
    },
    meta: {
      toastId: 'updateUser',
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ['getUsers', userDetailsQuery.data?.user_group_alias],
      });
      setSelected({
        type: '',
        value: null,
      });
    },
    meta: {
      toastId: 'deleteUser',
    },
  });

  const handleDeleteUser = () => {
    if (userDetailsQuery.data) {
      deleteUserMutation.mutate({
        username: userDetailsQuery.data?.username,
      });
    }
    setOpenPopupDelete(false);
  };

  const onSubmit: SubmitHandler<UpdateUser> = (data) => {
    if (isUpdatingPassword) {
      updateUserMutation.mutate(data);
    } else {
      const {
        password,
        confirm_password,
        old_password,
        ...dataWithoutPasswords
      } = data;
      updateUserMutation.mutate(dataWithoutPasswords);
    }
  };

  const userGroupDetailsQuery = useQuery({
    queryKey: ['getUserGroupDetails', alias],
    queryFn: () =>
      getUserGroupDetails({
        alias,
      }),
    enabled: alias.length > 0,
  });

  let assignedLocationString = '';

  userGroupDetailsQuery.data?.locations?.forEach((l, index) => {
    assignedLocationString += `${l.label}${
      index === userGroupDetailsQuery.data?.locations.length - 1 ? '' : ';'
    } `;
  });

  return {
    handleSubmit,
    errors,
    control,
    isUpdatingPassword,
    setIsUpdatingPassword,
    onSubmit,
    userGroupOptions,
    isUpdatingImage,
    setIsUpdatingImage,
    locations: userGroupDetailsQuery.data?.locations,
    assignedLocationString,
    alias,
    setAlias,
    openPopupDelete,
    setOpenPopupDelete,
    name: userDetailsQuery.data?.name,
    photo: userDetailsQuery.data?.photo,
    handleDeleteUser,
  };
};
