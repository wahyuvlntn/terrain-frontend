import { ComponentPropsWithRef, CSSProperties, forwardRef, ReactNode, useId } from 'react';
import { cn } from '../../utils';
import { PrefixSuffix } from '../Shared/Shared';

interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'className' | 'style'> {
  error?: string;
  label?: string;
  labelPosition?: 'top' | 'left' | 'top-inside';
  labelPrefix?: ReactNode;
  labelSuffix?: ReactNode;
  inputPrefix?: ReactNode;
  inputSuffix?: ReactNode;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  fieldClassName?: string;
  fieldStyles?: CSSProperties;
  labelWidth?: number | string;
  variant?: 'small' | 'medium' | 'large';
}

export const Input = forwardRef<HTMLInputElement | null, InputProps>(function Input(
  {
    error,
    label,
    labelPosition = 'top',
    labelPrefix,
    labelSuffix,
    inputPrefix,
    inputSuffix,
    wrapperClassName,
    wrapperStyles,
    fieldClassName,
    fieldStyles,
    labelWidth,
    variant,
    ...inputProps
  },
  ref
) {
  // Generate unique id
  const id = useId();

  return (
    <div
      className={cn(
        'font-[inherit] text-base font-medium text-(--afdd-neutral-text-title-heading) flex flex-col gap-[0.375em] relative z-0 bg-inherit',
        labelPosition === 'left' && 'flex-row items-start',
        labelPosition === 'top-inside' && 'mt-2',
        labelPosition === 'top-inside' && 'has-data-field-disabled:opacity-40',
        wrapperClassName
      )}
      style={wrapperStyles}
    >
      {label ? (
        <label
          htmlFor={id}
          title={label}
          className={cn(
            'shrink-0 flex items-center gap-[0.375em]',
            labelPosition === 'left' && 'justify-end h-[2.25em]',
            labelPosition === 'left' && variant === 'small' && 'h-[1.75em]',
            labelPosition === 'left' && variant === 'large' && 'h-[2.625em]',
            labelPosition === 'top-inside' &&
              'absolute bg-inherit h-[1.25em] z-1 left-[0.375em] -top-2 pr-[0.3em] pl-[0.3em] max-w-[calc(100%-0.8em)] box-border text-xs',
            labelPosition === 'top-inside' && variant === 'small' && 'top-[-0.6em]'
          )}
          style={{ width: labelWidth }}
        >
          <PrefixSuffix prefix={labelPrefix} suffix={labelSuffix} large>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap" title={label}>
              {label}
            </span>
          </PrefixSuffix>
        </label>
      ) : null}

      <div
        className={cn(
          'w-full shrink-0 flex flex-col items-center gap-[0.375em]',
          labelPosition === 'left' && 'w-auto flex-1'
        )}
      >
        <div
          data-field-disabled={inputProps.disabled || undefined}
          className={cn(
            'w-full box-border flex items-center gap-[0.375em] h-[2.25em] px-[0.5625em] rounded border border-(--afdd-border-default) bg-(--afdd-background-low) transition-all duration-120',
            variant === 'small' && 'py-[0.25em] h-[1.75em]',
            variant === 'large' && 'h-[2.625em]',
            error && 'border-(--afdd-condition-critical-primary)',
            inputProps.readOnly && 'border-dashed',
            inputProps.disabled && 'bg-(--afdd-background-lowest)',
            labelPosition === 'top-inside' && 'bg-inherit',
            fieldClassName
          )}
          style={fieldStyles}
        >
          <PrefixSuffix prefix={inputPrefix} suffix={inputSuffix} large={variant === 'large'}>
            <input
              id={id}
              ref={ref}
              className={cn(
                'flex-1 w-0 font-[inherit] text-[0.875em] font-medium text-current border-none outline-none bg-transparent',
                variant === 'large' && 'text-base',
                'placeholder:text-current placeholder:opacity-40',
                '[-webkit-autofill]:delay-[99999s]',
                '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0',
                'overflow-hidden text-ellipsis whitespace-nowrap'
              )}
              {...inputProps}
            />
          </PrefixSuffix>
        </div>

        {error ? (
          <div title={error} className="w-full flex items-center">
            <span className="flex-1 w-0 font-[inherit] text-[0.875em] font-medium text-(--afdd-condition-critical-primary) overflow-hidden text-ellipsis whitespace-nowrap">
              {error}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
});
