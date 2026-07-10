// import { Pagination as PaginationReusable } from '@digital-twin/reusables';
import { SetURLSearchParams } from 'react-router-dom';

import { AppPagination } from './app-pagination';

export interface PaginationProps {
  count: number;
  variant?: 'text' | 'arrow'; // Ignored
  limit: number;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  searchParamsPrefix?: string;
}

export const PAGE_SEARCH_PARAMS = 'page';

export const Pagination = ({
  count,
  limit,
  setSearchParams,
  searchParams,
  searchParamsPrefix = '',
}: PaginationProps) => {
  const page = parseInt(
    searchParams.get(searchParamsPrefix + PAGE_SEARCH_PARAMS) || '1'
  );

  const pageCount = Math.max(Math.ceil(count / limit), 1);

  const handleChange = (toPage: number) => {
    setSearchParams((searchParams) => {
      if (toPage === 1)
        searchParams.delete(searchParamsPrefix + PAGE_SEARCH_PARAMS);
      else
        searchParams.set(
          searchParamsPrefix + PAGE_SEARCH_PARAMS,
          toPage.toString()
        );

      return new URLSearchParams(searchParams);
    });
  };

  return (
    <AppPagination page={page} max={pageCount} onChange={handleChange} />
    // <PaginationReusable
    //   page={page}
    //   max={pageCount}
    //   onChange={handleChange}
    //   type="wide"
    // />
  );
};
