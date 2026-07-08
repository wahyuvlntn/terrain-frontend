import { DropdownMultiple as DropdownMultipleReusable } from '@digital-twin/reusables';
import { FieldValues } from 'react-hook-form';

import { DropdownProps } from './dropdown';

type DropdownMultipleProps<T extends FieldValues> = Omit<
  DropdownProps<T>,
  'value' | 'onChange' | 'control' | 'register'
> & {
  value?: string[];
  onChange?: (value: string[]) => void;
};

export const DropdownMultiple = <T extends FieldValues>({
  ...props
}: DropdownMultipleProps<T>) => {
  return <DropdownMultipleReusable {...props} />;
};
