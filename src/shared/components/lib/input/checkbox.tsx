import { Checkbox as CheckboxReusable } from '@digital-twin/reusables';
import { ComponentProps, CSSProperties } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

interface CheckboxProps<T extends FieldValues>
  extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'ref'> {
  value?: boolean;
  onChange?: (name: string | undefined, checked: boolean) => void;
  label?: string;
  indeterminate?: boolean;
  wrapperStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  registered?: Path<T>;
  control?: Control<T>;
  checkboxClassName?: string;
}

export const Checkbox = <T extends FieldValues>({
  control,
  registered,
  onChange,
  value,
  wrapperStyle,
  labelStyle,
  checkboxClassName,
  ...props
}: CheckboxProps<T>) =>
  registered ? (
    <Controller
      name={registered}
      control={control}
      render={({ field }) => (
        <CheckboxReusable
          {...props}
          {...field}
          checked={field.value}
          wrapperStyles={wrapperStyle}
          labelStyles={labelStyle}
          checkboxClassName={checkboxClassName}
        />
      )}
    />
  ) : (
    <CheckboxReusable
      {...props}
      checked={value}
      onChange={(e) => onChange?.(e.target.name, e.target.checked)}
      wrapperStyles={wrapperStyle}
      labelStyles={labelStyle}
      checkboxClassName={checkboxClassName}
    />
  );
