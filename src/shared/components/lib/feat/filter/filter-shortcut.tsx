import { ChevronLeftFill, ChevronRightFill, Close } from '@digital-twin/icons';
import clsx from 'clsx';
import React, { ReactNode, useEffect, useReducer, useRef } from 'react';

import styles from './filter-shortcut.module.scss';

interface FilterItemProps {
  name: string;
  onRemove?: () => void;
}

export const FilterItem = ({ name, onRemove }: FilterItemProps) => {
  return (
    <div className={styles['filter-item']}>
      <span title={name}>{name}</span>
      {onRemove ? <Close onClick={onRemove} /> : null}
    </div>
  );
};

type FilterShortcutProps = {
  width?: number;
  children: ReactNode;
};

export const FilterShortcut = ({
  width = 300,
  children,
}: FilterShortcutProps) => {
  const filterShortcutRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => forceUpdate(), [children]);

  const hideChevron =
    (filterShortcutRef.current?.scrollWidth ?? 0) <=
    (filterShortcutRef.current?.clientWidth ?? 0);

  const handleChevronClick = (direction: 'left' | 'right') => {
    const scrollAmount =
      direction === 'left'
        ? -(filterShortcutRef.current?.offsetWidth ?? 0)
        : filterShortcutRef.current?.offsetWidth;
    filterShortcutRef.current?.scrollBy({ left: scrollAmount });
    forceUpdate();
  };

  return (
    <div className={styles['filter-shortcut']}>
      {hideChevron ? null : (
        <ChevronLeftFill
          className={clsx(
            !filterShortcutRef.current?.scrollLeft && styles.disabled
          )}
          onClick={() => handleChevronClick('left')}
        />
      )}
      <div
        className={styles.list}
        ref={filterShortcutRef}
        style={{ width, minWidth: width, maxWidth: width }}
      >
        {children}
      </div>
      {hideChevron ? null : (
        <ChevronRightFill
          className={clsx(
            (filterShortcutRef.current?.scrollLeft ?? 0) +
              (filterShortcutRef.current?.offsetWidth ?? 0) ===
              filterShortcutRef.current?.scrollWidth && styles.disabled
          )}
          onClick={() => handleChevronClick('right')}
        />
      )}
    </div>
  );
};
