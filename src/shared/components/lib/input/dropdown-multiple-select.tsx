import { FloatingPortal } from '@floating-ui/react';
import { DragIndicator, SaveFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';
import { CSSProperties, forwardRef, ReactNode, useMemo, useState } from 'react';

import { Button } from './button';
import { Checkbox } from './checkbox';
import type { DropdownOption } from './dropdown';
import { useDropdownMultipleSelect } from './dropdown-multiple-select.hook';
import styles from './dropdown-multiple-select.module.scss';
import { Search } from './search';

export interface DropdownTriggerProps {
  label?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  isOpen?: boolean;
  getReferenceProps?: () => Record<string, any>;
}

export const DropdownTrigger = forwardRef<HTMLDivElement, DropdownTriggerProps>(
  (
    {
      label,
      error,
      disabled,
      readOnly,
      required,
      placeholder,
      wrapperClassName,
      wrapperStyles,
      isOpen,
      getReferenceProps,
    },
    ref
  ) => {
    return (
      <div
        className={clsx(styles['input-wrapper'], wrapperClassName)}
        style={wrapperStyles}
      >
        {label ? (
          <div className={styles['label']}>
            <span className={styles['flex-row-ellipsis']}>
              {label}{' '}
              {required ? <span className={styles['required']}>*</span> : null}
            </span>
          </div>
        ) : null}

        <div className={styles['input-field-wrapper']}>
          <div
            ref={ref}
            {...(getReferenceProps ? getReferenceProps() : {})}
            className={clsx(
              styles['dropdown-field'],
              styles['input-field'],
              error && styles['input-field--error'],
              readOnly && styles['input-field--read-only'],
              disabled && styles['input-field--disabled'],
              isOpen && styles['input-field--open']
            )}
          >
            <div
              className={clsx(
                styles['dropdown-value'],
                styles['dropdown-value--placeholder']
              )}
            >
              <span
                className={clsx(
                  styles['dropdown-value__text'],
                  styles['flex-row-ellipsis']
                )}
                title={placeholder}
              >
                {placeholder ?? ''}
              </span>
            </div>
            <div className={styles['dropdown-arrow']}>
              <div
                className={clsx(
                  styles['dropdown-arrow__icon'],
                  isOpen && styles['dropdown-arrow__icon--open']
                )}
              />
            </div>
          </div>

          {error ? (
            <div title={error} className={clsx(styles['error'])}>
              <span
                className={clsx(
                  styles['error__message'],
                  styles['flex-row-ellipsis']
                )}
              >
                {error}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);

interface DropdownMultipleSelectProps
  extends Omit<DropdownTriggerProps, 'isOpen' | 'getReferenceProps'> {
  options?: Omit<DropdownOption, 'prefix'>[];
  onChange?: (value: string[]) => void;
  value?: string[];
  selectedOptionsLabel?: string;
  selectedOptionsPlaceholder?: string;
  selectedOptionsVariant?: 'number' | 'checkbox';
  selectedOptionsReorderable?: boolean;
  availableOptionsLabel?: string;
}

export const DropdownMultipleSelect = (props: DropdownMultipleSelectProps) => {
  const {
    value,
    onChange,
    options,
    selectedOptionsLabel,
    selectedOptionsPlaceholder,
    selectedOptionsVariant,
    selectedOptionsReorderable,
    availableOptionsLabel,
    disabled,
    readOnly,
    required,
    wrapperStyles,
  } = props;

  const { floatingStyles, getReferenceProps, refs, isOpen, setIsOpen } =
    useDropdownMultipleSelect({
      disabled,
      readOnly,
    });

  return (
    <>
      <DropdownTrigger
        {...props}
        ref={refs.setReference}
        getReferenceProps={getReferenceProps}
        isOpen={isOpen}
      />
      {isOpen ? (
        <FloatingPortal>
          <DropdownMenuWrapper
            ref={refs.setFloating}
            style={{
              fontSize: wrapperStyles?.fontSize,
              color: wrapperStyles?.color,
              ...floatingStyles,
            }}
          >
            <DropdownMenu
              options={options}
              value={value}
              onApply={(value) => {
                onChange && onChange(value);
                setIsOpen(false);
              }}
              selectedOptionsLabel={selectedOptionsLabel}
              selectedOptionsPlaceholder={selectedOptionsPlaceholder}
              selectedOptionsVariant={selectedOptionsVariant}
              selectedOptionsReorderable={selectedOptionsReorderable}
              availableOptionsLabel={availableOptionsLabel}
              required={required}
            />
          </DropdownMenuWrapper>
        </FloatingPortal>
      ) : null}
    </>
  );
};

type DropdownMenuWrapperProps = {
  style?: CSSProperties;
  children?: ReactNode;
};

export const DropdownMenuWrapper = forwardRef<
  HTMLDivElement,
  DropdownMenuWrapperProps
>(({ style, children }, ref) => {
  return (
    <div
      ref={ref}
      className={styles['dropdown-menu']}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
});

interface DropdownMenuProps {
  options?: Omit<DropdownOption, 'prefix'>[];
  value?: string[];
  onApply?: (value: string[]) => void;
  selectedOptionsLabel?: string;
  selectedOptionsPlaceholder?: string;
  selectedOptionsVariant?: 'number' | 'checkbox';
  selectedOptionsReorderable?: boolean;
  availableOptionsLabel?: string;
  required?: boolean;
}

const DropdownMenu = ({
  options,
  value,
  onApply,
  selectedOptionsLabel,
  selectedOptionsPlaceholder,
  selectedOptionsVariant,
  selectedOptionsReorderable,
  availableOptionsLabel,
  required,
}: DropdownMenuProps) => {
  // States
  const [selected, setSelected] = useState(() => value ?? []);
  const [search, setSearch] = useState('');

  // Convert selected array to a record for quick lookup
  const selectedRecord = (() => {
    const record: Record<string, boolean> = {};
    for (const value of selected) {
      record[value] = true;
    }
    return record;
  })();

  // Convert options to a record for quick lookup
  const optionLabelsRecord = useMemo(() => {
    const record: Record<string, string> = {};
    if (options) {
      for (const option of options) {
        record[option.value] = option.label;
      }
    }
    return record;
  }, [options]);

  // Filter selected options
  const selectedOptions = useMemo(() => {
    if (!selected) {
      return null;
    }
    return selected
      .filter((val) => !!optionLabelsRecord[val])
      .map((value) => ({
        value,
        label: optionLabelsRecord[value] ?? value,
      }));
  }, [selected, optionLabelsRecord]);

  // Filter available options by search input
  const availableOptions = useMemo(() => {
    if (!options) {
      return null;
    }
    const normalizedSearch = search.toLowerCase();

    // For 'number' variant: keep selected options in list and sort them to the top
    if (selectedOptionsVariant === 'number') {
      const filtered = options.filter((option) =>
        (option.label ?? option.value).toLowerCase().includes(normalizedSearch)
      );
      // Sort selected options to the top
      return filtered.sort((a, b) => {
        const aSelected = selectedRecord[a.value] ? 1 : 0;
        const bSelected = selectedRecord[b.value] ? 1 : 0;
        return bSelected - aSelected;
      });
    }

    // For 'checkbox' variant: filter out selected options (original behavior)
    return options.filter(
      (option) =>
        !selectedRecord[option.value] &&
        (option.label ?? option.value).toLowerCase().includes(normalizedSearch)
    );
  }, [options, selectedRecord, search, selectedOptionsVariant]);

  // Map function for rendering option items
  const renderOptionItemNumber =
    (reorderable?: boolean) => (option: DropdownOption, index: number) => {
      return (
        <div
          key={option.value}
          className={clsx(
            styles['dropdown-menu__list-item'],
            reorderable && styles['dropdown-menu__list-item--reorderable']
          )}
          draggable={reorderable}
          onDragStart={
            reorderable
              ? (e) => {
                  e.dataTransfer.setData('text', index.toString());
                }
              : undefined
          }
          onDragOver={
            reorderable
              ? (e) => {
                  e.preventDefault();
                }
              : undefined
          }
          onDrop={
            reorderable
              ? (e) => {
                  const droppedIndex = e.dataTransfer.getData('text');
                  setSelected((prev) =>
                    swapByIndex(prev ?? [], index, Number(droppedIndex))
                  );
                }
              : undefined
          }
        >
          {reorderable ? <DragIndicator /> : null}
          <span className={styles['dropdown-menu__list-item__text']}>
            {index + 1}.
          </span>
          <span
            className={clsx(
              styles['dropdown-menu__list-item__text'],
              styles['flex-row-ellipsis']
            )}
            title={option.label ?? option.value}
          >
            {option.label ?? option.value}
          </span>
        </div>
      );
    };

  const renderOptionItemCheckbox =
    (reorderable?: boolean) => (option: DropdownOption, index: number) => {
      const isChecked = selectedRecord[option.value];
      return (
        <div
          key={option.value}
          className={clsx(
            styles['dropdown-menu__list-item'],
            reorderable && styles['dropdown-menu__list-item--reorderable']
          )}
          draggable={reorderable}
          onDragStart={
            reorderable
              ? (e) => {
                  e.dataTransfer.setData('text', index.toString());
                }
              : undefined
          }
          onDragOver={
            reorderable
              ? (e) => {
                  e.preventDefault();
                }
              : undefined
          }
          onDrop={
            reorderable
              ? (e) => {
                  const droppedIndex = e.dataTransfer.getData('text');
                  setSelected((prev) =>
                    swapByIndex(prev ?? [], index, Number(droppedIndex))
                  );
                }
              : undefined
          }
        >
          {reorderable ? <DragIndicator /> : null}
          <Checkbox
            label={option.label ?? option.value}
            value={isChecked}
            onChange={(_, checked) => {
              setSelected((prev) => {
                let newSelected: string[];
                if (checked) {
                  newSelected = [...(prev ?? []), option.value];
                } else {
                  newSelected = (prev ?? []).filter(
                    (value) => value !== option.value
                  );
                }
                return newSelected;
              });
            }}
          />
        </div>
      );
    };

  return (
    <>
      <Search
        value={search}
        onChange={setSearch}
        placeholder={t('common.search')}
        wrapperClassName={styles['dropdown-menu__search']}
      />
      <span>
        {selectedOptionsLabel ?? 'Selected Options:'}{' '}
        {required ? <span className={styles['required']}>*</span> : null}
      </span>
      {selectedOptions && selectedOptions.length > 0 ? (
        <div className={styles['dropdown-menu__list']}>
          {selectedOptions?.map(
            selectedOptionsVariant === 'checkbox'
              ? renderOptionItemCheckbox(selectedOptionsReorderable)
              : renderOptionItemNumber(selectedOptionsReorderable)
          )}
        </div>
      ) : (
        <span className={styles['selected-options-placeholder']}>
          {selectedOptionsPlaceholder ?? 'No options have been selected yet'}
        </span>
      )}
      <hr className={styles['dropdown-menu__separator']} />
      <span>{availableOptionsLabel ?? 'Available Options:'}</span>
      <div className={styles['dropdown-menu__list']}>
        {availableOptions?.map(renderOptionItemCheckbox(false))}
      </div>
      <DropdownMenuButton
        onReset={() => {
          setSelected(value ?? []);
        }}
        onApply={() => {
          onApply && onApply(selected);
        }}
        disabled={!selectedOptions?.length && !availableOptions?.length}
      />
    </>
  );
};

type DropdownMenuButtonProps = {
  onReset: () => void;
  onApply: () => void;
  disabled?: boolean;
};

export const DropdownMenuButton = ({
  onApply,
  onReset,
  disabled,
}: DropdownMenuButtonProps) => {
  return (
    <div className={styles['dropdown-menu__buttons']}>
      <Button
        className={styles['reset-button']}
        onClick={onReset}
        disabled={disabled}
      >
        {t('common.reset')}
      </Button>
      <Button icon={<SaveFill />} onClick={onApply} disabled={disabled}>
        {t('common.apply')}
      </Button>
    </div>
  );
};

function swapByIndex(arr: string[], i: number, j: number): string[] {
  const copy = [...arr]; // avoid mutating original
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}
