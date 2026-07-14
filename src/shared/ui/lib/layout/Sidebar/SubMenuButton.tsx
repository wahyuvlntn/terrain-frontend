import React from 'react';
import { Link, To } from 'react-router-dom';
import { cn } from '../../utils';

interface SubMenuButtonProps {
  /** Icon to be displayed in the menu button */
  menuIcon: React.ReactNode;
  /** Icon to be displayed in the menu button when is active */
  menuIconFilled: React.ReactNode;
  /** Indicates if the menu is expanded */
  isExpanded: boolean;
  /** SubMenu text */
  text: React.ReactNode;
  /** Indicates if the button is active or selected */
  active?: boolean;
  /** Additional class names for custom styling */
  className?: string;
  /** Callback function to be called when the button is clicked */
  onSubMenuClick: () => void;
  /**  Optional react router url */
  to?: To;
}

export const SubMenuButton = ({
  menuIcon,
  menuIconFilled,
  isExpanded,
  text,
  className,
  active,
  onSubMenuClick,
  to,
}: SubMenuButtonProps) => {
  if (isExpanded) {
    const renderComponent = () => (
      <div
        className={cn(
          'flex justify-between pl-7 pr-4 gap-1 h-11.25 min-h-11.25 cursor-pointer items-center hover:bg-(--afdd-background-high) hover:rounded [&_svg]:w-5 [&_svg]:h-5',
          active && 'relative bg-(--afdd-background-highest) rounded',
          className
        )}
        onClick={onSubMenuClick}
      >
        <div className="flex items-center h-5 gap-1 whitespace-nowrap min-w-0">
          {active && (
            <div className="absolute left-4.75 w-1.25 h-5.5 rounded-[5px] bg-(--afdd-brand-surface-default-primary)" />
          )}
          <div>{active ? menuIconFilled : menuIcon}</div>
          <h5
            className="overflow-hidden text-ellipsis text-[16px] leading-5 font-medium"
            title={typeof text === 'string' ? text : ''}
          >
            {text}
          </h5>
        </div>
      </div>
    );

    if (to)
      return (
        <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
          {renderComponent()}
        </Link>
      );
    return renderComponent();
  }

  const renderComponent = () => (
    <div
      className={cn(
        'flex gap-1 h-11.25 px-5 cursor-pointer items-center justify-center hover:bg-(--afdd-background-high) hover:rounded [&_svg]:w-5 [&_svg]:h-5',
        active && 'relative bg-(--afdd-background-highest) rounded',
        className
      )}
      onClick={onSubMenuClick}
    >
      {active && (
        <div className="absolute left-1.5 w-1.25 h-5.5 rounded-[5px] bg-(--afdd-brand-surface-default-primary)"></div>
      )}
      <div className="flex items-center">{active ? menuIconFilled : menuIcon}</div>
    </div>
  );

  if (to) return <Link to={to}>{renderComponent()}</Link>;
  return renderComponent();
};
