import { forwardRef } from 'react';
import { cn } from '../../utils';
import { Button, ButtonProps } from './Button';

export interface ButtonPlatformProps extends ButtonProps {
  /** The color type of the button. */
  colorType?: 'default-primary' | 'default-secondary';
}

export const ButtonPlatform = forwardRef<HTMLButtonElement, ButtonPlatformProps>(
  ({ className, colorType = 'default-primary', ...props }, ref) => {
    return (
      <Button
        {...props}
        className={cn(
          className,
          'disabled:bg-(--afdd-neutral-surface-disabled) disabled:text-(--afdd-neutral-text-disabled) disabled:cursor-context-menu disabled:hover:bg-(--afdd-neutral-surface-disabled) disabled:hover:text-(--afdd-neutral-text-disabled) disabled:hover:cursor-context-menu',
          {
            'bg-(--afdd-brand-surface-default-primary) text-(--afdd-neutral-text-body-light) hover:bg-(--afdd-brand-surface-hover-primary) active:bg-(--afdd-brand-surface-dark-primary)':
              colorType === 'default-primary',
            'bg-(--afdd-brand-surface-default-secondary) text-(--afdd-brand-text-label-primary) hover:bg-(--afdd-brand-surface-hover-secondary) hover:text-(--afdd-brand-text-label-primary) active:bg-(--afdd-brand-surface-dark-secondary)':
              colorType === 'default-secondary',
          }
        )}
        ref={ref}
      />
    );
  }
);

ButtonPlatform.displayName = 'ButtonPlatform';
