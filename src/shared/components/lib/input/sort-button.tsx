import { SortAscending, SortDefault, SortDescending } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import React, { useMemo } from 'react';

import styles from './input.module.scss';
import sortStyles from './sort-button.module.scss';

type SortButton = Omit<React.ComponentProps<'span'>, 'onChange'> & {
  value?: 'ascending' | 'descending';
  displayText?: boolean;
  onChange?: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    value: 'ascending' | 'descending'
  ) => void;
  label?: string;
  align?: 'left' | 'right' | 'center';
  wrapperProps?: React.ComponentProps<'div'>;
  disabled?: boolean;
  labelPosition?: 'left' | 'top';
};

export const SortButton = ({
  label,
  align,
  wrapperProps,
  disabled,
  className,
  value = 'ascending',
  onChange,
  labelPosition,
  displayText = true,
  ...props
}: SortButton) => {
  const values: (typeof value)[] = ['ascending', 'descending'];
  const id = useMemo(() => (label ? nanoid(5) : undefined), [label]);

  return (
    <div
      {...wrapperProps}
      onClick={(e) => onChange?.(e, values[(values.indexOf(value) + 1) % 2])}
      className={clsx(
        styles['input'],
        sortStyles['sort-button'],
        labelPosition === 'left' && styles['left-label'],
        wrapperProps?.className,
        !displayText && sortStyles['without-text']
      )}
    >
      {id && (
        <label className={styles['input-label']} htmlFor={id}>
          {label}
        </label>
      )}
      <div
        className={clsx(
          styles['input-field-wrapper'],
          sortStyles['sort-button-wrapper']
        )}
      >
        {displayText && <span
          id={id}
          className={clsx(
            styles['input-field'],
            styles[`input-align-${align}`],
            sortStyles['capitalize'],
            className
          )}
          {...props}
        >
          {!displayText
            ? ''
            : value === 'ascending'
            ? t('common.ascending')
            : t('common.descending')}
        </span>}
        {value === 'ascending' ? (
          <SortAscending />
        ) : value === 'descending' ? (
          <SortDescending />
        ) : (
          <SortDefault />
        )}
      </div>
    </div>
  );
};
