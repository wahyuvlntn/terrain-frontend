import { ComponentPropsWithRef, CSSProperties, forwardRef, ReactNode, useId } from 'react';
import { cn } from '../../utils';
import { PrefixSuffix } from '../Shared/Shared';

interface ToggleSwitchProps
  extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'type' | 'className' | 'style'> {
  label?: string;
  labelPrefix?: ReactNode;
  labelSuffix?: ReactNode;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  labelClassName?: string;
  labelStyles?: CSSProperties;
  loading?: boolean;
}

const toggleSwitchBase =
  'shrink-0 appearance-none m-0 cursor-pointer font-[inherit] text-current w-[1.5em] h-[0.875em] rounded-[1.875em] border border-[var(--afdd-border-default)] bg-[var(--afdd-background-low)] flex justify-start items-center';
const toggleSwitchBefore =
  "before:content-[''] before:w-[0.75em] before:h-[0.75em] before:rounded-full before:border before:border-[var(--afdd-background-low)] before:bg-[var(--afdd-neutral-text-body-light)] before:box-border";
const toggleSwitchChecked =
  'checked:justify-end checked:bg-[var(--afdd-brand-surface-default-primary)] checked:before:border-[var(--afdd-brand-surface-default-primary)]';
const toggleSwitchDisabled = 'disabled:opacity-40';
const toggleSwitchLoading =
  'before:bg-transparent before:outline before:outline-[var(--afdd-neutral-text-body-light)] before:outline-offset-[-0.13em] before:[clip-path:polygon(50%_50%,_0_0,_100%_0,_100%_100%,_0_100%,_0_100%)] before:animate-spin';

export const ToggleSwitch = forwardRef<HTMLInputElement | null, ToggleSwitchProps>(
  function ToggleSwitch(
    {
      label,
      labelPrefix,
      labelSuffix,
      wrapperClassName,
      wrapperStyles,
      labelClassName,
      labelStyles,
      loading,
      disabled,
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
          type="checkbox"
          className={cn(
            toggleSwitchBase,
            toggleSwitchBefore,
            toggleSwitchChecked,
            toggleSwitchDisabled,
            loading && toggleSwitchLoading,
            disabled && 'opacity-40'
          )}
          disabled={!!disabled || !!loading}
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
