import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  calculateSpcMetrics,
  calculateSpcMetricsSchema,
  getSPCConfig,
  TCalculateSpcMetrics,
  UpdateSPCConfig,
  updateSPCConfig,
  updateSPCConfigSchema,
} from '../api';

export const useSPCConfigDrawer = (parameterId: number, onSuccess: () => void) => {
  const queryClient = useQueryClient();
  const queryKey = ['SPC_CONFIG', { parameterId }];
  const { data } = useQuery({
    queryKey,
    queryFn: () => getSPCConfig(parameterId),
    enabled: !!parameterId,
    meta: { toastId: 'SPC_SETUP' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: updateSPCConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['SPC', { parameterId }] });
      onSuccess();
    },
    meta: { toastId: 'UPDATE_SPC_SETUP' },
  });

  const [reference, setReference] = useState({
    centerline: '',
    sigma: '',
    ucl: '',
    lcl: '',
  });

  const {
    control: controlCalculate,
    handleSubmit: _handleSubmitCalculate,
    reset: resetCalculate,
  } = useForm<TCalculateSpcMetrics>({
    resolver: zodResolver(calculateSpcMetricsSchema),
  });

  const { isPending: isPendingCalculate, mutate: mutateCalculate } = useMutation({
    mutationFn: calculateSpcMetrics,
    onSuccess: (data) => {
      setReference({
        centerline: data.centerLine.toString(),
        sigma: data.sigma.toString(),
        ucl: data.ucl.toString(),
        lcl: data.lcl.toString(),
      });
    },
  });

  const { control, handleSubmit, reset } = useForm<UpdateSPCConfig>({
    resolver: zodResolver(updateSPCConfigSchema),
    values: data
      ? {
          ...data,
          usl: data.usl === '' ? '' : Number(data.usl),
          lsl: data.lsl === '' ? '' : Number(data.lsl),
          ucl: data.ucl === '' ? '' : Number(data.ucl),
          lcl: data.lcl === '' ? '' : Number(data.lcl),
          centerLine: data.centerLine === '' ? '' : Number(data.centerLine),
          sigma: data.sigma === '' ? '' : Number(data.sigma),
          parameterId,
        }
      : undefined,
  });

  const handleFormSubmit = handleSubmit((data) => mutate(data));

  const handleSubmitCalculate = _handleSubmitCalculate((data) => {
    return mutateCalculate({
      ...data,
      parameterId,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      timezoneOffset: new Date().getTimezoneOffset(),
    });
  });

  useEffect(() => {
    resetCalculate();
    reset();
    setReference({
      centerline: '',
      sigma: '',
      ucl: '',
      lcl: '',
    });
  }, [parameterId]);

  return {
    isPending,
    control,
    handleFormSubmit,
    reference,
    controlCalculate,
    handleSubmitCalculate,
    isPendingCalculate,
  };
};
