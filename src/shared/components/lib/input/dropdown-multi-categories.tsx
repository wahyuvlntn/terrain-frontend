import { FloatingPortal } from '@floating-ui/react';
import { Fragment, useState } from 'react';
import { Checkbox } from './checkbox';
import { DropdownOption } from './dropdown';
import {
  DropdownMenuButton,
  DropdownMenuWrapper,
  DropdownTrigger,
  DropdownTriggerProps,
} from './dropdown-multiple-select';
import { useDropdownMultipleSelect } from './dropdown-multiple-select.hook';

type DropdownMultiOption = {
  category: string;
  options: Omit<DropdownOption, 'prefix'>[];
};

export interface DropdownMultiCategoriesProps
  extends Omit<DropdownTriggerProps, 'isOpen' | 'getReferenceProps'> {
  options?: DropdownMultiOption[];
  onChange?: (value: string[]) => void;
  value?: string[];
}

export const DropdownMultiCategories = (props: DropdownMultiCategoriesProps) => {
  const { value, onChange, options, disabled, readOnly, wrapperStyles } = props;

  const { floatingStyles, getReferenceProps, refs, isOpen, setIsOpen } = useDropdownMultipleSelect({
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
            <DropdownMultiCategoriesMenu
              options={options}
              value={value}
              onApply={(value) => {
                onChange && onChange(value);
                setIsOpen(false);
              }}
            />
          </DropdownMenuWrapper>
        </FloatingPortal>
      ) : null}
    </>
  );
};

type DropdownMultiCategoriesMenuProps = {
  options?: DropdownMultiOption[];
  value?: string[];
  onApply?: (value: string[]) => void;
};

const DropdownMultiCategoriesMenu = ({
  onApply,
  options,
  value,
}: DropdownMultiCategoriesMenuProps) => {
  // States
  const [selected, setSelected] = useState(() => value ?? []);

  // Convert selected array to a record for quick lookup
  const selectedRecord = (() => {
    const record: Record<string, boolean> = {};
    for (const value of selected) {
      record[value] = true;
    }
    return record;
  })();

  // Count total options
  const totalOptions =
    options?.reduce((total, { options }) => {
      return total + options.length;
    }, 0) ?? 0;

  return (
    <>
      {options?.map((categoryOption) => (
        <Fragment key={categoryOption.category}>
          <span>{categoryOption.category}</span>
          {categoryOption.options.map((option) => {
            const isChecked = selectedRecord[option.value] ?? false;
            return (
              <div key={option.value}>
                <Checkbox
                  label={option.label ?? option.value}
                  value={isChecked}
                  labelStyle={{
                    width: 0,
                  }}
                  onChange={(_, checked) => {
                    setSelected((prev) => {
                      let newSelected: string[];
                      if (checked) {
                        newSelected = [...(prev ?? []), option.value];
                      } else {
                        newSelected = (prev ?? []).filter((value) => value !== option.value);
                      }
                      return newSelected;
                    });
                  }}
                />
              </div>
            );
          })}
        </Fragment>
      ))}
      <DropdownMenuButton
        onReset={() => {
          setSelected(value ?? []);
        }}
        onApply={() => {
          onApply && onApply(selected);
        }}
        disabled={totalOptions === 0}
      />
    </>
  );
};
