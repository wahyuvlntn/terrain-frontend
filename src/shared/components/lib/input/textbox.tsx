import { TextArea } from '@digital-twin/reusables';
import clsx from 'clsx';
import React, { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import { Control, Controller, type FieldValues, Path } from 'react-hook-form';

import styles from './textbox.module.scss';

export type TextboxProps<T extends FieldValues> = Omit<
  ComponentPropsWithRef<'textarea'>,
  'id' | 'className' | 'style'
> & {
  error?: string;
  label?: string;
  labelPrefix?: ReactNode;
  labelSuffix?: ReactNode;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  control?: Control<T>;
  registered?: Path<T>;
  detail?: string;
  background?: 'default' | 'dark'
};

export const TextBox = <T extends FieldValues>({
  registered,
  control,
  detail,
  wrapperClassName,
  background,
  ...props
}: TextboxProps<T>) => {
  return registered ? (
    <Controller
      name={registered}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextArea
          {...props}
          {...field}
          error={error?.message ?? detail}
          wrapperClassName={clsx(
            wrapperClassName,
            !error && detail && styles.detail,
            background === 'dark' && styles.dark,
          )}
        />
      )}
    />
  ) : (
    <TextArea
      {...props}
      error={props.error ?? detail}
      wrapperClassName={clsx(
        wrapperClassName,
        !props.error && detail && styles.detail,
        background === 'dark' && styles.dark,
      )}
    />
  );
};
