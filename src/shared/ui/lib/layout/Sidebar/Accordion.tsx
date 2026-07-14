import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { To } from 'react-router-dom';

import { default as OptionIcon } from '../../icons/OptionIcon';
import { cn } from '../../utils';
import { MenuButton } from './MenuButton';
import { SubMenuButton } from './SubMenuButton';

interface AccordionChildren {
  icon: React.ReactNode;
  iconFilled: React.ReactNode;
  text: React.ReactNode;
  active?: boolean;
  to?: To;
  className?: string;

  /**
   * Additional props to be passed to the component
   */
  [key: string]: unknown;
}

interface AccordionProps {
  /** Icon to be displayed in the MenuButton */
  icon: React.ReactNode;
  /** Icon to be displayed in the MenuButton when it is active */
  iconFilled: React.ReactNode;
  /** Text to be displayed in the MenuButton */
  text: React.ReactNode;
  /** Indicates if the accordion button is active */
  active?: boolean;
  /** Indicates if the accordion is expanded */
  isExpanded: boolean;
  /** Indicates if the children of the accordion are expanded */
  isChildrenExpanded?: boolean;
  /** Array of submenus to be displayed */
  subMenus: AccordionChildren[];
  /** Optional icon for the right side when expanded */
  expandedRightIcon?: React.ReactNode;
  /** Optional icon for the right side when collapsed */
  collapsedRightIcon?: React.ReactNode;
  /** Function to be called when the menu button is clicked */
  onMenuClick?: () => void;
  /** Function to be called when a submenu button is clicked */
  onSubMenuClick: (item: AccordionChildren) => void;
  /** Optional react router url */
  to?: To;
  /** Optional classname */
  className?: string;
}

export const Accordion = ({
  icon,
  iconFilled,
  active,
  isExpanded,
  isChildrenExpanded,
  text,
  subMenus,
  expandedRightIcon,
  collapsedRightIcon,
  onMenuClick,
  onSubMenuClick,
  to,
  className,
}: AccordionProps) => {
  return (
    <div className="flex flex-col gap-1">
      <MenuButton
        menuIcon={icon}
        menuIconFilled={iconFilled}
        isExpanded={isExpanded}
        text={text}
        active={active}
        expandedRightIcon={isChildrenExpanded ? expandedRightIcon : collapsedRightIcon}
        collapsedRightIcon={
          !isExpanded ? (
            <OptionIcon
              style={{
                width: '24px',
                height: '24px',
              }}
            />
          ) : (
            collapsedRightIcon
          )
        }
        onMenuClick={onMenuClick}
        to={to}
        className={className}
      />
      <AnimatePresence>
        {isChildrenExpanded && (
          <motion.div
            className={cn(
              'flex flex-col gap-0.5 bg-(--afdd-background-lowest) overflow-hidden',
              isExpanded && 'flex flex-col rounded'
            )}
            initial="hidden"
            animate="show"
            exit="exit"
            variants={{
              hidden: { height: 0 },
              show: {
                height: 'unset',
                transition: {
                  duration: 0.25,
                },
              },
              exit: {
                height: 0,
                transition: {
                  duration: 0.25,
                },
              },
            }}
          >
            {subMenus.length > 0 &&
              subMenus.map((subMenu, index) => (
                <SubMenuButton
                  key={index}
                  menuIcon={subMenu.icon}
                  menuIconFilled={subMenu.iconFilled}
                  isExpanded={isExpanded}
                  text={subMenu.text}
                  active={subMenu.active}
                  onSubMenuClick={() => {
                    onSubMenuClick(subMenu);
                  }}
                  to={subMenu.to}
                  className={subMenu.className}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

Accordion.displayName = 'Accordion';
