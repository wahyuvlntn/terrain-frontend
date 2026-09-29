import {
  ComponentPropsWithRef,
  CSSProperties,
  forwardRef,
  ReactNode,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from 'react';
import { cn } from '../../utils';
import { PrefixSuffix } from '../Shared/Shared';

interface CheckboxProps
  extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'type' | 'className' | 'style'> {
  indeterminate?: boolean;
  label?: string;
  labelPrefix?: ReactNode;
  labelSuffix?: ReactNode;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  labelClassName?: string;
  labelStyles?: CSSProperties;
  checkboxClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement | null, CheckboxProps>(function Checkbox(
  {
    label,
    labelPrefix,
    labelSuffix,
    indeterminate,
    wrapperClassName,
    wrapperStyles,
    labelClassName,
    labelStyles,
    checkboxClassName,
    ...inputProps
  },
  outerRef
) {
  // Generate unique id
  const id = useId();

  // Create an innerRef to the checkbox for modifying indeterminate field
  const innerRef = useRef<HTMLInputElement>(null);

  // Pass innerRef to outerRef
  useImperativeHandle<HTMLInputElement | null, HTMLInputElement | null>(
    outerRef,
    () => innerRef.current,
    []
  );

  useEffect(() => {
    if (!innerRef.current || indeterminate === undefined) {
      return;
    }

    innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

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
        ref={innerRef}
        type="checkbox"
        className={cn(
          'shrink-0 appearance-none m-0 cursor-pointer font-[inherit] text-current w-[1.125em] h-[1.125em] rounded-[0.25em] border border-(--look-line-strong) bg-(--afdd-background-lowest) flex justify-center items-center transition-[background-color] duration-120 overflow-hidden',
          "before:content-[''] before:opacity-0 before:w-[0.3em] before:h-[0.6em] before:border-0 before:border-r-[0.07em] before:border-b-[0.07em] before:border-solid before:border-(--afdd-neutral-text-body-light) before:mb-[0.24em] before:rotate-45",
          'checked:border-none checked:bg-(--afdd-brand-surface-default-primary) checked:before:opacity-100',
          'indeterminate:border-none indeterminate:bg-(--afdd-brand-surface-default-primary) indeterminate:before:opacity-100 indeterminate:before:w-[0.625em] indeterminate:before:h-0 indeterminate:before:border-none indeterminate:before:border-b-[0.07em] indeterminate:before:border-solid indeterminate:before:border-(--afdd-neutral-text-body-light) indeterminate:before:mb-0 indeterminate:before:rotate-0',
          'disabled:opacity-40',
          checkboxClassName
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
});
