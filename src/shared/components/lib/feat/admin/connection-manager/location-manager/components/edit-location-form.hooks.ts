import { zodResolver } from '@hookform/resolvers/zod';
import { flattenTree, t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import {
  QueryObserverResult,
  RefetchOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';

import { getLocationTreeInput } from '../../../../location-tree-input';
import {
  fileToBase64,
  LocationDetailsType,
  locationFormEditSchema,
  LocationFormEditType,
  TreeNode,
  updateLocation,
} from '../api/location-manager';

export const useEditLocation = (
  locationDetails: LocationDetailsType | null | undefined,
  refetchLocation: (
    options?: RefetchOptions | undefined
  ) => Promise<QueryObserverResult<TreeNode[] | null, Error>>,
  editLocationClickHandler: () => void,
  open: boolean,
  selectedLocationNode: string | null
) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showLocationSelection, setShowLocationSeletion] =
    useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const locationId = searchParams.get('location_id');

  const locationDetailQuery = useQuery({
    queryKey: ['getLocationDetails', String(locationId)],
    enabled: false,
  });

  const { mutate, isPending } = useMutation({
    mutationKey: ['editLocation'] as const,
    mutationFn: async (data: LocationFormEditType): Promise<string> => {
      await updateLocation({
        id: data.id,
        locationImage: data.locationImage ?? null,
        name: data.locationName,
        parentId: data.parentId === -1 ? null : data.parentId,
        avalabilityTh: data.availabilityTh,
        qualityTh: data.qualityTh,
        performanceTh: data.performanceTh,
        carbonTh: data.carbonTh,
        costTh: data.costTh,
        energyTh: data.energyTh,
        currencyId: data.currencyId,
        timezone: data.timezone,
      });
      return t('common.successfully_edited_location');
    },
    meta: {
      toastId: ['editLocation'],
    },
    onSuccess: async () => {
      await refetchLocation();
      editLocationClickHandler();
      locationDetailQuery.refetch();
    },
  });

  const {
    reset,
    control,
    handleSubmit,
    getValues,
    watch,
    formState,
    setValue,
  } = useForm<LocationFormEditType>({
    defaultValues: {
      ...locationDetails,
    },
    resolver: zodResolver(locationFormEditSchema),
  });

  const imageObject = watch('locationImage');

  const handleFormSubmit = handleSubmit(
    (data) => {
      mutate(data);
    },
    (errors) => {
      let errorMessage = t('common.please_fill_form_correctly');

      for (const [, error] of Object.entries(errors)) {
        if (error.message) {
          errorMessage = error.message;
          break;
        }
      }

      toast.info(errorMessage);
    }
  );

  const handleLocationSelection = () => {
    setShowLocationSeletion((prev) => !prev);
  };

  const handleSaveLocationSelection = async () => {
    const locationInput = searchParams.get('location_input');
    if (locationInput) {
      setValue('parentId', parseInt(locationInput));
    }
  };

  const locationTree = useQuery({
    queryKey: [
      'getLocationTree-LOCATION_MANAGER',
      selectedLocationNode,
      open,
      locationId,
    ] as const,
    queryFn: async () =>
      getLocationTreeInput({
        excludedId: null,
        locationId: parseInt(locationId as string),
        searchFilter: null,
      }),
    enabled: !!open,
  });

  const flatLocationTree = useMemo(() => {
    const flatTree = flattenTree(locationTree.data || []);

    return flatTree;
  }, [locationTree.data]);

  useEffect(() => {
    if (locationDetails) {
      reset({
        ...locationDetails,
        parentLocation: locationDetails.parentLocation
          ? locationDetails.parentLocation
          : t('common.location'),
        parentId: locationDetails.parentId ?? -1,
        locationImage: undefined,
      });
    } else {
      reset({
        id: 0,
        parentId: 0,
        parentLocation: '',
        locationImage: undefined,
        locationName: '',
        availabilityTh: 0,
        performanceTh: 0,
        qualityTh: 0,
        carbonTh: 0,
        costTh: 0,
        currencyId: '1',
        energyTh: 0,
        timezone: 'America/Denver',
      });
    }
    setPreviewImage(null);
  }, [locationDetails, reset, open]);

  useEffect(() => {
    if (imageObject) {
      fileToBase64(imageObject, (base64String) => {
        setPreviewImage(base64String);
      });
    }
  }, [imageObject]);

  return {
    flatLocationTree,
    previewImage,
    showLocationSelection,
    locationDetails,
    isPending,
    control,
    formState,
    handleFormSubmit,
    handleLocationSelection,
    handleSaveLocationSelection,
    setShowLocationSeletion,
    getValues,
    setSearchParams,
    watch,
  };
};
