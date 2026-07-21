/* eslint-disable simple-import-sort/imports */
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
  deleteUserGroup,
  getLocationTree,
  getUserGroupDetails,
  updateUserGroup,
} from '../api/user-group';
import {
  MutateUserGroup,
  mutateUserGroupSchema,
  SelectedLocations,
} from './type';

export const useUserGroupForm = (
  alias: string,
  setSelected: React.Dispatch<
    React.SetStateAction<{
      type: string;
      value: string | null;
    }>
  >
) => {
  const [openLocation, setOpenLocation] = useState(false);
  const [openPopupDelete, setOpenPopupDelete] = useState(false);
  const [description, setDescription] = useState('');
  const [locations, setLocations] = useState<SelectedLocations[] | undefined>(
    undefined
  );
  const [locSearch, setLocSearch] = useState<string>('');

  /* Function to expand selected locations with all their children from the tree */
  const expandLocationsWithChildren = useCallback(
    (
      selectedLocations: SelectedLocations[],
      treeData: any[]
    ): SelectedLocations[] => {
      const expandedLocations: SelectedLocations[] = [...selectedLocations];
      const expandedIds = new Set(selectedLocations.map((l) => l.id));

      /* Helper function to find all children of a given node ID */
      const addChildrenToSet = (nodes: any[]) => {
        for (const node of nodes) {
          if (expandedIds.has(node.id) && node.children) {
            /* Recursively add all children */
            const traverseChildren = (children: any[]) => {
              for (const child of children) {
                if (!expandedIds.has(child.id)) {
                  expandedIds.add(child.id);
                  expandedLocations.push({ id: child.id, label: child.label });
                }
                if (child.children) {
                  traverseChildren(child.children);
                }
              }
            };
            traverseChildren(node.children);
          }
          if (node.children) {
            addChildrenToSet(node.children);
          }
        }
      };

      addChildrenToSet(treeData);
      return expandedLocations;
    },
    []
  );

  useEffect(() => {
    setOpenLocation(false);
  }, [alias]);

  const onLocSearchChange = (value: string) => {
    setLocSearch(value);
  };

  /* Save location handler - memoized to prevent infinite loop in LocationSelector */
  const handleSaveLocation = useCallback(
    (locations: SelectedLocations[]) => setLocations(locations),
    []
  );

  /* User group details query */
  const userGroupDetailsQuery = useQuery({
    queryKey: ['getUserGroupDetails', alias],
    queryFn: () =>
      getUserGroupDetails({
        alias,
      }),
    gcTime: 0,
    staleTime: 0,
  });

  /* Query client for invalidating queries */
  const queryClient = useQueryClient();

  /* useMutation for deleting user group. On success, invalidate user group queries */
  const deleteUserGroupMutation = useMutation({
    mutationFn: deleteUserGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getUserGroups'] });
      setSelected({
        type: '',
        value: null,
      });
    },
    meta: {
      toastId: 'deleteUserGroup',
    },
  });

  /* Delete user group handler */
  const handleDelete = () => {
    deleteUserGroupMutation.mutate({
      alias,
    });
    setOpenPopupDelete(false);
  };

  /* Initialize user group form */
  const {
    handleSubmit,
    formState: { errors },
    setValue,
    control,
    getValues,
    watch,
  } = useForm<MutateUserGroup>({
    resolver: zodResolver(mutateUserGroupSchema),
    defaultValues: {
      description: '',
    },
  });

  /* Set the value of user group form based on user group details data (exclude locations) */
  useEffect(() => {
    if (userGroupDetailsQuery.data) {
      const data = userGroupDetailsQuery.data;
      setValue('name', data.name);
      setValue('alias', data.alias);
      setLocations(data.locations);
      setValue('description', data.description);
      setDescription(data.description);
    }
  }, [userGroupDetailsQuery.data, setValue]);

  /* Set the value of user group locations based on locations state */
  useEffect(() => {
    setValue('locations', JSON.stringify(locations));
  }, [locations, setValue]);

  /* Set the value of user group description based on description state */
  useEffect(() => {
    setValue('description', description);
  }, [description, setValue]);

  /* Watch description length */
  const descWatcher = watch('description');

  /* useMutation for updating user group */
  const updateUserGroupMutation = useMutation({
    mutationFn: updateUserGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getUserGroups'] });
    },
    meta: {
      toastId: 'updateUserGroup',
    },
  });

  /* User group form submit handler */
  const onSubmit: SubmitHandler<MutateUserGroup> = (data) => {
    // if (JSON.parse(data.locations).length === 0) {
    //   toast.error(t('common.err_at_least_one_location_selected'));
    //   return;
    // }
    updateUserGroupMutation.mutate(data);
  };

  /* useQuery for querying location tree */
  const locationTreeQuery = useQuery({
    queryKey: ['getLocationTreeUserManagement', locSearch],
    queryFn: () =>
      getLocationTree({
        search_filter: locSearch,
      }),
    gcTime: 0,
    staleTime: 0,
  });

  const [locationRect, setLocationRect] = useState<DOMRect | null>(null);

  const locationFieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rect = locationFieldRef.current?.getBoundingClientRect();
    if (rect) setLocationRect(rect);
  }, []);

  /* Compute expanded locations (with all children) when locations or locationTreeQuery.data changes */
  const expandedInitialLocations = useMemo(() => {
    if (locationTreeQuery.data && locations && locations.length > 0) {
      return expandLocationsWithChildren(locations, locationTreeQuery.data);
    }
    return locations;
  }, [locations, locationTreeQuery.data, expandLocationsWithChildren]);

  return {
    openLocation,
    setOpenLocation,
    userGroupDetails: userGroupDetailsQuery.data,
    isFetchingUserGroupDetails: userGroupDetailsQuery.isFetching,
    openPopupDelete,
    setOpenPopupDelete,
    handleDelete,
    errors,
    handleSubmit,
    control,
    getValues,
    onSubmit,
    descWatcher,
    setValue,
    description,
    setDescription,
    handleSaveLocation,
    locations,
    locationTreeQuery,
    locationRect,
    locationFieldRef,
    onLocSearchChange,
    locSearch,
    expandedInitialLocations,
  };
};
