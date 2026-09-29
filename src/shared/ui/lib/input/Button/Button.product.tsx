import { forwardRef } from 'react';
import { cn } from '../../utils';
import { Button, ButtonProps } from './Button';

export interface ButtonProductProps extends ButtonProps {
  /** The color type of the button. */
  colorType?: 'default-primary' | 'default-secondary';
}

export const ButtonProduct = forwardRef<HTMLButtonElement, ButtonProductProps>(
  ({ className, colorType = 'default-primary', ...props }, ref) => {
    return (
      <Button
        {...props}
        className={cn(
          className,
          'disabled:text-(--afdd-neutral-text-body-light) disabled:cursor-context-menu disabled:opacity-50 disabled:hover:text-(--afdd-neutral-text-body-light) disabled:hover:cursor-context-menu disabled:hover:opacity-50',
          {
            'bg-(--afdd-brand-surface-default-primary) text-(--afdd-neutral-text-body-light) hover:bg-(--afdd-brand-surface-hover-primary) active:bg-(--afdd-brand-border-dark-primary)':
              colorType === 'default-primary',
            'bg-transparent border-(--look-line-strong) text-(--afdd-neutral-text-title-heading) hover:bg-(--afdd-background-default) active:bg-(--afdd-background-high)':
              colorType === 'default-secondary',
          }
        )}
        ref={ref}
      />
    );
  }
);

ButtonProduct.displayName = 'ButtonProduct';
