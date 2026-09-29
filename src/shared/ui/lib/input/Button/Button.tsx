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
            'h-10 px-4 rounded-[4px] text-center text-[15px] font-semibold leading-normal flex items-center justify-center gap-2 cursor-pointer border border-transparent relative transition-[background,border-color] duration-150 ease-in-out',
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
