import React, { Children, isValidElement, useEffect, useRef, useState } from 'react';
import { default as ArrowBackIcon } from '../../icons/ArrowBackIcon';
import { default as ArrowForwardIcon } from '../../icons/ArrowForwardIcon';
import { cn } from '../../utils';
import { TabPlatform, TabProduct } from './Tab';
import { useTabContext } from './TabContext';

interface TabListProps {
  children:
    | React.ReactElement<typeof TabProduct | typeof TabPlatform>
    | React.ReactElement<typeof TabProduct | typeof TabPlatform>[];
  maxWidth?: number;
  style?: React.CSSProperties;
  className?: string;
}

const TabList: React.FC<TabListProps> = ({
  children,
  maxWidth,
  style,
  className,
}: TabListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);
  const { type } = useTabContext();
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  const checkOverflow = () => {
    const container = containerRef.current;
    if (container) {
      const isOverflowing = container.scrollWidth > container.clientWidth;
      setIsOverflow(isOverflowing);
    }
  };

  const handleWheelScroll = (e: WheelEvent) => {
    e.preventDefault();
    if (containerRef.current) {
      containerRef.current.scrollLeft += e.deltaY;
    }
  };

  useEffect(() => {
    checkOverflow();
    const resizeListener = () => {
      checkOverflow();
    };
    window.addEventListener('resize', resizeListener);

    return () => {
      window.removeEventListener('resize', resizeListener);
    };
  }, [children]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheelScroll, {
        passive: false,
      });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheelScroll);
      }
    };
  }, []);

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: maxWidth ? -maxWidth : -100,
        behavior: 'smooth',
      });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: maxWidth ? maxWidth : 100,
        behavior: 'smooth',
      });
    }
  };

  const handleTabClick = (index: number) => {
    const tab = tabRefs.current[index];
    if (tab && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();

      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        tab.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'start',
        });
      }
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-center max-w-full [&_svg]:min-h-5 [&_svg]:min-w-5 [&_svg]:max-h-5',
        className
      )}
    >
      {isOverflow && (
        <ArrowBackIcon
          className="cursor-pointer p-1 shrink-0 transition-[background-color] duration-300 ease-linear"
          onClick={scrollLeft}
        />
      )}
      <div
        className={cn(
          'flex gap-0.5 whitespace-nowrap overflow-hidden scroll-smooth grow',
          type === '3' && '[&>div:not(:first-child)]:-ml-3'
        )}
        aria-details={
          type === '2'
            ? 'list-secondary'
            : type === '3'
              ? 'list-tertiary'
              : type === '4'
                ? 'list-quaternary'
                : 'list-primary'
        }
        style={{ maxWidth: maxWidth ? maxWidth : '100%', ...style }}
        ref={containerRef}
        onWheel={(e) => {
          handleWheelScroll(e as unknown as WheelEvent);
        }}
      >
        {Children.map(children, (child, index) => {
          if (!isValidElement(child) || !(child.type === TabPlatform || child.type === TabProduct))
            return null;
          return (
            <div
              className="flex"
              //@ts-expect-error ref callback type mismatch
              ref={(el) => (tabRefs.current[index] = el)}
              onClick={() => {
                handleTabClick(index);
              }}
              //@ts-expect-error wrapper style is not always exist
              style={{ ...(child.props.wrapperStyle as React.CSSProperties) }}
            >
              {child}
            </div>
          );
        })}
      </div>
      {isOverflow && containerRef.current && (
        <ArrowForwardIcon
          className="cursor-pointer p-1 shrink-0 transition-[background-color] duration-300 ease-linear"
          onClick={scrollRight}
        />
      )}
    </div>
  );
};

export const TabListProduct = ({ className, ...props }: TabListProps) => {
  return (
    <TabList
      {...props}
      className={cn(
        className,
        "[&_div[aria-details='list-primary']]:border-b-2 [&_div[aria-details='list-primary']]:border-b-(--afdd-background-highest)",
        "[&_div[aria-details='list-secondary']]:border-b-2 [&_div[aria-details='list-secondary']]:border-b-(--afdd-background-low)",
        "[&_div[aria-details='list-tertiary']]:border-b-2 [&_div[aria-details='list-tertiary']]:border-b-transparent",
        "[&_div[aria-details='list-quaternary']]:border-b-2 [&_div[aria-details='list-quaternary']]:border-b-transparent"
      )}
    />
  );
};

export const TabListPlatform = ({ className, ...props }: TabListProps) => {
  return (
    <TabList
      {...props}
      className={cn(
        className,
        "[&_div[aria-details='list-primary']]:border-b-2 [&_div[aria-details='list-primary']]:border-b-(--afdd-brand-surface-default-primary)",
        "[&_div[aria-details='list-secondary']]:border-b-2 [&_div[aria-details='list-secondary']]:border-b-(--afdd-background-default)",
        "[&_div[aria-details='list-tertiary']]:border-b-2 [&_div[aria-details='list-tertiary']]:border-b-transparent",
        "[&_div[aria-details='list-quaternary']]:border-b-2 [&_div[aria-details='list-quaternary']]:border-b-transparent"
      )}
    />
  );
};
