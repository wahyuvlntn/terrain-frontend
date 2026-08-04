/* eslint-disable simple-import-sort/imports */
import {
  QueryObserverResult,
  RefetchOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { getNotificationCategories } from '../api/GetNotificationCategories';
import { useContext, useEffect, useState } from 'react';
import { registerUserGroupToEmailNotification } from '../api/RegisterUserGroupToEmailNotification';
import { getAssignedCategoriesPerUserGroup } from '../api/GetAssignedCategoriesPerUserGroup';
import { UserGroupsType } from '../api/GetUserGroups';
import { AuthCtx } from '../../../auth';

export const useCategorytab = (
  searchParams: URLSearchParams /* searchParams */,
  notificationAlias: string /* Notification alias */,
  refetchUserGroups: (
    options?: RefetchOptions
  ) => Promise<
    QueryObserverResult<UserGroupsType[], Error>
  > /* Refetch user groups */
) => {
  /* Category search */
  const search = searchParams.get('category-search') || '';

  /* useQuery for categories */
  const {
    data: notificationCategoriesQuery,
    isFetching: isFetchingNotificationCategoriesQuery,
  } = useQuery({
    queryKey: ['getNotificationCategories', search],
    queryFn: () =>
      getNotificationCategories({
        search,
      }),
  });

  /* State of list of selected categories */
  const [selectedCategories, setSelectedCategories] = useState<
    {
      id: number;
    }[]
  >([]);

  /* Get current selected user group alias */
  const user_group_alias = searchParams.get('ug_alias');

  /* useQuery for get assigned categories */
  const {
    data: assignedCategories,
    isFetching: isFetchingAssignedCategories,
    refetch: refetchAssignedCategories,
  } = useQuery({
    queryKey: [
      'getassignedcategoriesperusergroup',
      notificationAlias,
      user_group_alias,
    ],
    queryFn: () =>
      getAssignedCategoriesPerUserGroup({
        notification_alias: notificationAlias,
        type_id: 1,
        ug_alias: user_group_alias || '',
      }),
    enabled: user_group_alias !== null,
  });

  /* Fill the selected categories array based on assigned categories data */
  useEffect(() => {
    if (assignedCategories) setSelectedCategories(assignedCategories);
  }, [assignedCategories]);

  /* Function that defines whether a category card is selected or not */
  const isCardSelected = (id: number) => {
    return selectedCategories.some((item) => item.id === id);
  };

  /* Handle select/unselect category card */
  const handleToggleSelectCategory = (id: number) => {
    if (selectedCategories.some((item) => item.id === id)) {
      setSelectedCategories((prev) => {
        return prev.filter((cat) => cat.id !== id);
      });
    } else {
      setSelectedCategories((prev) => {
        return [...prev, { id }];
      });
    }
  };

  /* Define the length of selected categories */
  const selectedCategoriesLength = notificationCategoriesQuery?.filter((cat) =>
    selectedCategories.some((c) => c.id === cat.id)
  ).length;

  /* useMutation for register user group to email notification */
  const registerUserGroupToEmailMutation = useMutation({
    mutationFn: registerUserGroupToEmailNotification,
    onSuccess: () => {
      refetchUserGroups();
      refetchAssignedCategories();
    },
    meta: {
      toastId: 'registerUserGroupToEmail',
    },
  });

  /* Categories submit handler */
  const handleSubmitCategories = () => {
    if (user_group_alias) {
      registerUserGroupToEmailMutation.mutate({
        input: JSON.stringify(
          selectedCategories.map((c) => {
            return {
              category_id: c.id,
              notif_alias: notificationAlias,
              type_id: 1,
              ug_alias: user_group_alias,
            };
          })
        ),
      });
    }
  };

  /* Check if user has update permission */
  const authContext = useContext(AuthCtx);
  const hasUpdatePermission = authContext.hasPermission(
    'notificationmanager',
    'update'
  );

  //   console.log(selectedCategories);

  return {
    notificationCategoriesQuery,
    isFetchingNotificationCategoriesQuery,
    isCardSelected,
    handleToggleSelectCategory,
    selectedCategories,
    handleSubmitCategories,
    isFetchingAssignedCategories,
    selectedCategoriesLength,
    hasUpdatePermission,
  };
};
