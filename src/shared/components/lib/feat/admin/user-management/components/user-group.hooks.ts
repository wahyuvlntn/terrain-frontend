import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getUserGroups } from '../api/user-group';

export const useUserGroup = (props: {
  selected: {
    type: string;
    value: string | null;
  };
  setSelected: React.Dispatch<
    React.SetStateAction<{
      type: string;
      value: string | null;
    }>
  >;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  ascendingUg: boolean | null;
  setAscendingUg: React.Dispatch<React.SetStateAction<boolean | null>>;
  ascendingLoc: boolean | null;
  setAscendingLoc: React.Dispatch<React.SetStateAction<boolean | null>>;
}) => {
  const [openAddUserDrawer, setOpenAddUserDrawer] = useState(false);
  const [openAddUserGroupDrawer, setOpenAddUserGroupDrawer] = useState(false);

  const userGroupsQuery = useQuery({
    queryKey: [
      'getUserGroups',
      props.searchValue,
      props.ascendingLoc,
      props.ascendingUg,
    ],
    queryFn: () =>
      getUserGroups({
        search: props.searchValue,
        ascending_loc: props.ascendingLoc,
        ascending_ug: props.ascendingUg,
      }),
  });

  return {
    userGroups: userGroupsQuery.data,
    isLoading: userGroupsQuery.isLoading,
    openAddUserDrawer,
    setOpenAddUserDrawer,
    openAddUserGroupDrawer,
    setOpenAddUserGroupDrawer,
  };
};
