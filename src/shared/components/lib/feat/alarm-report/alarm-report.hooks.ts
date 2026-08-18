import { formatDateHTMLInput } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAlarmReportGetFilter } from '../../../index';
import { getAssetsByFilter } from './api/alarm-report';

export interface DropdownOptions {
  label: string;
  value: string;
}

type TUseAlarmReportParams = {
  filterTypeKey: string;
} & ReturnType<typeof useAlarmReportGetFilter>;

export const useAlarmReport = ({
  data,
  end,
  isReady,
  start,
  setFilter,
  filterTypeKey,
}: TUseAlarmReportParams) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const { locationIds, assetIds, modelIds, ...filterDataRest } = data;
  // @ts-expect-error TS7053: Element implicitly has an any type because expression of type string can't be used to index type {}
  const typeIds = filterDataRest[filterTypeKey] as number[] | null;
  const startDate = start;
  const endDate = end;
  const periodParam = searchParams.get('period');

  const [selectedStartDate, setSelectedStartDate] = useState<Date>(
    startDate
      ? new Date(startDate + 'T00:00:00.000')
      : new Date(Date.now() - 86400000 * 7)
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(
    endDate ? new Date(endDate + 'T00:00:00.000') : new Date()
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(
    periodParam ?? 'daily'
  );

  const mainRef = useRef<HTMLDivElement>(null);
  const [mainRefSize, setElementSize] = useState({ width: 0, height: 0 });
  const [assetDropdown, setAssetDropdown] = useState<DropdownOptions[] | null>(
    null
  );
  const [selectedAssets, setSelectedAssets] = useState<string[] | null>(null);
  const stringifyInput = (inputs: number[] | null): string | null => {
    if (!inputs) {
      return null;
    } else {
      return `{${inputs.map(Number).join(',')}}`;
    }
  };

  const { data: assets, refetch: refetchAssets } = useQuery({
    queryKey: [
      'getAssets',
      { assetIds, locationIds, modelIds, typeIds },
    ] as const,
    queryFn: async (): Promise<string | null> => {
      const returnedAssets = await getAssetsByFilter({
        locationIds: stringifyInput(locationIds),
        assetIds: stringifyInput(assetIds),
        modelIds: stringifyInput(modelIds),
        typeIds: stringifyInput(typeIds),
      });
      if (!returnedAssets) return null;
      return stringifyInput(returnedAssets.map((asset) => asset.id));
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    meta: {
      toastId: ['getAssets', { assetIds, locationIds, modelIds, typeIds }],
    },
    enabled: isReady,
  });

  const changeViewHandler = () => {
    setFilter((prev) => ({
      ...prev,
      eventview: !prev.eventview,
      page: 1,
    }));
  };

  const handleDateChange = (
    startDate: Date,
    endDate: Date,
    period?: string
  ) => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
    setSelectedPeriod(period);

    setFilter((prev) => ({
      ...prev,
      start: formatDateHTMLInput(startDate),
      end: formatDateHTMLInput(endDate),
      page: 1,
    }));

    setSearchParams((searchParams) => {
      if (period) searchParams.set('period', period);
      return searchParams;
    });
  };

  useEffect(() => {
    const element = mainRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setElementSize({ width, height });
      }
    });
    if (element) resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      setSelectedStartDate(
        startDate
          ? new Date(startDate + 'T00:00:00.000')
          : new Date(Date.now() - 86400000 * 7)
      );
      setSelectedEndDate(
        endDate ? new Date(endDate + 'T00:00:00.000') : new Date()
      );
    }
  }, [startDate, endDate]);

  return {
    selectedStartDate,
    selectedEndDate,
    selectedPeriod,
    mainRef,
    mainRefSize,
    assetDropdown,
    selectedAssets,
    assets,
    handleDateChange,
    changeViewHandler,
    setSearchParams,
    refetchAssets,
    setAssetDropdown,
    setSelectedStartDate,
    setSelectedEndDate,
    setSelectedAssets,
    // startDate: formatD,
  };
};
