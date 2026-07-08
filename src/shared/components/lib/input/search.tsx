import { Search as SearchIcon } from '@digital-twin/icons';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { SetURLSearchParams } from 'react-router-dom';

import { useDebounce } from '../hooks';
import { PAGE_SEARCH_PARAMS } from '../navigation';
import { Input } from './input';
import styles from './search.module.scss';

interface SearchProps {
  timeoutMs?: number;
  placeholder?: string;
  width?: string | number;
  searchParams?: URLSearchParams;
  setSearchParams?: SetURLSearchParams;
  searchParamsPrefix?: string;
  value?: string;
  onChange?: (value: string) => void;
  pageSearchParamsPrefix?: string[];
  label?: string;
  flex?: string;
  background?: 'default' | 'dark';
  wrapperClassName?: string;
}

export const SEARCH_SEARCH_PARAMS = 'search';

export const Search = ({
  timeoutMs,
  placeholder,
  width,
  searchParams,
  setSearchParams,
  searchParamsPrefix = '',
  value,
  onChange,
  pageSearchParamsPrefix,
  label,
  flex,
  background = 'default',
  wrapperClassName,
}: SearchProps) => {
  const [firstRender, setFirstRender] = useState(true);
  const [search, setSearch] = useState(
    searchParams
      ? searchParams.get(searchParamsPrefix + SEARCH_SEARCH_PARAMS) || ''
      : value
      ? value
      : ''
  );
  const { debouncedVal: debouncedSearch } = useDebounce(search, timeoutMs);

  useEffect(() => {
    if (typeof debouncedSearch !== 'string') return;

    if (setSearchParams)
      setSearchParams((searchParams) => {
        if (!firstRender) {
          searchParams.delete(PAGE_SEARCH_PARAMS);
          pageSearchParamsPrefix?.forEach((prefix) =>
            searchParams.delete(prefix + PAGE_SEARCH_PARAMS)
          );
        }
        if (debouncedSearch)
          searchParams.set(
            searchParamsPrefix + SEARCH_SEARCH_PARAMS,
            debouncedSearch
          );
        else searchParams.delete(searchParamsPrefix + SEARCH_SEARCH_PARAMS);
        return searchParams;
      });
    else if (onChange && !firstRender) {
      onChange(debouncedSearch);
    }
  }, [debouncedSearch, searchParamsPrefix, pageSearchParamsPrefix]);

  return (
    <Input
      type={'text'}
      label={label}
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setFirstRender(false);
      }}
      placeholder={placeholder}
      suffix={<SearchIcon />}
      wrapperProps={{
        style: { width, flex },
        className: clsx(
          wrapperClassName,
          background === 'dark' ? styles.dark : undefined
        ),
      }}
      inputWrapperProps={{ style: { height: '40px' } }}
    />
  );
};
