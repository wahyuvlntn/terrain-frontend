/* eslint-disable simple-import-sort/imports */
import { AuthCtx, Checkbox, Column } from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import {
  QueryObserverResult,
  RefetchOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { useContext, useEffect, useState } from 'react';
import { getUsers } from '../api/GetUsers';
import { getUnsubscribedUsers } from '../api/GetUnsubscribedUsers';
import { submitUnsubscribedUsers } from '../api/SubmitUnsubscribedUsers';
import { UserGroupsType } from '../api/GetUserGroups';

export const useNotifiedUser = (
  searchParams: URLSearchParams /* searchParams */,
  refetchUserGroups: (
    options?: RefetchOptions
  ) => Promise<
    QueryObserverResult<UserGroupsType[], Error>
  > /* Refetch user groups */
) => {
  /* User search */
  const search = searchParams.get('user-search') || '';

  /* Get current selected user group alias */
  const user_group_alias = searchParams.get('ug_alias');

  /* Unselected users */
  const [unselectedUsers, setUnselectedUsers] = useState<
    { username: string }[]
  >([]);

  /* Handle toggle notified */
  const handleToggleNotified = (username: string) => {
    if (unselectedUsers.some((item) => item.username === username)) {
      setUnselectedUsers((prev) => {
        return prev.filter((cat) => cat.username !== username);
      });
    } else {
      setUnselectedUsers((prev) => {
        return [...prev, { username }];
      });
    }
  };

  /* user table column */
  const [userTableColumn, setUserTableColumn] = useState<Column[]>([
    {
      key: 'user',
      name: (
        <div style={{ height: 55, display: 'flex', alignItems: 'center' }}>
          {t('common.user')}
        </div>
      ),
      showOrderIcon: true,
    },
    {
      key: 'is_notified',
      name: t('common.notified'),
      alignment: 'center',
      width: 300,
    },
  ]);

  /* Handle sort column */
  const handleSortColumn = (columnKey: string, sort: boolean | undefined) => {
    setUserTableColumn((prevColumns) =>
      prevColumns.map((column) =>
        column.key === columnKey
          ? { ...column, sortState: sort }
          : { ...column, sortState: undefined }
      )
    );
  };

  /* useQuery for get notified users */
  const { data: notifiedUsersQuery, isFetching: isFetchingNotifiedUsers } =
    useQuery({
      queryKey: [
        'getNotifiedUsers',
        search,
        user_group_alias,
        userTableColumn[0].sortState,
      ],
      queryFn: () =>
        getUsers({
          search,
          ug_alias: user_group_alias || '',
          ascending: userTableColumn[0].sortState,
        }),
      enabled: user_group_alias !== null,
    });

  /* useQuery for get unsubscribed users */
  const {
    data: unsubscribedUsersQuery,
    isFetching: isFetchingUnsubscribedUsers,
    refetch: refetchUnsubscribedUsers,
  } = useQuery({
    queryKey: ['getUnsubscribedUsers', user_group_alias],
    queryFn: () =>
      getUnsubscribedUsers({
        type_id: 1,
        ug_alias: user_group_alias || '',
      }),
    enabled: user_group_alias !== null,
  });

  /* Set unselected users based on the unsubscribed users query */
  useEffect(() => {
    if (unsubscribedUsersQuery) setUnselectedUsers(unsubscribedUsersQuery);
  }, [unsubscribedUsersQuery]);

  /* Table rows */
  const rows = notifiedUsersQuery?.map((user) => {
    const isUserSelected = !unselectedUsers.some((u) => u.username === user.id);
    return {
      id: user.id,
      user: user.user,
      is_notified: (
        <Checkbox
          value={isUserSelected}
          onClick={() => handleToggleNotified(user.id)}
        />
      ),
    };
  });

  /* Count the selected users */
  const selectedUsersCount =
    (notifiedUsersQuery?.length || 0) - unselectedUsers.length;

  /* useMutation for register user group to email notification */
  const registerUserGroupToEmailMutation = useMutation({
    mutationFn: submitUnsubscribedUsers,
    onSuccess: () => {
      refetchUserGroups();
      refetchUnsubscribedUsers();
    },
    meta: {
      toastId: 'submitUnsubscribedUsers',
    },
  });

  /* Handle submit notified users */
  const handleSubmitNotifiedUsers = () => {
    /* Get selected usernames */
    const selected_usernames = notifiedUsersQuery
      /* Filter selected users only */
      ?.filter((user) => !unselectedUsers.some((u) => u.username === user.id))
      /* Get the username only */
      .map((user) => ({ username: user.id }));

    registerUserGroupToEmailMutation.mutate({
      selected_usernames: JSON.stringify(selected_usernames),
      unselected_usernames: JSON.stringify(unselectedUsers),
      type_id: 1,
    });
  };

  /* Check if user has update permission */
  const authContext = useContext(AuthCtx);
  const hasUpdatePermission = authContext.hasPermission(
    'notificationmanager',
    'update'
  );

  return {
    userTableColumn,
    rows,
    isFetchingNotifiedUsers,
    setUnselectedUsers,
    setUserTableColumn,
    isFetchingUnsubscribedUsers,
    notifiedUsersQuery,
    selectedUsersCount,
    handleSortColumn,
    handleSubmitNotifiedUsers,
    hasUpdatePermission,
  };
};
