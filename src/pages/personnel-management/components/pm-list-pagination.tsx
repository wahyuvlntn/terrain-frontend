import { Pagination2 } from '@digital-twin/components';
import { useEffect } from 'react';
import { useExtractFilterPM } from '../filter/filter.extract';

interface PMListPaginationProps {
  count: number;
  limit: number;
  hold?: boolean;
}

export const PMListPagination = ({ count, limit, hold }: PMListPaginationProps) => {
  const {
    filter: { page },
    setFilter,
  } = useExtractFilterPM();

  const changePage = (page: number) => {
    setFilter((prev) => ({ ...prev, page }));
  };

  // Handle when page is outside of max page
  useEffect(() => {
    if (hold || !count || !limit) {
      return;
    }
    const maxPage = Math.ceil(count / limit);
    if (page > maxPage) {
      changePage(maxPage);
    }
  }, [hold, count, limit, page]);

  return (
    <Pagination2 count={count} limit={limit} page={page} onChange={changePage} variant="arrow" />
  );
};
