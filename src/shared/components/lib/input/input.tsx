import { HideEye, ShowEye } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { Input as InputReusable } from '@digital-twin/reusables';
import clsx from 'clsx';
import React, { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import styles from './input.module.scss';

export type InputProps<T extends FieldValues> = Pick<
  React.ComponentProps<'input'>,
  'type' | 'onChange' | 'value' | 'placeholder' | 'disabled' | 'readOnly'
> & {
  label?: string;
  labelPrefix?: ReactNode;
  labelSuffix?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  isError?: boolean;
  wrapperProps?: React.ComponentProps<'div'>;
  inputWrapperProps?: React.ComponentProps<'div'>; // Ignored
  inputProps?: Omit<
    React.ComponentPropsWithoutRef<'input'>,
    'type' | 'onChange' | 'value' | 'placeholder'
  >;
  detail?: string;
  control?: Control<T>;
  registered?: Path<T>;
  labelPosition?: 'top' | 'left';
  labelStyle?: CSSProperties;
  variant?: 'small' | 'medium' | 'large';
  background?: 'default' | 'dark';
  title?: string;
};

export const Input = <T extends FieldValues>({
  type,
  onChange,
  value,
  placeholder,
  label,
  labelPrefix,
  labelSuffix,
  prefix,
  suffix,
  isError,
  // inputWrapperProps, // Ignored
  wrapperProps,
  inputProps,
  detail,
  disabled,
  readOnly,
  registered,
  control,
  labelPosition = 'top',
  labelStyle,
  variant,
  background = 'default',
  title,
}: InputProps<T>) => {
  const [_type, setType] = useState(type);

  useEffect(() => {
    setType(type);
  }, [type]);

  return registered ? (
    <Controller
      name={registered}
      control={control}
      render={({ field: { onChange, ...field }, fieldState: { error } }) => (
        <InputReusable
          title={title}
          {...inputProps}
          {...field}
          onBlur={inputProps?.onBlur}
          onChange={(e) => {
            onChange(
              _type === 'number' && e.target.value !== ''
                ? +e.target.value
                : e.target.value
            );
          }}
          label={label}
          labelPosition={labelPosition}
          labelPrefix={labelPrefix}
          labelSuffix={labelSuffix}
          inputPrefix={prefix}
          inputSuffix={suffix}
          variant={variant}
          type={_type}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          error={t(error?.message ?? '')}
          wrapperClassName={clsx(
            wrapperProps?.className,
            background === 'dark' && styles.dark
          )}
          wrapperStyles={wrapperProps?.style}
          labelWidth={labelStyle?.width}
          fieldStyles={{ borderRadius: 8 }}
        />
      )}
    />
  ) : (
    <InputReusable
      {...inputProps}
      title={title}
      label={label}
      labelPosition={labelPosition}
      labelPrefix={labelPrefix}
      labelSuffix={labelSuffix}
      inputPrefix={prefix}
      inputSuffix={
        type === 'password' ? (
          <div
            onClick={() => setType(_type === 'password' ? 'text' : 'password')}
            className={clsx(styles['input-operation'], styles['input-icon'])}
          >
            {_type !== 'password' ? <HideEye /> : <ShowEye />}
          </div>
        ) : (
          suffix
        )
      }
      variant={variant}
      type={_type}
      onChange={onChange}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      error={isError && detail ? detail : undefined}
      wrapperClassName={clsx(
        wrapperProps?.className,
        background === 'dark' && styles.dark
      )}
      wrapperStyles={{ ...wrapperProps?.style }}
      labelWidth={labelStyle?.width}
      fieldStyles={{ borderRadius: 8 }}
    />
  );
};
