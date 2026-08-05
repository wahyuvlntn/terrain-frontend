/* eslint-disable simple-import-sort/imports */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUserGroups } from './api/GetUserGroups';

export const useNotificationManager = () => {
  /* useSearchParams */
  const [searchParams, setSearchParams] = useSearchParams();

  const notificationAlias = 'epm_email_notification';

  /* Search */
  const search = searchParams.get('search');

  /* Location id */
  const location_id = searchParams.get('loc_id')
    ? Number(searchParams.get('loc_id'))
    : undefined;

  /* useQuery for querying user groups */
  const {
    data: userGroupsQuery,
    isFetching: isFetchingUserGroups,
    refetch: refetchUserGroups,
  } = useQuery({
    queryKey: ['getUserGroups', notificationAlias, search, location_id],
    queryFn: () =>
      getUserGroups({
        notification_alias: notificationAlias,
        search: search || '',
        location_id,
      }),
  });

  /* State for defining current selected user group name */
  const [selectedGroupName, setSelectedGroupName] = useState('');

  /* Select the user group name based on the search params of user group alias */
  const ug_alias = searchParams.get('ug_alias');
  useEffect(() => {
    setSelectedGroupName(
      userGroupsQuery?.find((group) => group.alias === ug_alias)?.name || ''
    );
  }, [ug_alias, userGroupsQuery]);

  return {
    notificationAlias,
    searchParams,
    setSearchParams,
    userGroupsQuery,
    isFetchingUserGroups,
    refetchUserGroups,
    selectedGroupName,
  };
};
