import { Dropdown as DropdownReusable } from '@digital-twin/reusables';
import clsx from 'clsx';
import { CSSProperties, ReactNode } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import styles from './dropdown.module.scss';

export interface DropdownOption {
  value: string;
  label: string;
  prefix?: ReactNode;
}

export interface DropdownProps<T extends FieldValues> {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  registered?: Path<T>;
  control?: Control<T>;
  options?: DropdownOption[];
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  detail?: string;
  labelPosition?: 'left' | 'top';
  labelWidth?: number | string;
  variant?: 'small' | 'medium' | 'large';
  searchable?: boolean;
  onArrowClick?: () => void;
  arrowIcon?: ReactNode;
  background?: 'default' | 'dark';
}

export const Dropdown = <T extends FieldValues>({
  control,
  registered,
  wrapperClassName,
  background = 'default',
  ...props
}: DropdownProps<T>) => {
  const className = clsx(
    wrapperClassName,
    background === 'dark' ? styles.dark : undefined
  );
  return registered ? (
    <Controller
      control={control}
      name={registered}
      render={({ field, fieldState: { error } }) => (
        <DropdownReusable
          {...props}
          {...field}
          wrapperClassName={className}
          error={error?.message}
          fieldStyles={{ borderRadius: 8 }}
          optionStyles={{
            zIndex: 10
          }}
        />
      )}
    />
  ) : (
    <DropdownReusable
      {...props}
      wrapperClassName={className}
      fieldStyles={{ borderRadius: 8 }}
      optionStyles={{
        zIndex: 10
      }}
    />
  );
};
