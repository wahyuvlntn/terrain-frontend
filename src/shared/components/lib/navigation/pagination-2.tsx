// import { Pagination as PaginationReusable } from '@digital-twin/reusables';

import { AppPagination } from './app-pagination';

interface Pagination2Props {
  count: number;
  variant: 'text' | 'arrow'; // Ignored
  limit: number;
  page: number;
  onChange: (page: number) => void;
}

export const Pagination2 = ({
  count,
  limit,
  page,
  onChange,
}: Pagination2Props) => {
  const pageCount = Math.max(Math.ceil(count / limit), 1);

  return (
    <AppPagination page={page} max={pageCount} onChange={onChange} />
    // <PaginationReusable
    //   page={page}
    //   max={pageCount}
    //   onChange={onChange}
    //   type="wide"
    // />
  );
};
