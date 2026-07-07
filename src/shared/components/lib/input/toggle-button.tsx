import { ToggleSwitch } from '@digital-twin/reusables';
import { ChangeEvent, ComponentProps, CSSProperties } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

export interface ToggleButtonProps<T extends FieldValues>
  extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'ref'> {
  value?: boolean;
  onChange?: (name: string | undefined, enabled: boolean) => void;
  label?: string;
  registered?: Path<T>;
  control?: Control<T>;
  wrapperStyles?: CSSProperties
}

export const ToggleButton = <T extends FieldValues>({
  control,
  registered,
  value,
  onChange,
  ...props
}: ToggleButtonProps<T>) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange?.(e.target.name, e.target.checked);

  return registered ? (
    <Controller
      name={registered}
      control={control}
      render={({ field }) => (
        <ToggleSwitch {...props} {...field} checked={field.value} />
      )}
    />
  ) : (
    <ToggleSwitch {...props} checked={value} onChange={handleChange} />
  );
};
