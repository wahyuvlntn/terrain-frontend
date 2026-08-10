import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  TRefetchIntervalParameterArea,
} from '@digital-twin/components';
import { formatDateHTMLInput } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { useContext, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { getParameters } from '../api';
import { AssetIdParams } from '../type';

export const useHasParameterEditPermission = () => {
  const { hasPermission } = useContext(AuthCtx);
  return {
    hasPermission: hasPermission(
      PermissionGroupAliasEnum.enum.equipmentoverview,
      PermissionAliasEnum.enum.update
    ),
  };
};

const SHOW_SPC_LIST_SEARCH_PARAMS = 'show-spc-list';

export const useParameterList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('parameter-search') || '';
  const [searchNoDebounce, setSearchNoDebounce] = useState(search);

  useEffect(() => setSearchNoDebounce(search), [search]);

  const { id } = useParams<AssetIdParams>();
  const assetId = Number.parseInt(id || '0');

  const showRealTime = searchParams.get(SHOW_SPC_LIST_SEARCH_PARAMS) !== 'true';
  const handleShowRealTime = (show: boolean) => {
    setSearchParams((prev) => {
      show
        ? prev.delete(SHOW_SPC_LIST_SEARCH_PARAMS)
        : prev.set(SHOW_SPC_LIST_SEARCH_PARAMS, 'true');
      return prev;
    });
  };

  const pageRealTime = Number.parseInt(searchParams.get('real-time-page') || '1');
  const pageSPC = Number.parseInt(searchParams.get('spc-page') || '1');

  const skipRealTime = (pageRealTime - 1) * PAGINATION_LIMIT;
  const skipSPC = (pageSPC - 1) * PAGINATION_LIMIT;

  const searchLower = search.toLowerCase();
  const {
    data: parametersRealTime,
    isLoading: isLoadingRealTime,
    isPlaceholderData: isPlaceholderDataRealTime,
    isFetching: isFetchingRealTime,
  } = useQuery({
    queryFn: () => getParameters(assetId, skipRealTime, searchLower),
    queryKey: ['PARAMETERS', { assetId, skip: skipRealTime, searchLower }],
    enabled: showRealTime,
    meta: { toastId: 'ASSET_DETAILS_PARAMETER_LIST' },
  });
  const {
    data: parametersSPC,
    isLoading: isLoadingSPC,
    isPlaceholderData: isPlaceholderSPC,
    isFetching: isFetchingSPC,
  } = useQuery({
    queryFn: () => getParameters(assetId, skipSPC, searchLower),
    queryKey: ['PARAMETERS', { assetId, page: skipSPC, searchLower }],
    enabled: !showRealTime,
    meta: { toastId: 'ASSET_DETAILS_PARAMETER_LIST' },
  });

  const refetchInterval: TRefetchIntervalParameterArea = (query) => {
    if (query.queryKey[1].date === formatDateHTMLInput(new Date(), 'datetime-local'))
      return 5 * 1000;
    return false;
  };

  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const handleSearch = (search: string) => {
    setSearchNoDebounce(search);

    if (timer) clearTimeout(timer);

    const newTimer = setTimeout(
      () =>
        setSearchParams((prev) => {
          prev.set('parameter-search', search);
          prev.delete('real-time-page');
          prev.delete('spc-page');
          prev.delete('timestamp-from');
          prev.delete('timestamp-to');
          return prev;
        }),
      500
    );

    setTimer(newTimer);
  };

  const page = showRealTime ? pageRealTime : pageSPC;
  const pageMax = Math.max(
    Math.ceil(((showRealTime ? parametersRealTime?.counts : parametersSPC?.counts) ?? 0) / 2),
    1
  );

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set(
        prev.get(SHOW_SPC_LIST_SEARCH_PARAMS) === 'true' ? 'spc-page' : 'real-time-page',
        String(page)
      );
      prev.delete('timestamp-from');
      prev.delete('timestamp-to');
      return prev;
    });
  };

  const timestampFrom = searchParams.get('timestamp-from');
  const timestampTo = searchParams.get('timestamp-to');

  const handleSPCRestore = () =>
    setSearchParams((prev) => {
      prev.delete('timestamp-from');
      prev.delete('timestamp-to');
      return prev;
    });

  const timestampHighlight =
    timestampFrom && timestampTo
      ? {
          timestampFrom,
          timestampTo,
        }
      : {};

  return {
    showRealTime,
    handleShowRealTime,
    parametersRealTime,
    parametersSPC,
    isLoadingSPC: isLoadingSPC || (isPlaceholderSPC && isFetchingSPC),
    isLoadingRealTime: isLoadingRealTime || (isPlaceholderDataRealTime && isFetchingRealTime),
    refetchInterval,
    handleSearch,
    handlePageChange,
    page,
    pageMax,
    search: searchNoDebounce,
    timestampFrom,
    timestampTo,
    timestampHighlight,
    handleSPCRestore,
  };
};

export const PAGINATION_LIMIT = 2;
