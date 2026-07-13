import { forwardRef } from 'react';
import { cn } from '../../utils';

export interface ButtonProps extends React.ComponentProps<'button'> {
  /** A React node used as an the content inside of the button. */
  children?: React.ReactNode;
  /** The variant of the button. */
  variant?: 'default' | 'primary-round';
  /** A React node used as a prefix icon. */
  prefixIcon?: React.ReactNode;
  /** A React node used as a suffix icon. */
  suffixIcon?: React.ReactNode;

  prefixIconStyle?: React.CSSProperties;
  suffixIconStyle?: React.CSSProperties;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'default',
      prefixIcon,
      suffixIcon,
      className,
      prefixIconStyle,
      suffixIconStyle,
      ...props
    },
    ref
  ) => {
    if (variant === 'default') {
      return (
        <button
          ref={ref}
          className={cn(
            'px-3.5 py-2 rounded-md tracking-wider text-center text-base font-semibold leading-normal flex items-center gap-1 cursor-pointer border-none relative transition-[background] duration-250 ease-in-out',
            className
          )}
          {...props}
          onClick={props.onClick}
        >
          {prefixIcon && (
            <span
              className="flex w-5 h-5 [&>svg]:m-auto [&>svg]:w-full [&>svg]:h-full"
              style={prefixIconStyle}
            >
              {prefixIcon}
            </span>
          )}
          {children}
          {suffixIcon && (
            <span
              className="flex w-5 h-5 [&>svg]:m-auto [&>svg]:w-full [&>svg]:h-full"
              style={suffixIconStyle}
            >
              {suffixIcon}
            </span>
          )}
        </button>
      );
    } else {
      return (
        <button
          ref={ref}
          className={cn(
            'h-13.5 w-13.5 rounded-full p-2.25 border-none cursor-pointer transition-[background] duration-250 ease-in-out',
            className
          )}
          {...props}
          onClick={props.onClick}
        >
          {children}
        </button>
      );
    }
  }
);

Button.displayName = 'Button';
