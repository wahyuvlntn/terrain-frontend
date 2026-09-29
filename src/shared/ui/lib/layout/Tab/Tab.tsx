import type { DragEventHandler } from 'react';
import React from 'react';
import { cn } from '../../utils';
import { useTabContext } from './TabContext';

interface TabProps {
  label?: string;
  value: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  wrapperStyle?: React.CSSProperties;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
}

const Tab: React.FC<TabProps> = ({
  label,
  value,
  style,
  className,
  icon,
  children,
  draggable,
  onDragStart,
  onDrop,
}) => {
  const { value: selectedValue, onChange, type } = useTabContext();

  const handleClick = () => {
    onChange(value);
  };

  return (
    <div
      className={cn(
        'px-5 h-11 cursor-pointer text-(--afdd-neutral-text-caption) text-[16px] font-medium flex items-center justify-center gap-2 transition-colors duration-150 hover:text-(--afdd-neutral-text-title-heading) [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap [&_svg]:min-h-5 [&_svg]:min-w-5 [&_svg]:max-h-5',
        type === '3' && 'relative',
        selectedValue === value && type === '3' && 'z-10',
        className
      )}
      onClick={handleClick}
      style={{ width: '100%', ...style }}
      aria-selected={selectedValue === value}
      aria-details={
        type === '2'
          ? 'secondary'
          : type === '3'
            ? 'tertiary'
            : type === '4'
              ? 'quaternary'
              : 'primary'
      }
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={
        draggable
          ? (e) => {
              e.preventDefault();
            }
          : undefined
      }
      onDrop={onDrop}
    >
      {children ? (
        children
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </div>
  );
};

export const TabProduct = ({ className, ...props }: TabProps) => {
  return (
    <Tab
      {...props}
      className={cn(
        className,
        // one look for every tab type: an underline in the brand color
        "[&[aria-selected='true']]:text-(--afdd-neutral-text-title-heading) [&[aria-selected='true']]:font-semibold [&[aria-selected='true']]:shadow-[inset_0_-3px_0_var(--afdd-brand-surface-default-primary)]"
      )}
    />
  );
};

export const TabPlatform = ({ className, ...props }: TabProps) => {
  return (
    <Tab
      {...props}
      className={cn(
        className,
        // one look for every tab type: an underline in the brand color
        "[&[aria-selected='true']]:text-(--afdd-neutral-text-title-heading) [&[aria-selected='true']]:font-semibold [&[aria-selected='true']]:shadow-[inset_0_-3px_0_var(--afdd-brand-surface-default-primary)]"
      )}
    />
  );
};
