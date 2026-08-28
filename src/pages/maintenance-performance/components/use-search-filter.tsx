import { useDebounce } from '@digital-twin/components';
import { useLanguageSwitcher } from '@digital-twin/utils';
import i18next from 'i18next';
import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_DEBOUNCE_SEARCH_INTERVAL, getKeyByValue } from '../constant';

export interface TUseSearchFilter {
  debounceInterval?: number;
  initialSearch?: string;
}

export const useSearchFilter = ({
  debounceInterval = DEFAULT_DEBOUNCE_SEARCH_INTERVAL,
  initialSearch,
}: TUseSearchFilter) => {
  const { currentLanguage } = useLanguageSwitcher();
  const [searchInput, setSearchInput] = useState<string | undefined>(initialSearch);

  useEffect(() => {
    if (initialSearch) {
      setSearchInput(initialSearch);
    }
  }, [initialSearch]);

  const commonSearch = useMemo(() => {
    if (!searchInput) return searchInput;

    const mainSearch = i18next.getDataByLanguage('en')?.translation?.common as
      | Record<string, string>
      | undefined;

    const translateSearch = getKeyByValue(
      i18next.getDataByLanguage(currentLanguage)?.translation?.common as unknown as Record<
        string,
        string
      >,
      String(searchInput)
    );

    // If no translation is found, return the original search input
    if (!translateSearch) return searchInput as string;

    // If mainSearch is available, try to return the corresponding translated value
    if (mainSearch && mainSearch[translateSearch]) {
      return mainSearch[translateSearch] as string;
    }

    // If no match is found, return the search input as a fallback
    return searchInput as string;
  }, [searchInput, currentLanguage]);

  const { debouncedVal: searchFilter } = useDebounce(commonSearch, debounceInterval);

  const handleSearchInputChange = (e: string) => {
    setSearchInput(e);
  };

  return {
    searchFilter,
    handleSearchInputChange,
    searchInput,
  };
};
