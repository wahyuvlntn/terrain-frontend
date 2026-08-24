import {
  AuthCtx,
  FILTER_KEY_MODEL,
  FILTER_SEARCH_PARAMS_PARSER_MODEL,
  PAGE_SEARCH_PARAMS,
  SEARCH_SEARCH_PARAMS,
  useGetFilter,
} from '@digital-twin/components';
import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { z } from 'zod';

import { FILTER_KEY_TYPE } from '../../../components';
import { getInstructionList } from '../api';
import {
  FILTER_INSTRUCTION_TYPE_KEY,
  FILTER_SEARCH_PARAMS_PARSER_INSTRUCTION_TYPE,
} from './instruction-type-filter';

export const useInstructionList = () => {
  const { data, isReady, search, page, setFilter, handleFilterDataChange } = useGetFilter<
    {
      [FILTER_KEY_MODEL]: number;
      [FILTER_KEY_TYPE]: number;
      [FILTER_INSTRUCTION_TYPE_KEY]: string;
    },
    {
      [PAGE_SEARCH_PARAMS]: number;
      [SEARCH_SEARCH_PARAMS]: string;
    }
  >({
    keys: [
      {
        key: FILTER_KEY_MODEL,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_MODEL,
      },
      {
        key: FILTER_KEY_TYPE,
        searchParamsParser: Number,
      },
      {
        key: FILTER_INSTRUCTION_TYPE_KEY,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_INSTRUCTION_TYPE,
      },
    ],
    additionalFilters: [
      {
        key: PAGE_SEARCH_PARAMS,
        searchParamsParser: (data) => z.coerce.number().min(1).catch(1).parse(data),
      },
      {
        key: SEARCH_SEARCH_PARAMS,
        searchParamsParser: (data) => data ?? '',
      },
    ],
    shouldBeResetKeyOnApply: { [PAGE_SEARCH_PARAMS]: 1 },
  });
  const { assetIds, locationIds, modelIds, typeIds, instructionTypeIds } = data;
  const { data: instructionList, isLoading: isInstructionListLoading } = useQuery({
    queryKey: [
      'get_instruction_list',
      { page, search, locationIds, assetIds, modelIds, typeIds, instructionTypeIds },
    ] as const,
    queryFn: ({ queryKey }) => getInstructionList(queryKey[1]),
    enabled: isReady,
    meta: {
      toastId: ['get_instruction_list'],
    },
  });

  const { hasPermission } = useContext(AuthCtx);
  const hasCreatePermission = hasPermission('maintenanceinstruction', 'create');

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

  const maxPage = Math.ceil((instructionList?.count ?? 0) / 4);

  return {
    filter: {
      setFilter,
      data,
      isReady,
      handleFilterDataChange,
      search,
      page,
    },
    handlePageChange,
    instructionList,
    isInstructionListLoading,
    handleSearchChange,
    maxPage,
    hasCreatePermission,
  };
};
