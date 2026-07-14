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
        'px-7 py-2 cursor-pointer text-(--afdd-neutral-text-title-heading) text-[16px] font-medium flex items-center justify-center gap-1 [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap [&_svg]:min-h-5 [&_svg]:min-w-5 [&_svg]:max-h-5',
        type === '2' && 'rounded-t-sm',
        type === '3' && 'relative rounded',
        selectedValue === value && 'rounded-t-sm',
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
        "[&[aria-details='primary'][aria-selected='true']]:bg-(--afdd-background-highest) [&[aria-details='primary'][aria-selected='true']]:text-white",
        "[&[aria-details='secondary']]:bg-(--afdd-background-lowest)",
        "[&[aria-details='secondary'][aria-selected='true']]:bg-(--afdd-background-low)",
        "[&[aria-details='tertiary']]:bg-(--afdd-background-default)",
        "[&[aria-details='tertiary'][aria-selected='true']]:bg-(--afdd-background-highest) [&[aria-details='tertiary'][aria-selected='true']]:text-white",
        "[&[aria-details='quaternary']]:border-b-2 [&[aria-details='quaternary']]:border-b-transparent",
        "[&[aria-details='quaternary'][aria-selected='true']]:border-b-(--afdd-brand-surface-default-primary)"
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
        "[&[aria-details='primary'][aria-selected='true']]:bg-(--afdd-brand-surface-default-primary) [&[aria-details='primary'][aria-selected='true']]:text-white",
        "[&[aria-details='secondary']]:bg-(--afdd-background-low)",
        "[&[aria-details='secondary'][aria-selected='true']]:bg-(--afdd-background-default)",
        "[&[aria-details='tertiary']]:bg-(--afdd-background-default)",
        "[&[aria-details='tertiary'][aria-selected='true']]:bg-(--afdd-brand-surface-dark-primary) [&[aria-details='tertiary'][aria-selected='true']]:text-white",
        "[&[aria-details='quaternary']]:border-b-2 [&[aria-details='quaternary']]:border-b-transparent",
        "[&[aria-details='quaternary'][aria-selected='true']]:border-b-(--afdd-brand-surface-default-primary)"
      )}
    />
  );
};
