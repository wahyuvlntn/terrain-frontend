import {
  autoUpdate,
  FloatingPortal,
  flip,
  offset,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { FocusEvent, KeyboardEvent, MouseEvent, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../utils';
import { Checkbox } from '../Checkbox/Checkbox';
import { PrefixSuffix } from '../Shared/Shared';
import { DropdownOption, DropdownProps } from './Dropdown';
import {
  getActionFromKey,
  getUpdatedIndex,
  isElementInView,
  isScrollable,
  maintainScrollVisibility,
  SelectActions,
} from './Dropdown.helper';

interface DropdownMultipleProps
  extends Omit<DropdownProps, 'options' | 'searchable' | 'value' | 'onChange'> {
  options?: DropdownOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  multipleSelectedLabel?: (selectedCounts: number) => string;
}

export const DropdownMultiple = ({
  disabled,
  error,
  label,
  labelPosition,
  labelPrefix,
  labelSuffix,
  labelWidth,
  onArrowClick,
  onChange,
  options,
  placeholder,
  readOnly,
  value,
  variant,
  wrapperClassName,
  wrapperStyles,
  fieldClassName,
  fieldStyles,
  optionClassName,
  optionStyles,
  optionItemClassName,
  optionItemStyles,
  multipleSelectedLabel = (n) => `Top ${n} selected`,
}: DropdownMultipleProps) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(null);
  }, [open]);

  useEffect(() => {
    setSelected(value);
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  const { floatingStyles, refs, context } = useFloating({
    open: open,
    onOpenChange: (open) => {
      setOpen(open);
      if (!open) onChange?.(selected ?? []);
    },
    middleware: [
      offset(4),
      // Adjust listbox width to same as the floating reference
      size({
        apply({ rects, elements }) {
          elements.floating.style.width = `${rects.reference.width.toString()}px`;
        },
      }),
      // Flip on edges
      flip(),
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps } = useInteractions([click, dismiss, role]);

  // Refs - DIV
  const el = useRef<HTMLDivElement>(null);
  const labelEl = useRef<HTMLDivElement>(null);
  const comboEl = refs.reference as React.RefObject<HTMLDivElement>; // Treat the same as normal ref
  const listboxEl = refs.floating as React.RefObject<HTMLDivElement>; // Treat the same as normal ref
  const optionEls = useRef<Map<string, HTMLDivElement>>(new Map());

  // Generate unique id
  const id = useId();
  const comboId = `${id}-combo`;
  const listboxId = `${id}-listbox`;
  const labelId = label ? `${id}-label` : '';
  const activeId = open && value ? `${id}-option-${value}` : '';

  // Callbacks
  const onLabelClick =
    !readOnly && !disabled
      ? () => {
          comboEl.current?.focus();
        }
      : undefined;

  const onComboKeyDown =
    !readOnly && !disabled
      ? (event: KeyboardEvent<HTMLDivElement>) => {
          const action = getActionFromKey(event, open);

          switch (action) {
            case SelectActions.Last:
            case SelectActions.First:
              event.preventDefault();
              updateMenuState(true);

              if (options) {
                const max = options.length - 1;
                const i = getUpdatedIndex(activeIndex ?? 0, max, action);
                setActiveIndex(i);
              }
              break;
            // intentional fallthrough
            case SelectActions.Next:
            case SelectActions.Previous:
            case SelectActions.PageUp:
            case SelectActions.PageDown:
              event.preventDefault();

              if (options) {
                const max = options.length - 1;
                const i = getUpdatedIndex(activeIndex ?? 0, max, action);
                setActiveIndex(i);
              }
              break;
            case SelectActions.CloseSelect:
              event.preventDefault();

              if (activeIndex !== null) {
                onOptionClick(options?.[activeIndex]?.value ?? '');
              }
              break;
            // intentional fallthrough
            case SelectActions.Close:
              event.preventDefault();
              updateMenuState(false);
              onChange?.(selected ?? []);
              break;
            case SelectActions.Open:
              event.preventDefault();
              updateMenuState(true);
              break;
          }
        }
      : undefined;

  const onComboBlur =
    !readOnly && !disabled
      ? (event: FocusEvent<HTMLDivElement>) => {
          // do nothing if relatedTarget is contained within listboxEl or comboEl
          if (
            !!listboxEl.current?.contains(event.relatedTarget) ||
            !!comboEl.current?.contains(event.relatedTarget)
          ) {
            return;
          }

          updateMenuState(false, false);
        }
      : undefined;

  const onComboClick =
    !readOnly && !disabled
      ? () => {
          updateMenuState(!open, false);
        }
      : undefined;

  const onOptionChange = (value: string) => {
    setSelected((prev) => {
      if (prev?.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      return [...(prev ?? []), value];
    });

    const optionEl = optionEls.current.get(value);

    if (!listboxEl.current || !optionEl) {
      return;
    }

    // ensure the new option is in view
    if (isScrollable(listboxEl.current)) {
      maintainScrollVisibility(optionEl, listboxEl.current);
    }

    // ensure the new option is visible on screen
    // ensure the new option is in view
    if (!isElementInView(optionEl)) {
      optionEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const onOptionClick = (value: string) => {
    onOptionChange(value);
  };

  const onResetClick = () => {
    setSelected(value);
  };

  const onClearClick = () => {
    setSelected([]);
  };

  const onOptionMouseDown =
    !readOnly && !disabled
      ? (e: MouseEvent<HTMLDivElement>) => {
          // Prevent 'blur' event on el
          e.preventDefault();
        }
      : undefined;

  const updateMenuState = (newOpen: boolean, callFocus?: boolean) => {
    if (open === newOpen) {
      return;
    }

    // update state
    setOpen(newOpen);

    if (!comboEl.current) {
      return;
    }

    // scroll into activedescendant
    if (newOpen && !isElementInView(comboEl.current)) {
      comboEl.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // move focus back to the combobox, if needed
    callFocus && comboEl.current.focus();
  };

  // Generate listbox options
  const listboxOptions = (() => {
    if (!!readOnly || !!disabled || !options) {
      return null;
    }

    return options.map((option, index) => {
      const isActive = activeIndex === index;
      const disabled = option.disabled;
      const isSelected = selected?.includes(option.value);

      return (
        <div
          key={index}
          id={`${id}-option-${option.value}`}
          ref={(el) => {
            if (el) {
              optionEls.current.set(option.value, el);
            } else {
              optionEls.current.delete(option.value);
            }
          }}
          role="option"
          className={cn(
            'flex items-center gap-1 bg-transparent px-[0.875em] py-[0.5em] rounded-[4px] hover:bg-(--afdd-background-high)',
            isActive && 'bg-(--afdd-background-high) shadow-[inset_3px_0_0_var(--afdd-brand-surface-default-primary)]',
            disabled && 'opacity-40',
            optionItemClassName
          )}
          style={optionItemStyles}
          aria-selected={isSelected}
          aria-disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            onOptionClick(option.value);
          }}
          onMouseDown={(e) => {
            onOptionMouseDown?.(e);
          }}
          title={option.label ?? option.value}
        >
          <PrefixSuffix
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            prefix={<Checkbox checked={isSelected} onChange={() => {}} />}
            large
          >
            <PrefixSuffix prefix={option.prefix} suffix={option.suffix} large>
              <span
                className={cn(
                  'cursor-default font-[inherit] text-[0.875em] font-medium text-current',
                  variant === 'large' && 'text-base',
                  'overflow-hidden text-ellipsis whitespace-nowrap'
                )}
              >
                {option.label ?? option.value}
              </span>
            </PrefixSuffix>
          </PrefixSuffix>
        </div>
      );
    });
  })();

  const displayed = (() => {
    if ((value?.length ?? 0) <= 2) {
      return options
        ?.filter((opt) => value?.includes(opt.value))
        .map((opt) => opt.label ?? opt.value)
        .slice(0, 2)
        .join(', ');
    } else if (value?.length === options?.length) {
      return 'All';
    } else {
      return multipleSelectedLabel(value?.length ?? 0);
    }
  })();

  return (
    <div
      ref={el}
      id={id}
      className={cn(
        'font-[inherit] text-base font-medium text-(--afdd-neutral-text-title-heading) flex flex-col gap-[0.375em] relative z-0 bg-inherit',
        labelPosition === 'left' && 'flex-row items-center',
        labelPosition === 'top-inside' && 'mt-2 has-data-field-disabled:opacity-40',
        wrapperClassName
      )}
      style={wrapperStyles}
    >
      {label ? (
        <div
          ref={labelEl}
          id={labelId}
          className={cn(
            'shrink-0 flex items-center gap-[0.375em]',
            variant === 'small' && 'h-[1.75em]',
            variant === 'large' && 'h-[2.625em]',
            labelPosition === 'top-inside' &&
              'absolute bg-inherit h-[1.25em] z-1 left-[0.375em] -top-2 pr-[0.3em] pl-[0.3em] max-w-[calc(100%-0.8em)] box-border text-xs'
          )}
          style={{ width: labelWidth }}
          onClick={onLabelClick}
        >
          <PrefixSuffix prefix={labelPrefix} suffix={labelSuffix} large>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap" title={label}>
              {label}
            </span>
          </PrefixSuffix>
        </div>
      ) : null}
      <div
        className={cn(
          'w-full shrink-0 flex flex-col items-center gap-[0.375em]',
          labelPosition === 'left' && 'w-auto flex-1'
        )}
      >
        <div
          ref={refs.setReference}
          {...getReferenceProps()}
          id={comboId}
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={labelId}
          aria-activedescendant={activeId}
          aria-disabled={disabled}
          aria-readonly={readOnly}
          role="combobox"
          tabIndex={0}
          data-field-disabled={disabled || undefined}
          className={cn(
            'w-full box-border flex items-center gap-[0.375em] h-[2.25em] px-[0.5625em] rounded-[4px] border border-(--look-line-strong) bg-(--afdd-background-lowest) transition-all duration-150 hover:border-(--afdd-border-light) focus-within:border-(--afdd-brand-surface-default-primary) relative outline-none min-w-45.25',
            variant === 'small' && 'py-[0.25em] h-[1.75em]',
            variant === 'large' && 'h-[2.625em]',
            error && 'border-(--afdd-condition-critical-primary)',
            readOnly && 'border-dashed',
            disabled && 'bg-(--afdd-background-lowest)',
            labelPosition === 'top-inside' && 'bg-inherit',
            fieldClassName
          )}
          style={fieldStyles}
          onClick={onComboClick}
          onBlur={onComboBlur}
          onKeyDown={onComboKeyDown}
          title={displayed}
        >
          <div
            className={cn(
              'flex-[1_0_auto] w-0 flex items-center gap-[0.375em] pointer-events-none',
              (open || !selected?.length) && 'opacity-40'
            )}
            style={{
              width: wrapperStyles?.width === undefined ? 'auto' : undefined,
            }}
          >
            <span
              className={cn(
                'font-[inherit] text-[0.875em] font-medium text-current',
                variant === 'large' && 'text-base',
                'overflow-hidden text-ellipsis whitespace-nowrap'
              )}
              title={displayed ?? placeholder}
            >
              {displayed ?? placeholder ?? ''}
            </span>
          </div>

          <div
            className={cn(
              'self-end shrink-0 flex justify-center items-center w-[1.25em] h-full',
              onArrowClick && 'cursor-pointer'
            )}
            onClick={
              onArrowClick
                ? (e) => {
                    e.stopPropagation();
                    onArrowClick();
                  }
                : undefined
            }
          >
            <div className="w-0 h-0 border-l-[0.3125em] border-r-[0.3125em] border-t-[0.3125em] border-l-transparent border-r-transparent border-t-current border-solid" />
          </div>
        </div>

        {error ? (
          <div title={error} className="w-full flex items-center">
            <span className="flex-1 w-0 font-[inherit] text-[0.875em] font-medium text-(--afdd-condition-critical-primary) overflow-hidden text-ellipsis whitespace-nowrap">
              {error}
            </span>
          </div>
        ) : null}
      </div>

      {open ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              fontSize: wrapperStyles?.fontSize,
              color: wrapperStyles?.color,
              ...optionStyles,
              ...floatingStyles,
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className={cn(
              'font-[inherit] text-base text-(--afdd-neutral-text-title-heading) box-border bg-(--afdd-background-default) border border-(--look-line) rounded-[6px] p-1 max-h-88.75 shadow-[0px_4px_8px_0px_#0000000f,0px_0px_4px_0px_#0000000a] flex flex-col min-w-45.25 overflow-y-hidden',
              optionClassName
            )}
            role="listbox"
            id={listboxId}
            aria-labelledby={labelId}
            aria-expanded={open}
            tabIndex={-1}
          >
            <div className="overflow-y-auto">{listboxOptions}</div>
            <div className="flex flex-row items-center gap-1.5 self-end h-6.25 p-1">
              <span
                onClick={onClearClick}
                className="cursor-pointer p-1.5 text-(--afdd-neutral-text-title-heading)"
              >
                Clear
              </span>
              <span
                onClick={onResetClick}
                className="cursor-pointer p-1.5 text-(--afdd-condition-critical-secondary)"
              >
                Reset
              </span>
            </div>
          </div>
        </FloatingPortal>
      ) : null}
    </div>
  );
};
