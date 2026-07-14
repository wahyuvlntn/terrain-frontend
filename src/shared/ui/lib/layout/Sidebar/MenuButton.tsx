import React from 'react';
import { Link, To } from 'react-router-dom';
import { cn } from '../../utils';

interface MenuButtonProps {
  /** Icon to be displayed in the menu button */
  menuIcon: React.ReactNode;
  /** Icon to be displayed in the menu button when it is active */
  menuIconFilled: React.ReactNode;
  /** Indicates if the menu is expanded */
  isExpanded: boolean;
  /** Text to be displayed. This can be a string or a React node. */
  text: React.ReactNode;
  /** Optional icon for the right side when expanded */
  expandedRightIcon?: React.ReactNode;
  /** Optional icon for the right side when collapsed */
  collapsedRightIcon?: React.ReactNode;
  /** Indicates if the button is active or selected */
  active?: boolean;
  /** Additional class names for custom styling */
  className?: string;
  /** Click handler for the menu button */
  onMenuClick?: () => void;
  /** Optional react router url */
  to?: To;
}

export const MenuButton = ({
  menuIcon,
  menuIconFilled,
  isExpanded,
  text,
  className,
  active,
  expandedRightIcon,
  collapsedRightIcon,
  onMenuClick,
  to,
}: MenuButtonProps) => {
  if (isExpanded) {
    const renderComponent = () => (
      <div
        className={cn(
          'flex justify-between px-4 gap-1 h-11.25 min-h-11.25 cursor-pointer items-center hover:bg-(--afdd-brand-surface-default-primary) hover:rounded [&_svg]:w-5 [&_svg]:h-5',
          active &&
            'text-(--afdd-neutral-text-body-light) bg-(--afdd-brand-surface-default-primary) rounded [&_path]:fill-(--afdd-neutral-text-body-light)',
          className
        )}
        onClick={() => {
          onMenuClick && onMenuClick();
        }}
      >
        <div className="flex items-center h-5 gap-1 whitespace-nowrap">
          <div>{active ? menuIconFilled : menuIcon}</div>
          <h5 className="text-[16px] leading-5 font-medium">{text}</h5>
        </div>
        {expandedRightIcon && (
          <div className="flex items-center justify-center w-6.25 h-6.25">{expandedRightIcon}</div>
        )}
      </div>
    );

    if (to) return <Link to={to}>{renderComponent()}</Link>;
    return renderComponent();
  }

  const renderComponent = () => (
    <div
      className={cn(
        'flex gap-1 h-11.25 min-h-11.25 px-5 cursor-pointer items-center justify-center hover:bg-(--afdd-background-default) hover:rounded hover:text-(--afdd-neutral-text-body-light) hover:[&_path]:fill-(--afdd-neutral-text-body-light)',
        active &&
          'bg-(--afdd-brand-surface-default-primary) rounded text-(--afdd-neutral-text-body-light) [&_path]:fill-(--afdd-neutral-text-body-light)',
        className
      )}
      onClick={() => {
        onMenuClick && onMenuClick();
      }}
    >
      <div className={cn('flex items-center justify-between relative')}>
        <div className="flex items-center [&_svg]:w-5 [&_svg]:h-5">
          {active ? menuIconFilled : menuIcon}
        </div>
        <div className="absolute flex items-center gap-1 left-3.75">{collapsedRightIcon}</div>
      </div>
    </div>
  );

  if (to) return <Link to={to}>{renderComponent()}</Link>;
  return renderComponent();
};

MenuButton.displayName = 'MenuButton';
