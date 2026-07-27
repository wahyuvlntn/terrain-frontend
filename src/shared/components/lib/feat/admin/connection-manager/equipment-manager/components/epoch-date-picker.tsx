import { useEffect, useMemo } from 'react';

import { DateTimePicker } from '../../../../../input';

export const EpochDatePicker = ({
  label,
  value,
  onChange,
  background,
}: {
  label?: string;
  value: number | undefined;
  onChange: (value: number) => void;
  background?: 'dark' | 'default';
}) => {
  useEffect(() => {
    if (value) {
      return;
    }

    setTimeout(() => {
      onChange(Date.now());
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const date = useMemo(() => {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    const YY = date.getFullYear().toString();
    const MM = (date.getMonth() + 1).toString().padStart(2, '0');
    const DD = date.getDate().toString().padStart(2, '0');

    return `${YY}-${MM}-${DD}`;
  }, [value]);

  return (
    <DateTimePicker
      label={label}
      value={date}
      onChange={(_name, dateStr) => {
        onChange(new Date(dateStr).getTime());
      }}
      background={background}
    />
  );
};
