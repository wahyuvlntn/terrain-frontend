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
import {
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../../utils';
import { PrefixSuffix } from '../Shared/Shared';
import {
  getActionFromKey,
  getUpdatedIndex,
  isElementInView,
  isScrollable,
  maintainScrollVisibility,
  SelectActions,
} from './Dropdown.helper';

export interface DropdownOption {
  value: string;
  label?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  value?: string;
  onChange?: (value: string) => void;
  options?: DropdownOption[];
  readOnly?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  labelPosition?: 'top' | 'left' | 'top-inside';
  labelPrefix?: ReactNode;
  labelSuffix?: ReactNode;
  placeholder?: string;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  fieldClassName?: string;
  fieldStyles?: CSSProperties;
  optionStyles?: CSSProperties;
  optionClassName?: string;
  optionItemClassName?: string;
  optionItemStyles?: CSSProperties;
  labelWidth?: number | string;
  variant?: 'small' | 'medium' | 'large';
  searchable?: boolean;
  onArrowClick?: () => void;
  arrowIcon?: ReactNode;
}

export const Dropdown = ({
  options,
  value,
  onChange,
  readOnly,
  disabled,
  error,
  label,
  labelPosition,
  labelPrefix,
  labelSuffix,
  placeholder,
  labelWidth,
  variant,
  searchable,
  onArrowClick,
  arrowIcon,
  wrapperClassName,
  wrapperStyles,
  fieldClassName,
  fieldStyles,
  optionStyles,
  optionClassName,
  optionItemClassName,
  optionItemStyles,
}: DropdownProps) => {
  // States
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const [search, setSearch] = useState('');

  // Side-effect - sync selected with value
  useEffect(() => {
    setSelected(value);
  }, [value]);

  // For floating listbox
  const { floatingStyles, refs, context } = useFloating({
    open: open,
    onOpenChange: setOpen,
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
  const searchEl = useRef<HTMLInputElement>(null);
  const optionEls = useRef<Map<string, HTMLDivElement>>(new Map());

  // Generate unique id
  const id = useId();
  const comboId = `${id}-combo`;
  const listboxId = `${id}-listbox`;
  const labelId = label ? `${id}-label` : '';
  const activeId = open && value ? `${id}-option-${value}` : '';

  // Filter options by search input
  const filteredOptions = useMemo(() => {
    if (!options) {
      return null;
    }

    const normalizedSearch = search.toLowerCase();

    return options.filter((option) =>
      (option.label ?? option.value).toLowerCase().includes(normalizedSearch)
    );
  }, [options, search]);

  // Create a record from the filtered options
  const filteredOptionRecords = useMemo(
    () =>
      filteredOptions?.reduce<Record<string, { index: number } & DropdownOption>>(
        (records, option, index) => {
          records[option.value] = { index, ...option };
          return records;
        },
        {}
      ),
    [filteredOptions]
  );

  // Create a record of label to value
  const labelToValue = useMemo(
    () =>
      filteredOptions?.reduce<Record<string, string>>((records, option) => {
        records[option.label ?? option.value] = option.value;
        return records;
      }, {}),
    [filteredOptions]
  );

  // Get selected option
  const selectedOption =
    filteredOptionRecords !== undefined && selected !== undefined
      ? filteredOptionRecords[selected]
      : undefined;

  // Callbacks
  const onLabelClick =
    !readOnly && !disabled
      ? () => {
          comboEl.current?.focus();
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

          setSearch('');

          if (selected !== undefined && value !== selected && onChange) {
            onChange(selected);
          }

          if (open) {
            updateMenuState(false, false);
          }
        }
      : undefined;

  const onComboClick =
    !readOnly && !disabled
      ? () => {
          updateMenuState(!open, false);
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

              if (filteredOptions) {
                const max = filteredOptions.length - 1;
                const i = getUpdatedIndex(selectedOption?.index ?? 0, max, action);
                onOptionChange(filteredOptions[i].value);
              }
              break;
            // intentional fallthrough
            case SelectActions.Next:
            case SelectActions.Previous:
            case SelectActions.PageUp:
            case SelectActions.PageDown:
              event.preventDefault();

              if (filteredOptions) {
                const max = filteredOptions.length - 1;
                const i = getUpdatedIndex(selectedOption?.index ?? 0, max, action);
                onOptionChange(filteredOptions[i].value);
              }
              break;
            case SelectActions.CloseSelect:
              event.preventDefault();
              updateMenuState(false);
              setSearch('');

              if (selected !== undefined && value !== selected && onChange) {
                onChange(selected);
              }
              break;
            // intentional fallthrough
            case SelectActions.Close:
              event.preventDefault();
              updateMenuState(false);
              setSearch('');
              break;
            case SelectActions.Type:
              updateMenuState(true);
              searchEl.current?.focus();
              break;
            case SelectActions.Open:
              event.preventDefault();
              updateMenuState(true);
              break;
          }
        }
      : undefined;

  const onOptionChange = (value: string) => {
    setSelected(value);

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

  const onOptionClick = (newValue: string) => {
    setSearch('');
    onOptionChange(newValue);

    if (value !== newValue && onChange) {
      onChange(newValue);
    }

    updateMenuState(false);
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
            'w-full box-border flex items-center gap-[0.375em] h-[2.25em] px-[0.5625em] rounded border border-(--afdd-border-default) bg-(--afdd-background-low) transition-all duration-120 relative outline-none',
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
          title={selectedOption?.label ?? selectedOption?.value}
        >
          {searchable && !readOnly && !disabled ? (
            <input
              ref={searchEl}
              className={cn(
                'absolute font-[inherit] text-[0.875em] font-medium text-current border-none outline-none bg-transparent m-0 p-0 w-[calc(100%-1.25em-1.625em)] [-webkit-autofill]:delay-[99999s]',
                variant === 'large' && 'text-base',
                'overflow-hidden text-ellipsis whitespace-nowrap'
              )}
              value={search}
              onChange={({ target: { value } }) => {
                if (labelToValue && value in labelToValue) {
                  setSelected(labelToValue[value]);
                }

                setSearch(value);
              }}
            />
          ) : null}

          <div
            className={cn(
              'flex-[1_0_auto] w-0 flex items-center gap-[0.375em] pointer-events-none',
              (open || (!selectedOption && !search)) && 'opacity-40'
            )}
            style={{
              width: wrapperStyles?.width === undefined ? 'auto' : undefined,
            }}
          >
            {selectedOption ? (
              <PrefixSuffix
                prefix={selectedOption.prefix}
                suffix={selectedOption.suffix}
                large={variant === 'large'}
              >
                <span
                  className={cn(
                    'font-[inherit] text-[0.875em] font-medium text-current',
                    variant === 'large' && 'text-base',
                    'overflow-hidden text-ellipsis whitespace-nowrap'
                  )}
                  title={selectedOption.label ?? selectedOption.value}
                >
                  {selectedOption.label ?? selectedOption.value}
                </span>
              </PrefixSuffix>
            ) : !search ? (
              <span
                className={cn(
                  'font-[inherit] text-[0.875em] font-medium text-current',
                  variant === 'large' && 'text-base',
                  'overflow-hidden text-ellipsis whitespace-nowrap'
                )}
                title={placeholder}
              >
                {placeholder ?? ''}
              </span>
            ) : null}
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
            {arrowIcon ?? (
              <div className="w-0 h-0 border-l-[0.3125em] border-r-[0.3125em] border-t-[0.3125em] border-l-transparent border-r-transparent border-t-current border-solid" />
            )}
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

      {open && filteredOptions && filteredOptions.length > 0 ? (
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
              'font-[inherit] text-base text-(--afdd-neutral-text-title-heading) box-border bg-(--afdd-background-low) border border-(--afdd-border-default) rounded-lg p-1 max-h-88.75 overflow-y-auto shadow-[0px_4px_8px_0px_#0000000f,0px_0px_4px_0px_#0000000a]',
              optionClassName
            )}
            role="listbox"
            id={listboxId}
            aria-labelledby={labelId}
            aria-expanded={open}
            tabIndex={-1}
          >
            {!!readOnly || !!disabled || !filteredOptions ? null : (
              <DropdownMenu
                id={id}
                options={filteredOptions}
                selectedValue={selected}
                variant={variant}
                optionItemClassName={optionItemClassName}
                optionItemStyles={optionItemStyles}
                onOptionClick={onOptionClick}
                onOptionMouseDown={(e) => onOptionMouseDown?.(e)}
                setOptionRef={(val, el) => {
                  if (el) optionEls.current.set(val, el);
                  else optionEls.current.delete(val);
                }}
              />
            )}
          </div>
        </FloatingPortal>
      ) : null}
    </div>
  );
};

export const ExampleDropdown = (props: Omit<DropdownProps, 'value' | 'onChange'>) => {
  const [value, setValue] = useState('');
  return <Dropdown value={value} onChange={setValue} {...props} />;
};

interface DropdownMenuProps {
  id: string;
  options: DropdownOption[];
  selectedValue?: string;
  variant?: 'small' | 'medium' | 'large';
  optionItemClassName?: string;
  optionItemStyles?: CSSProperties;
  onOptionClick: (value: string) => void;
  onOptionMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
  // Use a callback ref to populate the parent's Map
  setOptionRef: (value: string, el: HTMLDivElement | null) => void;
}

export const DropdownMenu = ({
  id,
  options,
  selectedValue,
  variant,
  optionItemClassName,
  optionItemStyles,
  onOptionClick,
  onOptionMouseDown,
  setOptionRef,
}: DropdownMenuProps) => {
  return (
    <>
      {options.map((option, index) => {
        const isActive = selectedValue === option.value;
        const isDisabled = option.disabled;

        return (
          <div
            key={`${option.value}-${index}`}
            id={`${id}-option-${option.value}`}
            ref={(el) => setOptionRef(option.value, el)}
            role="option"
            className={cn(
              'flex items-center gap-1 bg-(--afdd-background-low) px-[0.875em] py-[0.5em] rounded hover:bg-(--afdd-background-default)',
              isActive && 'bg-(--afdd-background-high)',
              isDisabled && 'opacity-40',
              optionItemClassName
            )}
            style={optionItemStyles}
            aria-selected={isActive}
            aria-disabled={isDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (isDisabled) return;
              onOptionClick(option.value);
            }}
            onMouseDown={onOptionMouseDown}
            title={option.label ?? option.value}
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
          </div>
        );
      })}
    </>
  );
};
