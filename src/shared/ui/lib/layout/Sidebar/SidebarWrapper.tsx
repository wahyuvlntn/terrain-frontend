import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { createContext, ReactNode, useCallback, useEffect, useId, useState } from 'react';
import { default as KeyboardArrowLeftIconSidebar } from '../../icons/KeyboardArrowLeftIconSidebar';
import { cn } from '../../utils';
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from './const';

interface SidebarContextProps {
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export interface SidebarWrapperProps {
  /** The content of the sidebar, can be a node or a function receiving sidebar context */
  children?: ReactNode | ((props: SidebarContextProps) => ReactNode);
  /** Alignment of the sidebar button, either 'left' or 'right' */
  align?: 'left' | 'right';
  /** Minimum width of the collapsed sidebar */
  minWidth?: number;
  /** Maximum width of the expanded sidebar */
  maxWidth?: number;
  /** Whether the sidebar is expanded by default */
  expanded?: boolean;
  /** Callback when the sidebar expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Additional class names for custom styling */
  className?: string;
  /** "layout" prop given to the outer motion.div */
  layout?: boolean | 'size' | 'position' | 'preserve-aspect';
}

export const SidebarWrapper = ({
  children,
  align = 'right',
  expanded = true,
  onExpandedChange,
  className,
  layout,
  maxWidth = SIDEBAR_EXPANDED_WIDTH,
  minWidth = SIDEBAR_COLLAPSED_WIDTH,
}: SidebarWrapperProps) => {
  const id = useId();
  const [isExpanded, setIsExpanded] = useState(expanded);
  const width = useMotionValue(isExpanded ? maxWidth : minWidth);
  const widthTween = useSpring(width, {
    bounce: 0,
    velocity: 0,
    duration: 400,
  });
  const widthTranformed = useMotionTemplate`${widthTween}px`;

  const toggleExpanded = useCallback(() => {
    width.set(isExpanded ? minWidth : maxWidth);
    setIsExpanded((prev) => !prev);
    onExpandedChange?.(!isExpanded);
  }, [isExpanded, maxWidth, minWidth, width]);

  const content =
    typeof children === 'function' ? children({ isExpanded, setIsExpanded }) : children;

  useEffect(() => {
    width.set(expanded ? maxWidth : minWidth);
    setIsExpanded(expanded);
  }, [expanded, width]);

  return (
    <SidebarContext.Provider value={{ isExpanded, setIsExpanded }}>
      <motion.div
        layout={layout ?? true}
        className="flex h-full relative group/sidebar"
        style={{ width: widthTranformed, minWidth: widthTranformed }}
      >
        <div
          className={cn(
            'flex flex-col h-full w-full bg-(--afdd-background-low) relative overflow-auto',
            className
          )}
        >
          {content}
        </div>
        <motion.button
          onClick={toggleExpanded}
          className={cn(
            'border-0 p-0 appearance-none font-inherit w-7.25 h-7.25 flex items-center justify-center cursor-pointer z-2 absolute top-1/2 -right-3.25 invisible group-hover/sidebar:visible transition-all duration-600 ease-in-out bg-(--afdd-background-high) shadow-[2px_2px_4px_0_rgba(0,0,0,0.05)] rounded-full [&_path]:fill-(--afdd-neutral-text-title-heading)',
            align === 'left' && '-left-3.75'
          )}
          animate={{ rotate: !isExpanded ? 0 : -180 }}
        >
          <KeyboardArrowLeftIconSidebar
            id={id}
            style={{
              width: '24px',
              height: '24px',
              transform: `rotate(${align === 'right' ? '180deg' : '0deg'})`,
            }}
          />
        </motion.button>
      </motion.div>
    </SidebarContext.Provider>
  );
};
