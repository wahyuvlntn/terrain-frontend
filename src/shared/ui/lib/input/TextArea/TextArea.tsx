import { ComponentPropsWithRef, CSSProperties, forwardRef, ReactNode, useId } from 'react';
import { cn } from '../../utils';
import { PrefixSuffix } from '../Shared/Shared';

interface TextAreaProps
  extends Omit<ComponentPropsWithRef<'textarea'>, 'id' | 'className' | 'style'> {
  error?: string;
  label?: string;
  labelPosition?: 'top' | 'top-inside';
  labelPrefix?: ReactNode;
  labelSuffix?: ReactNode;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  fieldClassName?: string;
  fieldStyles?: CSSProperties;
}

export const TextArea = forwardRef<HTMLTextAreaElement | null, TextAreaProps>(function TextArea(
  {
    error,
    label,
    labelPosition = 'top',
    labelPrefix,
    labelSuffix,
    wrapperClassName,
    wrapperStyles,
    fieldClassName,
    fieldStyles,
    ...textAreaProps
  },
  ref
) {
  // Generate unique id
  const id = useId();

  return (
    <div
      className={cn(
        'font-[inherit] text-base font-medium text-(--afdd-neutral-text-title-heading) flex flex-col gap-[0.375em] relative z-0 bg-inherit',
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
            labelPosition === 'top-inside' &&
              'absolute bg-inherit h-[1.25em] z-1 left-[0.375em] -top-2 pr-[0.3em] pl-[0.3em] max-w-[calc(100%-0.8em)] box-border text-xs'
          )}
        >
          <PrefixSuffix prefix={labelPrefix} suffix={labelSuffix} large>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap" title={label}>
              {label}
            </span>
          </PrefixSuffix>
        </label>
      ) : null}

      <div
        className="w-full shrink-0 flex flex-col items-center gap-[0.375em]"
        style={{
          flex: !textAreaProps.rows ? '1 1 0' : undefined,
        }}
      >
        <textarea
          id={id}
          ref={ref}
          data-field-disabled={textAreaProps.disabled || undefined}
          className={cn(
            'w-full box-border inline-block h-auto px-[0.5625em] py-[0.5em] rounded border border-(--afdd-border-default) bg-(--afdd-background-low) transition-all duration-120',
            error && 'border-(--afdd-condition-critical-primary)',
            textAreaProps.readOnly && 'border-dashed',
            textAreaProps.disabled && 'bg-(--afdd-background-lowest)',
            labelPosition === 'top-inside' && 'bg-inherit',
            'resize-none font-[inherit] text-[0.875em] font-medium text-current outline-none',
            'placeholder:text-current placeholder:opacity-40',
            '[-webkit-autofill]:delay-[99999s]',
            fieldClassName
          )}
          style={{
            flex: !textAreaProps.rows ? '1 1 0' : undefined,
            ...fieldStyles,
          }}
          {...textAreaProps}
        />

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
