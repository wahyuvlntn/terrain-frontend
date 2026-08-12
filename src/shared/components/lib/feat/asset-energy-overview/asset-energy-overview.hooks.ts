import {
  addDays,
  exportToExcel,
  formatDateHTMLInput,
  formatStringToObjectDate,
  TCreateExcelWorkbookParams,
} from '@digital-twin/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SetURLSearchParams } from 'react-router-dom';
import { z } from 'zod';

import {
  FILTER_KEY_CONDITION,
  FILTER_KEY_MODEL,
  FILTER_KEY_STATUS,
  FILTER_SEARCH_PARAMS_PARSER_CONDITION,
  FILTER_SEARCH_PARAMS_PARSER_MODEL,
  FILTER_SEARCH_PARAMS_PARSER_STATUS,
  PAGE_SEARCH_PARAMS,
  SEARCH_SEARCH_PARAMS,
  useGetFilter,
} from '../../..';
import {
  Asset,
  TGetAssetEnergyOverviewParams,
  TGetAssetEnergyOverviewReturn,
} from './asset-energy-overview.api';

type TUseAssetEnergyOverviewParams<T> = {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  queryFn: (
    params: TGetAssetEnergyOverviewParams
  ) => Promise<TGetAssetEnergyOverviewReturn<T>>;
  exportFn: (params: Omit<TGetAssetEnergyOverviewParams, 'limit' | 'page' | 'search'>) => Promise<Asset<T>[]>;
  sheetsParserFn: (
    assets: Asset<T>[]
  ) => Omit<TCreateExcelWorkbookParams, 'period'>;
  typeFilterKey: string;
};

const LIMIT = 9;

export const useAssetEnergyOverview = <T>({
  queryFn,
  exportFn,
  searchParams,
  setSearchParams,
  sheetsParserFn,
  typeFilterKey,
}: TUseAssetEnergyOverviewParams<T>) => {
  const { setFilter, data, isReady, handleFilterDataChange, ...filter } =
    useGetFilter<
      {
        [FILTER_KEY_STATUS]: string;
        [FILTER_KEY_CONDITION]: string;
        [FILTER_KEY_MODEL]: number;
      },
      {
        [PAGE_SEARCH_PARAMS]: number;
        [SEARCH_SEARCH_PARAMS]: string;
      }
    >({
      keys: [
        {
          key: FILTER_KEY_STATUS,
          searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_STATUS,
        },
        {
          key: FILTER_KEY_CONDITION,
          searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_CONDITION,
        },
        {
          key: FILTER_KEY_MODEL,
          searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_MODEL,
        },
        {
          key: typeFilterKey,
          searchParamsParser: (data: string) => Number(data),
        },
      ],
      additionalFilters: [
        {
          key: PAGE_SEARCH_PARAMS,
          searchParamsParser: (data) =>
            z.coerce.number().min(1).catch(1).parse(data),
        },
        {
          key: SEARCH_SEARCH_PARAMS,
          searchParamsParser: (data) => data ?? '',
        },
      ],
      shouldBeResetKeyOnApply: { [PAGE_SEARCH_PARAMS]: 1 },
    });
  const { search, page } = filter;
  const {
    assetIds,
    locationIds,
    statusIds,
    modelIds,
    conditionIds,
    ...filterDataRest
  } = data;

  // @ts-expect-error TS7053: Element implicitly has an any type because expression of type string can't be used to index type {}
  const typeIds = filterDataRest[typeFilterKey] as number[] | null;

  const end = searchParams.get('end') ?? formatDateHTMLInput(new Date());
  const start =
    searchParams.get('start') ??
    formatDateHTMLInput(addDays(formatStringToObjectDate(end), -6));

  const handleDateChange = (start: Date, end: Date) =>
    setSearchParams((prev) => {
      prev.set('start', formatDateHTMLInput(start));
      prev.set('end', formatDateHTMLInput(end));
      return prev;
    });

  const endAddedOneDay = formatDateHTMLInput(
    addDays(formatStringToObjectDate(end), 1)
  );
  const queryClient = useQueryClient();
  const timezoneOffset = new Date().getTimezoneOffset();
  const queryParams = {
    start,
    end: endAddedOneDay,
    search,
    page,
    status: statusIds,
    typeIds: typeIds,
    modelIds,
    assetIds,
    conditions: conditionIds,
    limit: LIMIT,
    timezoneOffset,
    locationIds,
  };
  const {
    data: assets,
    isLoading,
    isPlaceholderData,
    isFetching,
  } = useQuery({
    queryFn: async () => {
      const data = await queryFn(queryParams);

      data?.assets.forEach((asset) => {
        queryClient.setQueryData(['ASSET_NAME', { id: asset.id }], asset.name);
      });
      return data;
    },
    queryKey: ['ASSET_OVERVIEW', queryParams],
    meta: {
      toastId: 'ASSET_OVERVIEW',
    },
    enabled: isReady,
    refetchInterval: 3 * 60 * 1000,
  });

  const [isExporting, setIsExporting] = useState(false);

  const exportData = async () => {
    try {
      setIsExporting(true);

      const assets = await exportFn(queryParams)

      exportToExcel({
        ...sheetsParserFn(assets),
        start: new Date(start),
        end: new Date(end),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePageChange = (page: number) =>
    setFilter((prev) => ({
      ...prev,
      page,
    }));

  const handleSearchChange = (search: string) =>
    setFilter((prev) => ({
      ...prev,
      page: 1,
      search,
    }));

  const locationOverviewPage = searchParams.get('location_page');
  const queryString: { [key: string]: string | string[] } = {};
  for (const entry of searchParams.entries()) {
    const key = entry[0];
    const data = queryString[key];
    const value = entry[1];
    if (data) queryString[key] = [...data, value];
    else queryString[key] = [value];
  }

  return {
    isExporting,
    assets: assets ? assets.assets : [],
    assetCounts: assets ? assets.counts : 0,
    start,
    end,
    handleDateChange,
    isLoading: isLoading || (isPlaceholderData && isFetching),
    exportData,
    handleFilterDataChange,
    handlePageChange,
    locationOverviewPage,
    queryString,
    handleSearchChange,
    setFilter,
    data,
    isReady,
    ...filter,
  };
};
