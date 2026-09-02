import { Filter, useGetFilter } from '@digital-twin/components';
import type { PropsWithChildren } from 'react';
import { z } from 'zod';
import { FILTER_KEY_BUILDING, FILTER_SEARCH_PARAMS_PARSER_BUILDING } from './filter.building';
import { FILTER_KEY_CAPACITY, FILTER_SEARCH_PARAMS_PARSER_CAPACITY } from './filter.capacity';
import {
  FILTER_KEY_EQUIPMENT_TYPE,
  FILTER_SEARCH_PARAMS_PARSER_EQUIPMENT_TYPE,
} from './filter.equipment-type';

export const PMFilterProvider = ({ children }: PropsWithChildren) => {
  const { handleFilterDataChange, ...filter } = useGetFilter<
    {
      [FILTER_KEY_BUILDING]: string;
      [FILTER_KEY_EQUIPMENT_TYPE]: string;
      [FILTER_KEY_CAPACITY]: string;
    },
    {
      start: string | null;
      end: string | null;
      search: string;
      page: number;
      selected: string | null;
    }
  >({
    keys: [
      {
        key: FILTER_KEY_BUILDING,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_BUILDING,
      },
      {
        key: FILTER_KEY_EQUIPMENT_TYPE,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_EQUIPMENT_TYPE,
      },
      {
        key: FILTER_KEY_CAPACITY,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_CAPACITY,
      },
    ],
    additionalFilters: [
      {
        key: 'start',
      },
      {
        key: 'end',
      },
      { key: 'search', searchParamsParser: (data) => data ?? '' },
      {
        key: 'page',
        searchParamsParser: (data) => {
          const coerced = z.coerce.number().catch(1).parse(data);
          if (coerced > 0) {
            return coerced;
          } else {
            return 1;
          }
        },
      },
      { key: 'selected' },
    ],
    // shouldBeResetKeyOnApply: { page: 1 },
  });

  return (
    <Filter onDataChange={handleFilterDataChange} {...filter}>
      {children}
    </Filter>
  );
};
