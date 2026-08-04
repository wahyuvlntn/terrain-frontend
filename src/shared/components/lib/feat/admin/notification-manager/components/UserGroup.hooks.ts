/* eslint-disable simple-import-sort/imports */
import { useQuery } from '@tanstack/react-query';
import { UserGroupsType } from '../api/GetUserGroups';
import { useEffect } from 'react';
import { SetURLSearchParams } from 'react-router-dom';
import { getLocationOptions } from '../api/GetLocationOptions';

export const useUserGroup = (
  searchParams: URLSearchParams /* searchParams */,
  setSearchParams: SetURLSearchParams /* setSearchParams */,
  userGroupsQuery: UserGroupsType[] | undefined /* User group data */
) => {
  /* Search */

  /* useQuery for querying location options */
  const { data: locationOptionsQuery } = useQuery({
    queryKey: ['getLocationOptions'],
    queryFn: () => getLocationOptions(),
  });

  /* Add location options with 'All' */
  const locationOptions = locationOptionsQuery && [
    {
      label: 'All',
      value: 'all',
    },
    ...locationOptionsQuery,
  ];

  /* When there isn't any user group that contains currently selected group, select the first user group in the list  */
  useEffect(() => {
    if (
      userGroupsQuery &&
      userGroupsQuery.length > 0 &&
      !userGroupsQuery
        .map((ug) => ug.alias)
        .includes(searchParams.get('ug_alias') || '')
    ) {
      setSearchParams((prev) => {
        prev.set('ug_alias', userGroupsQuery[0].alias);
        return prev;
      });
    }
  }, [userGroupsQuery]);

  /* Location dropdown value */
  const dropdownLocationValue = searchParams.get('loc_id') || 'all';

  /* Location dropdown change handler */
  const handleLocationChange = (e: string) => {
    setSearchParams((prev) => {
      if (e === 'all') {
        prev.delete('loc_id');
      } else {
        prev.set('loc_id', e);
      }

      return prev;
    });
  };

  /* Auto select first location */
  //   useEffect(() => {
  //     if (locationOptionsQuery && locationOptionsQuery.length > 0) {
  //       setSearchParams((prev) => {
  //         prev.set('loc_id', locationOptionsQuery[0].value);
  //         return prev;
  //       });
  //     }
  //   }, [locationOptionsQuery]);

  return {
    locationOptions,
    dropdownLocationValue,
    handleLocationChange,
  };
};
