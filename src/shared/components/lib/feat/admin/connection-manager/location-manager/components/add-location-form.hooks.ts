import { zodResolver } from '@hookform/resolvers/zod';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import {
  QueryObserverResult,
  RefetchOptions,
  useMutation,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import {
  addNewLocation,
  LocationDetailsType,
  locationFormAddSchema,
  LocationFormAddType,
  TreeNode,
} from '../api/location-manager';

export const useAddLocation = (
  selectedLocationNode: string | null,
  addLocationClickHandler: () => void,
  refetchLocation: (
    options?: RefetchOptions | undefined
  ) => Promise<QueryObserverResult<TreeNode[] | null, Error>>,
  locationDetails: LocationDetailsType | null | undefined,
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>,
  open: boolean
) => {
  const { reset, control, handleSubmit, watch, formState } =
    useForm<LocationFormAddType>({
      resolver: zodResolver(locationFormAddSchema),
    });

  const watchedLocationImage = watch('locationImage');
  const watchedCurrency = watch('currencyId');

  // Add Location
  const { mutate, isPending } = useMutation({
    mutationKey: ['addNewLocation'] as const,
    mutationFn: async (data: LocationFormAddType): Promise<string> => {
      await addNewLocation({
        name: data.locationName,
        parentId:
          selectedLocationNode && selectedLocationNode !== '-1'
            ? parseInt(selectedLocationNode)
            : null,
        locationImage: data.locationImage,
        availabilityTh: data.availabilityTh,
        performanceTh: data.performanceTh,
        qualityTh: data.qualityTh,
        currencyId: data.currencyId,
        timezone: data.timezone,
        energyTh: data.energyTh,
        carbonTh: data.carbonTh,
        costTh: data.costTh,
      });
      await refetchLocation();
      if (selectedLocationNode) {
        setExpandedItems((prev) => {
          if (prev.includes(selectedLocationNode)) {
            return [...prev];
          } else {
            return [...prev, selectedLocationNode];
          }
        });
      }
      addLocationClickHandler();
      reset({
        ...locationDetails,
        parentLocation: locationDetails?.locationName ?? 'Location',
        locationImage: undefined,
        locationName: '',
        availabilityTh: 0,
        performanceTh: 0,
        qualityTh: 0,
        carbonTh: 0,
        costTh: 0,
        currencyId: '1',
        timezone: 'America/Denver',
        energyTh: 0,
      });

      // return 'Added new location';
      return t('common.added_new_location');
    },
    meta: {
      toastId: ['addNewLocation'],
    },
  });

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

  useEffect(() => {
    if (locationDetails) {
      reset({
        ...locationDetails,
        parentLocation: locationDetails?.locationName ?? t('common.location'),
        locationImage: undefined,
        locationName: '',
        availabilityTh: 0,
        performanceTh: 0,
        qualityTh: 0,
        carbonTh: 0,
        costTh: 0,
        currencyId: locationDetails.currencyId,
        timezone: locationDetails.timezone,
        energyTh: 0,
      });
    } else {
      reset({
        parentLocation: t('common.location'),
        locationImage: undefined,
        locationName: '',
        availabilityTh: 0,
        performanceTh: 0,
        qualityTh: 0,
        carbonTh: 0,
        costTh: 0,
        currencyId: '1',
        timezone: 'America/Denver',
        energyTh: 0,
      });
    }
  }, [locationDetails, reset]);

  useEffect(() => {
    reset();
  }, [open, reset]);

  return {
    watchedLocationImage,
    watchedCurrency,
    isPending,
    control,
    handleFormSubmit,
    formState,
  };
};
