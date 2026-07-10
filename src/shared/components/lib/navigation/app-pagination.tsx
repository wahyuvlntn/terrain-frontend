import { ChevronLeft, ChevronRight } from '@digital-twin/icons';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

import styles from './app-pagination.module.scss';

interface AppPaginationProps {
  page: number;
  max: number;
  onChange: (toPage: number) => void;
  separator?: string;
}

export const AppPaginationCore = ({
  page,
  max,
  onChange,
  separator = 'of',
}: AppPaginationProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  const handleChangePage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPage(Number(e.target.value));
  };

  const navigatePage = () => {
    if (currentPage < 1) {
      onChange(1);
      setCurrentPage(1);
    } else if (currentPage > max) {
      onChange(max);
      setCurrentPage(max);
    } else {
      onChange(currentPage);
    }
  };

  const handleBlur = () => {
    navigatePage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigatePage();
    }
  };

  return (
    <div className={styles['page-state']}>
      <input
        className={styles['page-state__page']}
        value={currentPage}
        max={max}
        min={1}
        type="number"
        onChange={handleChangePage}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <div className={styles['page-state__of']}>{separator}</div>
      <div>{max}</div>
    </div>
  );
};

type BtnProps = {
  onClick?: () => void;
  className?: string;
};

export const PrevBtn = ({ onClick, className }: BtnProps) => (
  <div className={clsx(styles['button'], className)} onClick={onClick}>
    <ChevronLeft width={20} height={20} />
  </div>
);

export const NextBtn = ({ onClick, className }: BtnProps) => (
  <div className={clsx(styles['button'], className)} onClick={onClick}>
    <ChevronRight width={20} height={20} />
  </div>
);

export const AppPagination = ({
  page,
  max,
  onChange,
  separator = 'of',
}: AppPaginationProps) => {
  const handlePrevPage = () => {
    if (page > 1) {
      onChange(page - 1);
    }
  };
  const handleFirstPage = () => {
    onChange(1);
  };
  const handleNextPage = () => {
    if (page < max) {
      onChange(page + 1);
    }
  };
  const handleLastPage = () => {
    onChange(max);
  };

  return (
    <div className={styles['pagination']}>
      <div className={styles['buttons']} style={{ opacity: page <= 1 ? 0.4 : 1 }}>
        <div className={styles['button']} onClick={handleFirstPage}>
          <ChevronLeft width={20} height={20} />
          <ChevronLeft width={20} height={20} style={{ marginLeft: -14 }} />
        </div>
        <PrevBtn onClick={handlePrevPage} />
      </div>
      <AppPaginationCore page={page} onChange={onChange} max={max} separator={separator} />
      <div className={styles['buttons']} style={{ opacity: page >= max ? 0.4 : 1 }}>
        <NextBtn onClick={handleNextPage} />
        <div className={styles['button']} onClick={handleLastPage}>
          <ChevronRight width={20} height={20} />
          <ChevronRight width={20} height={20} style={{ marginLeft: -14 }} />
        </div>
      </div>
    </div>
  );
};
