/* eslint-disable simple-import-sort/imports */
import { zodResolver } from '@hookform/resolvers/zod';
import { t } from '@digital-twin/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { addUserGroup, getLocationTree } from '../api/user-group';
import {
  MutateUserGroup,
  mutateUserGroupSchema,
  SelectedLocations,
} from './type';
// import { TreeNodeInput, getLocationTree } from '../../../location-tree-input';

export const useAddUserGroupForm = (closeDrawer: () => void, open: boolean) => {
  /* States and search params */
  const [openLocation, setOpenLocation] = useState(false);
  const [description, setDescription] = useState('');
  const [locations, setLocations] = useState<SelectedLocations[]>([]);

  /* Save location handler */
  const handleSaveLocation = (locations: SelectedLocations[]) =>
    setLocations(locations);

  /* Initialize form for adding user group */
  const {
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    control,
    reset,
    watch,
  } = useForm<MutateUserGroup>({
    resolver: zodResolver(mutateUserGroupSchema),
    defaultValues: {
      description: '',
    },
  });

  /* Set the value of user group locations based on locations state */
  useEffect(() => {
    setValue('locations', JSON.stringify(locations));
  }, [locations, setValue]);

  /* Set the value of description field based on the description state */
  useEffect(() => {
    setValue('description', description);
  }, [description, setValue]);

  /* Query client for invalidating query */
  const queryClient = useQueryClient();

  /* useMutation for adding user group. On success, it will invalidate user groups query. */
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: MutateUserGroup) => {
      const response = await addUserGroup(data);
      toast.success(t(`common.${response}`));
      reset();
      closeDrawer();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getUserGroups'] });
    },
  });

  /* Submit handler for add user group form */
  const onSubmit: SubmitHandler<MutateUserGroup> = (data) => {
    // if (JSON.parse(data.locations).length === 0) {
    //   toast.error(t('common.err_at_least_one_location_selected'));
    //   return;
    // }
    mutate(data);
  };

  /* Watch the change on description field. This is used for tracking the current length of the field's value. */
  const descWatcher = watch('description');

  const [locSearch, setLocSearch] = useState<string>('');

  const onLocSearchChange = (value: string) => {
    setLocSearch(value);
  };

  const [locationRect, setLocationRect] = useState<DOMRect | null>(null);

  const locationFieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log(locationRect);
  }, [locationRect, open]);

  useEffect(() => {
    const rect = locationFieldRef.current?.getBoundingClientRect();
    if (rect) setLocationRect(rect);
  }, [open]);

  /* useQuery for querying location tree */
  const locationTreeQuery = useQuery({
    queryKey: ['getLocationTreeUserManagement2', open, locSearch],
    enabled: open,
    queryFn: () =>
      getLocationTree({
        search_filter: locSearch,
      }),
    staleTime: 0,
    gcTime: 0,
  });

  return {
    openLocation,
    setOpenLocation,
    handleSubmit,
    errors,
    control,
    getValues,
    onSubmit,
    isPending,
    description,
    setDescription,
    descWatcher,
    locationTreeQuery,
    locations,
    handleSaveLocation,
    locSearch,
    onLocSearchChange,
    locationRect,
    locationFieldRef,
  };
};
