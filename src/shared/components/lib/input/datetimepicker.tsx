import { Calendar, Clock } from '@digital-twin/icons';
import {
  formatDateLong,
  formatDateShort,
  formatDateTime,
  formatDateTimeWithoutSec,
  getErrorForm,
  getLocalDateMidnight,
  useFieldState,
} from '@digital-twin/utils';
import clsx from 'clsx';
import { ChangeEvent, ComponentProps, CSSProperties, useId } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import utilStyles from '../util-class.module.scss';
import styles from './datetimepicker.module.scss';

interface DateTimePickerProps<T extends FieldValues>
  extends Omit<ComponentProps<'input'>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (name: string | undefined, date: string) => void;
  label?: string;
  registered?: Path<T>;
  control?: Control<T>;
  labelPosition?: 'top' | 'left';
  detail?: string;
  isError?: boolean;
  hideSecond?: boolean;
  innerContainerStyle?: CSSProperties;
  background?: 'dark' | 'default';
  wrapperClassName?: string;

  /** Manual error message (for non RHF field) */
  error?: string;
}

export const DateTimePicker = <T extends FieldValues>({
  value,
  control,
  onChange,
  registered,
  label,
  name,
  labelPosition = 'top',
  type = 'date',
  detail,
  isError,
  hideSecond,
  innerContainerStyle,
  background,
  wrapperClassName,
  error,
  ...props
}: DateTimePickerProps<T>) => {
  const inputId = useId();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange?.(e.target.name, e.target.value);

  const valueClassNames = clsx(styles.value, utilStyles['input-field']);

  const fieldState = useFieldState({
    control,
    name: registered,
  });

  /** Unified error source */
  const fieldError =
    error ||
    (registered
      ? fieldState?.errors?.[registered]?.message?.toString()
      : undefined);

  return (
    <div
      className={clsx(
        styles['datetimepicker'],
        labelPosition === 'left' && styles['left-label'],
        {
          [styles['input-error']]: isError || fieldError,
        },
        wrapperClassName
      )}
      style={{ width: props.width }}
    >
      {label ? <label htmlFor={inputId}>{label}</label> : null}

      <div
        className={clsx(
          styles.display,
          background === 'dark' && styles['display--dark']
        )}
        style={{
          ...innerContainerStyle,
          width: props.width,
        }}
      >
        {type === 'date' || type === 'datetime-local' ? (
          <Calendar />
        ) : (
          <Clock />
        )}
        {registered ? (
          <Controller
            name={registered}
            control={control}
            render={({ field }) => (
              <>
                <input type={type} {...props} {...field} id={inputId} />
                <div className={valueClassNames}>
                  {field.value
                    ? type === 'datetime-local'
                      ? hideSecond
                        ? formatDateTimeWithoutSec(new Date(field.value))
                        : formatDateTime(new Date(field.value))
                      : type === 'time'
                      ? field.value
                      : formatDateLong(
                          new Date(getLocalDateMidnight(field.value))
                        )
                    : '-'}
                </div>
              </>
            )}
          />
        ) : (
          <>
            <input
              type={type}
              name={name}
              onChange={handleChange}
              id={inputId}
              defaultValue={value}
              {...props}
            />
            <div className={valueClassNames}>
              {value
                ? type === 'datetime-local'
                  ? hideSecond
                    ? formatDateTimeWithoutSec(new Date(value))
                    : formatDateTime(new Date(value))
                  : type === 'time'
                  ? value
                  : formatDateLong(new Date(getLocalDateMidnight(value)))
                : '-'}
            </div>
          </>
        )}
      </div>

      {(fieldError || detail) && (
        <div className={styles['input-detail']}>{fieldError || detail}</div>
      )}
    </div>
  );
};
