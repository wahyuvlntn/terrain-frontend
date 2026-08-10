import { FILTER_KEY_LOCATION, ThemeContext } from '@digital-twin/components';
import { formatDateHTMLInput } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createSearchParams, useNavigate, useSearchParams } from 'react-router-dom';

import { getLocationAPQ, LocationAPQType } from '../api/location-overview.api';

export const useLocationCard = (locationId: number, OEELimit: number, isPreview: boolean) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    colors: { backgroundLowest, neutralTextTitleHeading, conditionNormalPrimary },
  } = useContext(ThemeContext);
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end') || formatDateHTMLInput(new Date());
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const chartRef = useRef<ReactECharts>(null);

  const { data: APQ, isFetching } = useQuery({
    queryKey: ['getLocationAPQ', startDate, endDate, locationId, OEELimit] as const,
    queryFn: async (): Promise<LocationAPQType | null> => {
      if (!startDate) return null;
      return await getLocationAPQ(locationId, startDate, endDate, new Date().getTimezoneOffset());
    },
    enabled: !!startDate && !!endDate && !isPreview,
    refetchInterval: 60000,
    meta: {
      toastId: ['getLocationAPQ', startDate, endDate, locationId],
    },
    retryDelay: 5000,
    staleTime: 60000,
    placeholderData: {
      totalAvailability: 0,
      totalUptime: null,
      totalPerformance: 0,
      totalQuality: 0,
      performanceGood: false,
      availabilityGood: false,
      qualityGood: false,
    },
  });

  const handleOnHover = (e: boolean) => {
    setIsHovering(e);
  };

  const chartOption = useMemo(() => {
    return {
      grid: {
        top: 0,
      },
      animation: true,
      series: [
        {
          label: {
            show: true,
            position: 'center',
            formatter: isPreview
              ? '78%'
              : APQ?.totalUptime === undefined || APQ?.totalUptime === null
                ? '-'
                : `${Math.round(APQ.totalUptime)}%`,
            fontSize: 27,
            fontWeight: 600,
            color: neutralTextTitleHeading,
          },
          emphasis: {
            disabled: true,
          },
          type: 'pie',
          data: [
            {
              value: isPreview ? 78 : APQ?.totalUptime,
              name: 'oee',
              itemStyle: {
                color: conditionNormalPrimary,
              },
            },
            {
              value: isPreview ? 100 - 78 : 100 - (APQ?.totalUptime || 0),
              name: 'empty',
              itemStyle: {
                color: backgroundLowest,
              },
            },
          ],
          showEmptyCircle: true,
          center: ['50%', '50%'],
          radius: ['100%', '60%'],
        },
      ],
    };
  }, [APQ, isPreview, neutralTextTitleHeading, backgroundLowest, conditionNormalPrimary]);

  const locations = searchParams.get('locations');
  const page = searchParams.get('page');
  const locationIdParam = searchParams.get('location_id');

  const assetOverviewUrl = `/asset-overview?${createSearchParams({
    [FILTER_KEY_LOCATION]: locationId.toString(),
    ...(startDate && { start: startDate }),
    ...(endDate && { end: endDate }),
    ...(locations && { locations }),
    ...(locationIdParam && { location_id: locationIdParam }),
    ...(page && { location_page: page }),
  })}`;

  useEffect(() => {
    const handleResize = () => {
      chartRef.current?.getEchartsInstance().resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    chartRef,
    APQ,
    startDate,
    endDate,
    isFetching,
    chartOption,
    assetOverviewUrl,
    navigate,
    setSearchParams,
    isHovering,
    handleOnHover,
  };
};
