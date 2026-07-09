import clsx from 'clsx';
import type React from 'react';
import { forwardRef } from 'react';

import styles from './badge.module.scss';

type color =
  | 'primary'
  | 'secondary'
  | 'running'
  | 'idle'
  | 'unplanned-down'
  | 'planned-down'
  | 'normal'
  | 'warning'
  | 'critical'
  | 'wait-for-finish'
  | 'critical-2'
  | 'offline'
  | 'abnormal';

type BadgeColor = color;

type BadgeProps = Omit<React.ComponentPropsWithoutRef<'span'>, 'color'> & {
  children?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  color?: BadgeColor;
  variant?: 'pill' | 'rounded' | string;
  fillVariant?: 'filled' | 'outlined' | string;
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      color = 'primary',
      leftIcon,
      rightIcon,
      variant = 'rounded',
      className,
      fillVariant = 'filled',
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref} // Attach the ref to the DOM element
        className={clsx(
          {
            [styles['badge']]: true,
            [styles[`badge-${color}-${fillVariant}`]]: true,
            [styles[`badge-${variant}`]]: true,
          },
          className
        )}
        {...props}
      >
        {leftIcon && <span className={styles['badge-icon']}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={styles['badge-icon']}>{rightIcon}</span>}
      </span>
    );
  }
);
