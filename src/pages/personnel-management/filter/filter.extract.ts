import { useExtractFilter } from '@digital-twin/components';

import { FILTER_KEY_BUILDING } from './filter.building';
import { FILTER_KEY_CAPACITY } from './filter.capacity';
import { FILTER_KEY_EQUIPMENT_TYPE } from './filter.equipment-type';

export const useExtractFilterPM = () =>
  useExtractFilter<
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
  >();
