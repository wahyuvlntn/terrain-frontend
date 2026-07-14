import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, To } from 'react-router-dom';
import { default as KeyboardArrowRightIcon } from '../../icons/KeyboardArrowRightIcon';
import SvgThreeDots from '../../icons/ThreeDots';
import { cn } from '../../utils';

interface BreadcrumbItem {
  /** The display text for the breadcrumb item. */
  text: ReactNode;

  /** Optional react router url. */
  to?: To;

  /** Allows any additional user-defined properties of any type. */
  [key: string]: unknown;
}

interface BreadcrumbItemProps extends BreadcrumbItem {
  onClick?: () => void;
  showArrow?: boolean;
  active?: boolean;
  className?: string;
}

const BreadcrumbItem = ({
  text,
  active,
  onClick,
  showArrow = true,
  to,
  className,
}: BreadcrumbItemProps) => {
  const renderComponent = () => (
    <li
      className={cn(
        'flex items-center gap-2 opacity-60 [&_svg]:w-5 [&_svg]:h-5',
        active && 'opacity-100',
        className
      )}
    >
      {showArrow && <KeyboardArrowRightIcon id="breadcrumb" />}
      <h5
        onClick={onClick}
        style={{
          width: '100%',
        }}
      >
        {text}
      </h5>
    </li>
  );

  if (to)
    return (
      <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
        {renderComponent()}
      </Link>
    );
  return renderComponent();
};

export interface BreadcrumbsProps {
  /** A React node used as an icon displayed in the breadcrumb component. */
  icon: ReactNode;

  /** An array of `BreadcrumbItem` objects representing each breadcrumb in the navigation chain. */
  items: BreadcrumbItem[];

  /**
   * Optional. A callback function that is called when a breadcrumb item is clicked.
   * Receives the `BreadcrumbItem` as its parameter.
   */
  onClick?: (item: BreadcrumbItem) => void;

  /** Optional. A CSS class name for styling the breadcrumb component. */
  className?: string;

  /**
   * Optional. Maximum number of breadcrumb items to display before clipping.
   * When items exceed this number, the display shows: first item → three-dots → (maxVisibleItems - 1) last items.
   * Default is 3 (shows: first → dots → last 2 items).
   */
  maxVisibleItems?: number;
}

interface ClippedItemsDropdownProps {
  items: BreadcrumbItem[];
  onClick?: (item: BreadcrumbItem) => void;
}

const ClippedItemsDropdown = ({ items, onClick }: ClippedItemsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        className="flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer opacity-60 transition-opacity duration-200 [&_svg]:w-5 [&_svg]:h-5"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Show hidden breadcrumbs"
      >
        <KeyboardArrowRightIcon id="breadcrumb" />
        <SvgThreeDots width={22} height={22} />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="border border-solid border-(--afdd-brand-border-default-primary) rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-50 py-2 z-9999 bg-(--afdd-background-low) text-(--afdd-neutral-text-title-heading)"
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
          >
            {items.map((item, index) => (
              <BreadcrumbItem
                key={index}
                text={item.text}
                onClick={() => {
                  onClick?.(item);
                  setIsOpen(false);
                }}
                to={item.to}
                className="px-4 py-2 gap-0 cursor-pointer hover:opacity-90"
              />
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export const Breadcrumbs = ({
  icon,
  items,
  onClick,
  className,
  maxVisibleItems = 3,
}: BreadcrumbsProps) => {
  const shouldClip = items.length > maxVisibleItems;

  if (shouldClip) {
    const firstItem = items[0];
    const lastItems = items.slice(-(maxVisibleItems - 1));
    const clippedItems = items.slice(1, -(maxVisibleItems - 1));

    return (
      <ol
        className={cn(
          'm-0 flex gap-2 items-center text-(--afdd-neutral-text-title-heading) [&_h5]:m-0 [&_h5]:cursor-pointer [&_h5]:text-xl [&_h5]:font-medium [&_h5]:leading-6.25',
          className
        )}
      >
        {icon && (
          <div
            className={cn('opacity-60 [&_svg]:w-6 [&_svg]:h-6', items.length <= 1 && 'opacity-100')}
          >
            {icon}
          </div>
        )}
        <BreadcrumbItem
          text={firstItem.text}
          onClick={() => onClick?.(firstItem)}
          to={firstItem.to}
          showArrow={false}
        />
        <ClippedItemsDropdown items={clippedItems} onClick={onClick} />
        {lastItems.map((item, index) => (
          <BreadcrumbItem
            key={index}
            text={item.text}
            onClick={() => onClick?.(item)}
            to={item.to}
            active={index === lastItems.length - 1}
            showArrow={true}
          />
        ))}
      </ol>
    );
  }

  return (
    <ol
      className={cn(
        'm-0 flex gap-2 items-center text-(--afdd-neutral-text-title-heading) [&_h5]:m-0 [&_h5]:cursor-pointer [&_h5]:text-xl [&_h5]:font-medium [&_h5]:leading-6.25',
        className
      )}
    >
      {icon && (
        <div
          className={cn('opacity-60 [&_svg]:w-6 [&_svg]:h-6', items.length <= 1 && 'opacity-100')}
        >
          {icon}
        </div>
      )}
      {items.map((item, index) => (
        <BreadcrumbItem
          key={index}
          text={item.text}
          onClick={() => onClick?.(item)}
          to={item.to}
          active={index === items.length - 1}
          showArrow={index > 0}
        />
      ))}
    </ol>
  );
};

Breadcrumbs.displayName = 'Breadcrumbs';
