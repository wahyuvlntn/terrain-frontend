import { Query, useQuery } from '@tanstack/react-query';

import {
  getLatestData,
  getParameterData,
  TGetParameterData,
} from './parameter-area-chart.api';

type TQueryKey = [
  'PARAMETER_DATA',
  {
    parameterId: number;
    date: string;
    timezoneOffset: number;
  }
];

export type TRefetchInterval =
  | number
  | false
  | ((
      query: Query<TGetParameterData, Error, TGetParameterData, TQueryKey>
    ) => number | false | undefined);

type TUseParameterAreaChartParams = {
  parameterId: number;
  date: string;
  enabled: boolean;
  refetchInterval?: TRefetchInterval;
};

export const useParameterAreaChart = ({
  date,
  enabled,
  parameterId,
  refetchInterval,
}: TUseParameterAreaChartParams) => {
  const timezoneOffset = new Date().getTimezoneOffset();
  const { data: historical, isLoading } = useQuery({
    queryFn: () => getParameterData(parameterId, date, timezoneOffset),
    queryKey: [
      'PARAMETER_DATA',
      {
        parameterId,
        date,
        timezoneOffset,
      },
    ],
    refetchInterval,
    enabled: !!date && enabled,
    meta: { toastId: `PARAMETER_HISTORICAL-${parameterId}` },
  });

  const { data: latest } = useQuery({
    queryFn: () => getLatestData(parameterId),
    queryKey: [
      'LATEST_DATA',
      {
        parameterId,
      },
    ],
    refetchInterval: 5 * 1000,
    enabled,
    meta: { toastId: `PARAMETER_LATEST_DATA-${parameterId}` },
  });

  return {
    historical,
    latest,
    isLoading,
  };
};
