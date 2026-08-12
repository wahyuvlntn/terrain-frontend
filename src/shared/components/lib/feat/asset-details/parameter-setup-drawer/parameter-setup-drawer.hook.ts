import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import {
  ThresholdEnum,
  ThresholdGreaterThanEnum,
  ThresholdLessThanEnum,
} from '../../type';
import {
  getParameterConfig,
  MutateParameterConfigSchema,
  UpdateParameterConfig,
  updateParameterConfig,
  updateParameterConfigSchema,
} from './parameter-setup-drawer.api';

export const useParameterSetupDrawer = (
  parameterId: number,
  onSuccess: () => void
) => {
  const queryKey = ['PARAMETER_SETUP', { parameterId }];

  const { data } = useQuery({
    queryKey,
    queryFn: () => getParameterConfig(parameterId),
    enabled: !!parameterId,
    meta: { toastId: 'PARAMETER_SETUP' },
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: MutateParameterConfigSchema) =>
      updateParameterConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: [
          'LATEST_DATA',
          {
            parameterId,
          },
        ],
      });
      onSuccess();
    },
    meta: { toastId: 'UPDATE_PARAMETER_SETUP' },
  });

  const { reset, control, handleSubmit } = useForm<UpdateParameterConfig>({
    resolver: zodResolver(updateParameterConfigSchema),
    defaultValues: {
      parameterId: 0,
      criticalLowerLimit: 0,
      warningLowerLimit: 0,
      warningUpperLimit: 0,
      criticalUpperLimit: 0,
      warningUpperLimitThresholdType: ThresholdGreaterThanEnum.enum['X > _'],
      warningUpperLimitEnabled: false,
      warningLowerLimitThresholdType: ThresholdLessThanEnum.enum['X < _'],
      warningLowerLimitEnabled: false,
      criticalUpperLimitThresholdType: ThresholdGreaterThanEnum.enum['X > _'],
      criticalUpperLimitEnabled: false,
      criticalLowerLimitThresholdType: ThresholdLessThanEnum.enum['X < _'],
      criticalLowerLimitEnabled: false,
    },
  });

  const handleReset = useCallback(() => {
    if (!data) return;

    const mapThreshold = (threshold: ThresholdEnum) => {
      switch (threshold) {
        case ThresholdEnum.enum['X > _']:
        case ThresholdEnum.enum['X >= _']:
          return {
            upperLimitThresholdType: threshold,
            upperLimitEnabled: true,
            lowerLimitThresholdType: ThresholdLessThanEnum.enum['X < _'],
            lowerLimitEnabled: false,
          };
        case ThresholdEnum.enum['X < _']:
        case ThresholdEnum.enum['X <= _']:
          return {
            upperLimitThresholdType: ThresholdGreaterThanEnum.enum['X > _'],
            upperLimitEnabled: false,
            lowerLimitThresholdType: threshold,
            lowerLimitEnabled: true,
          };
        case ThresholdEnum.enum['X > _ or X < _']:
          return {
            upperLimitThresholdType: ThresholdGreaterThanEnum.enum['X > _'],
            upperLimitEnabled: true,
            lowerLimitThresholdType: ThresholdLessThanEnum.enum['X < _'],
            lowerLimitEnabled: true,
          };
        case ThresholdEnum.enum['X > _ or X <= _']:
          return {
            upperLimitThresholdType: ThresholdGreaterThanEnum.enum['X > _'],
            upperLimitEnabled: true,
            lowerLimitThresholdType: ThresholdLessThanEnum.enum['X <= _'],
            lowerLimitEnabled: true,
          };
        case ThresholdEnum.enum['X >= _ or X < _']:
          return {
            upperLimitThresholdType: ThresholdGreaterThanEnum.enum['X >= _'],
            upperLimitEnabled: true,
            lowerLimitThresholdType: ThresholdLessThanEnum.enum['X < _'],
            lowerLimitEnabled: true,
          };
        case ThresholdEnum.enum['X >= _ or X <= _']:
          return {
            upperLimitThresholdType: ThresholdGreaterThanEnum.enum['X >= _'],
            upperLimitEnabled: true,
            lowerLimitThresholdType: ThresholdLessThanEnum.enum['X <= _'],
            lowerLimitEnabled: true,
          };
        case ThresholdEnum.enum['']:
          return {
            upperLimitThresholdType: ThresholdGreaterThanEnum.enum['X > _'],
            upperLimitEnabled: false,
            lowerLimitThresholdType: ThresholdLessThanEnum.enum['X < _'],
            lowerLimitEnabled: false,
          };
      }
    };
    const warningThreshold = mapThreshold(data.warningThresholdType);
    const criticalThreshold = mapThreshold(data.criticalThresholdType);
    reset({
      parameterId,
      warningUpperLimitThresholdType: warningThreshold.upperLimitThresholdType,
      warningUpperLimitEnabled: warningThreshold.upperLimitEnabled,
      warningUpperLimit: data.warningUpperLimit,
      warningLowerLimitThresholdType: warningThreshold.lowerLimitThresholdType,
      warningLowerLimitEnabled: warningThreshold.lowerLimitEnabled,
      warningLowerLimit: data.warningLowerLimit,
      criticalUpperLimitThresholdType:
        criticalThreshold.upperLimitThresholdType,
      criticalUpperLimitEnabled: criticalThreshold.upperLimitEnabled,
      criticalUpperLimit: data.criticalUpperLimit,
      criticalLowerLimitThresholdType:
        criticalThreshold.lowerLimitThresholdType,
      criticalLowerLimitEnabled: criticalThreshold.lowerLimitEnabled,
      criticalLowerLimit: data.criticalLowerLimit,
    });
  }, [data, parameterId, reset]);

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  const handleFormSubmit = handleSubmit(
    (data) => {
      const mapThreshold = (
        upperThresholdType: ThresholdGreaterThanEnum,
        upperLimitEnabled: boolean,
        lowerThresholdType: ThresholdLessThanEnum,
        lowerLimitEnabled: boolean
      ) => {
        if (upperLimitEnabled && lowerLimitEnabled) {
          if (
            upperThresholdType === ThresholdGreaterThanEnum.enum['X > _'] &&
            lowerThresholdType === ThresholdLessThanEnum.enum['X < _']
          )
            return ThresholdEnum.enum['X > _ or X < _'];
          if (
            upperThresholdType === ThresholdGreaterThanEnum.enum['X > _'] &&
            lowerThresholdType === ThresholdLessThanEnum.enum['X <= _']
          )
            return ThresholdEnum.enum['X > _ or X <= _'];
          if (
            upperThresholdType === ThresholdGreaterThanEnum.enum['X >= _'] &&
            lowerThresholdType === ThresholdLessThanEnum.enum['X < _']
          )
            return ThresholdEnum.enum['X >= _ or X < _'];
          if (
            upperThresholdType === ThresholdGreaterThanEnum.enum['X >= _'] &&
            lowerThresholdType === ThresholdLessThanEnum.enum['X <= _']
          )
            return ThresholdEnum.enum['X >= _ or X <= _'];
        } else if (upperLimitEnabled) {
          return upperThresholdType;
        } else if (lowerLimitEnabled) {
          return lowerThresholdType;
        }
        return ThresholdEnum.enum[''];
      };
      mutate({
        parameterId,
        criticalLowerLimit: data.criticalLowerLimit,
        criticalUpperLimit: data.criticalUpperLimit,
        warningUpperLimit: data.warningUpperLimit,
        warningLowerLimit: data.warningLowerLimit,
        criticalThresholdType: mapThreshold(
          data.criticalUpperLimitThresholdType,
          data.criticalUpperLimitEnabled,
          data.criticalLowerLimitThresholdType,
          data.criticalLowerLimitEnabled
        ),
        warningThresholdType: mapThreshold(
          data.warningUpperLimitThresholdType,
          data.warningUpperLimitEnabled,
          data.warningLowerLimitThresholdType,
          data.warningLowerLimitEnabled
        ),
      });
    },
    (_errors) => {}
  );

  return { isPending, control, handleFormSubmit, handleReset };
};
