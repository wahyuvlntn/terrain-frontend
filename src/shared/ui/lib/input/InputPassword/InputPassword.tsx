import { ComponentPropsWithRef, CSSProperties, ReactNode, useState } from 'react';
import { default as VisibilityFillIcon } from '../../icons/VisibilityFillIcon';
import { default as VisibilityOffFillIcon } from '../../icons/VisibilityOffFillIcon';
import { Input } from '../Input/Input';

interface InputPasswordProps
  extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'className' | 'style' | 'type'> {
  error?: string;
  label?: string;
  labelPosition?: 'top' | 'left' | 'top-inside';
  labelPrefix?: ReactNode;
  labelSuffix?: ReactNode;
  inputPrefix?: ReactNode;
  wrapperClassName?: string;
  wrapperStyles?: CSSProperties;
  fieldClassName?: string;
  fieldStyles?: CSSProperties;
  labelWidth?: number | string;
  variant?: 'small' | 'medium' | 'large';
}

export const InputPassword = (props: InputPasswordProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      {...props}
      type={showPassword ? 'text' : 'password'}
      inputSuffix={
        showPassword ? (
          <VisibilityFillIcon
            className="cursor-pointer [&>svg>path]:fill-(--afdd-neutral-text-title-heading)"
            onClick={() => {
              setShowPassword(!showPassword);
            }}
          />
        ) : (
          <VisibilityOffFillIcon
            className="cursor-pointer [&>svg>path]:fill-(--afdd-neutral-text-title-heading)"
            onClick={() => {
              setShowPassword(!showPassword);
            }}
          />
        )
      }
    />
  );
};
