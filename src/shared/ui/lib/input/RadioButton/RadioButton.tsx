import { ComponentPropsWithRef, CSSProperties, forwardRef, ReactNode, useId } from 'react';
import { cn } from '../../utils';
import { PrefixSuffix } from '../Shared/Shared';

interface RadioButtonProps
  extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'type' | 'className' | 'style'> {
  label?: string;
  labelPrefix?: ReactNode;
  labelSuffix?: ReactNode;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  labelClassName?: string;
  labelStyles?: CSSProperties;
}

export const RadioButton = forwardRef<HTMLInputElement | null, RadioButtonProps>(
  function RadioButton(
    {
      label,
      labelPrefix,
      labelSuffix,
      wrapperClassName,
      wrapperStyles,
      labelClassName,
      labelStyles,
      ...inputProps
    },
    ref
  ) {
    // Generate unique id
    const id = useId();

    return (
      <div
        className={cn(
          'font-[inherit] text-base font-medium text-(--afdd-neutral-text-title-heading) flex items-center gap-2',
          wrapperClassName
        )}
        style={wrapperStyles}
      >
        <input
          id={id}
          ref={ref}
          type="radio"
          className={cn(
            'shrink-0 appearance-none m-0 cursor-pointer font-[inherit] text-current w-[1.125em] h-[1.125em] rounded-full border border-(--afdd-border-default) bg-(--afdd-background-low) flex justify-center items-center transition-[background-color] duration-120',
            "before:content-[''] before:opacity-0 before:w-[0.375em] before:h-[0.375em] before:rounded-full before:bg-(--afdd-neutral-text-body-light)",
            'checked:border-none checked:bg-(--afdd-brand-surface-default-primary) checked:before:opacity-100',
            'disabled:opacity-40'
          )}
          {...inputProps}
        ></input>
        {label ? (
          <label
            htmlFor={id}
            className={cn(
              'shrink-0 flex items-center gap-[0.375em] flex-1 cursor-pointer',
              labelClassName
            )}
            style={labelStyles}
          >
            <PrefixSuffix prefix={labelPrefix} suffix={labelSuffix} large>
              <span className="overflow-hidden text-ellipsis whitespace-nowrap" title={label}>
                {label}
              </span>
            </PrefixSuffix>
          </label>
        ) : null}
      </div>
    );
  }
);
