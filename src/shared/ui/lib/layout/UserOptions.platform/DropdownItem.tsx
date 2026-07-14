import { forwardRef, ReactNode } from 'react';
import { cn } from '../../utils';

export interface DropdownItemProps {
  /**
   * The unique identifier of the item.
   */
  id: string;
  /**
   * The icon to display before the text.
   */
  prefixIcon: ReactNode;
  /**
   * The text to display.
   */
  text: string;
  /**
   * The icon to display after the text.
   */
  suffixIcon?: ReactNode;
  /**
   * Whether the item is active.
   */
  active?: boolean;
  /**
   * The class name to apply to the component.
   */
  className?: string;
}

export const DropdownItem = forwardRef<HTMLLIElement | null, DropdownItemProps>(
  ({ prefixIcon, text, suffixIcon, active, className }, ref) => {
    return (
      <li
        ref={ref}
        className={cn(
          'flex items-center gap-1 rounded p-2 text-(--afdd-neutral-text-title-heading) cursor-pointer [&_svg]:w-5 [&_svg]:h-5 [&_span]:w-full [&_span]:font-medium [&_span]:text-[16px] [&_span]:leading-[25.6px] hover:bg-(--afdd-background-high)',
          active && 'bg-(--afdd-background-highest) hover:bg-(--afdd-background-highest)',
          className
        )}
      >
        {prefixIcon}
        <span>{text}</span>
        {suffixIcon}
      </li>
    );
  }
);

DropdownItem.displayName = 'DropdownItem';
