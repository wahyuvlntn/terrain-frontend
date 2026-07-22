import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getUsersByUserGroup } from '../api/user';

export const useUserGroupDropdown = (alias: string) => {
  const [open, setOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['getUsers', alias],
    queryFn: () =>
      getUsersByUserGroup({
        user_group_alias: alias,
      }),
  });

  return {
    open,
    setOpen,
    users: usersQuery.data,
    isLoading: usersQuery.isLoading,
  };
};
