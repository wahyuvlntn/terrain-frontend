import { ReactNode, useEffect, useMemo, CSSProperties } from 'react';

import { Dropdown } from '../../../../../input';
import { MasterDataEntryType } from '../schemas';

export interface MasterDataDropdownEntries extends MasterDataEntryType {
  prefix?: ReactNode;
}

export const MasterDataDropdown = ({
  label,
  entries,
  value,
  onChange,
  error,
  disabled,
  disableDefault,
  searchable = true,
  flex,
  width,
  style,
  className,
}: {
  label?: string;
  entries?: MasterDataDropdownEntries[];
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
  disableDefault?: boolean;
  isError?: boolean;
  searchable?: boolean;
  flex?: string;
  width?: string | number;
  style?: CSSProperties;
  className?: string;
}) => {
  useEffect(() => {
    if (
      disabled ||
      disableDefault ||
      !entries ||
      !(value == null || value === -1)
    ) {
      return;
    }

    const first = entries[0];

    if (first) {
      setTimeout(() => {
        onChange && onChange(first.id);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, value, disabled, disableDefault]);

  const options = useMemo(() => {
    if (!entries) {
      return [];
    }

    return entries.map(({ id, name, prefix }) => ({
      value: id.toString(),
      label: name,
      prefix,
    }));
  }, [entries]);

  return (
    <Dropdown
      label={label}
      options={options}
      value={value?.toString()}
      onChange={(value) => {
        onChange && onChange(parseInt(value));
      }}
      wrapperStyles={{
        ...style,
        flex,
        width,
      }}
      wrapperClassName={className}
      error={error}
      disabled={disabled}
      searchable={searchable}
      background={'dark'}
    />
  );
};
