import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { AssetIdParams } from '../index';
import { getAllParameters } from './export-param-modal.api';

export const useExportParamModal = (enabled: boolean) => {
  const { id } = useParams<AssetIdParams>();
  const assetId = parseInt(id || '0');

  const { data } = useQuery({
    queryFn: () => getAllParameters(assetId),
    queryKey: ['ALL_PARAMETERS', { assetId }],
    enabled,
    meta: { toastId: 'ALL_PARAMETERS' },
  });

  const [selectedParams, setSelectedParams] = useState<number[]>([]);

  return {
    data,
    selectedParams,
    setSelectedParams,
  };
};
