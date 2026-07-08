import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { Close } from '@digital-twin/icons';
import type { DropdownOption } from './dropdown';
import styles from './dropdown-option-cards.module.scss';

interface DropdownOptionCardsProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  options?: Omit<DropdownOption, 'prefix'>[];
  disabled?: boolean;
  readOnly?: boolean;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  cardClassName?: string;
  cardStyles?: CSSProperties;
  textClassName?: string;
  textStyles?: CSSProperties;
  /** Display mode: 'basic' shows horizontal cards, 'number' shows vertical numbered list */
  listType?: 'basic' | 'number';
}

export const DropdownOptionCards = ({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  wrapperClassName,
  wrapperStyles,
  cardClassName,
  cardStyles,
  textClassName,
  textStyles,
  listType = 'basic',
}: DropdownOptionCardsProps) => {
  if (!value || value.length === 0) {
    return null;
  }

  // Convert dropdown options to labels record
  const labelsRecord = (() => {
    const record: Record<string, string> = {};
    if (options) {
      for (let option of options) {
        record[option.value] = option.label ?? option.value;
      }
    }
    return record;
  })();

  return (
    <div
      className={clsx(
        styles['wrapper'],
        listType === 'number' && styles['wrapper--number'],
        wrapperClassName
      )}
      style={wrapperStyles}
    >
      {value?.map((v, index) => {
        const label = labelsRecord[v];
        return (
          <div
            key={v}
            className={clsx(
              styles['card'],
              listType === 'number' && styles['card--number'],
              disabled && styles['card--disabled'],
              readOnly && styles['card--read-only'],
              cardClassName
            )}
            style={cardStyles}
          >
            {listType === 'number' && (
              <span className={styles['card__number']}>{index + 1}.</span>
            )}
            <span
              className={clsx(styles['card__text'], textClassName)}
              style={textStyles}
              title={label}
            >
              {label}
            </span>
            <Close
              className={styles['card__delete']}
              onClick={
                !disabled
                  ? (e) => {
                      e.stopPropagation();
                      if (onChange) {
                        const newValue = (value ?? []).filter(
                          (value) => value !== v
                        );
                        onChange(newValue);
                      }
                    }
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
};
