import { useQuery } from '@tanstack/react-query';

import { getLastParamTimestamp } from './last-updated.api';

export const useLastUpdated = () => {
  const { data } = useQuery({
    queryFn: getLastParamTimestamp,
    queryKey: ['GET_LAST_PARAM_TIMESTAMP'],
    meta: { toastId: 'LAST_UPDATED' },
    refetchInterval: 5 * 1000,
  });

  return { lastUpdated: data };
};
