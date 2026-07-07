import { ButtonProduct as ButtonReusable } from '@digital-twin/reusables';
import clsx from 'clsx';
import type React from 'react';
import { forwardRef } from 'react';

import { LoadingCircle } from '../others';
import styles from './button.module.scss';

export type Color =
  | 'default-primary'
  | 'default-secondary'
  | 'success'
  | 'warning'
  | 'error';

type ButtonColor = Color;

type ButtonProps = React.ComponentProps<'button'> & {
  children?: React.ReactNode;
  color?: ButtonColor;
  icon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  variant?: 'default' | 'primary-round';
  isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      color = 'default-primary',
      variant = 'default',
      icon,
      suffixIcon,
      className,
      isLoading,
      ...props
    },
    ref
  ) => {
    return (
      <ButtonReusable
        {...props}
        colorType={
          color === 'success' || color === 'warning' || color === 'error'
            ? undefined
            : color
        }
        variant={variant}
        prefixIcon={icon}
        suffixIcon={suffixIcon}
        className={clsx(
          styles.button,
          color === 'success' && styles['button-success'],
          color === 'warning' && styles['button-warning'],
          color === 'error' && styles['button-error'],
          isLoading && styles.loading,
          className
        )}
        ref={ref}
      >
        {children}
        {isLoading && (
          <div className={styles['loading-container']}>
            <LoadingCircle isLoading={true} scale={0.25} />
          </div>
        )}
      </ButtonReusable>
    );
  }
);

Button.displayName = 'Button';
