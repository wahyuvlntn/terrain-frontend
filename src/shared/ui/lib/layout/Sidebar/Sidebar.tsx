import React, { ReactNode } from 'react';
import { To } from 'react-router-dom';
import { cn } from '../../utils';
import { Accordion } from './Accordion';
import { MenuButton } from './MenuButton';
import { SidebarHeader } from './SidebarHeader';
import { SidebarWrapper } from './SidebarWrapper';

interface SubMenu {
  /**
   * A React node used as the icon for the submenu.
   */
  icon: ReactNode;

  /**
   * A React node used as the icon for the submenu when is active.
   */
  iconFilled: ReactNode;

  /**
   * The display text for the submenu.
   */
  text: React.ReactNode;

  /**
   * Optional. Indicates whether the submenu is currently active.
   */
  active?: boolean;

  /**
   * Optional react router url
   */
  to?: To;

  /**
   * Optional classname
   */
  className?: string;

  /**
   * Allows any additional user-defined properties of any type.
   */
  [key: string]: unknown;
}

interface Menu {
  /**
   * A React node used as the icon for the menu.
   */
  icon: ReactNode;

  /**
   * A React node used as the icon for the menu when it is active.
   */
  iconFilled: ReactNode;

  /**
   * The display text for the menu.
   */
  text: React.ReactNode;

  /**
   * Optional. Indicates whether the menu is currently active.
   */
  active?: boolean;

  /**
   * Optional. Indicates whether the children submenus are expanded.
   */
  isChildrenExpanded?: boolean;

  /**
   * Optional. An array of `SubMenu` objects representing the submenus.
   */
  subMenus?: SubMenu[];

  /**
   * Optional icon for the right side when expanded
   */
  expandedRightIcon?: React.ReactNode;

  /**
   * Optional icon for the right side when collapsed
   */
  collapsedRightIcon?: React.ReactNode;

  /**
   * Optional react router url
   */
  to?: To;

  /**
   * Optional classname
   */
  className?: string;

  /**
   * Allows any additional user-defined properties of any type.
   */
  [key: string]: unknown;
}

interface SidebarProps {
  /**
   * Specifies the alignment of the sidebar; it can be 'left' or 'right'.
   */
  align: 'left' | 'right';

  /**
   * A React node displayed when the sidebar is in its expanded state.
   */
  symbol: ReactNode;

  /**
   * A React node displayed when the sidebar is in its collapsed state.
   */
  logoType: ReactNode;

  /**
   * An array of `Menu` objects to be displayed as menu items in the sidebar.
   */
  menuItems: Menu[];

  /**
   * Function to handle click events on menu items. Receives the clicked `Menu` item as an argument.
   */
  onMenuClick: (menu: Menu) => void;

  /**
   * Optional. Function to handle click events on submenu items. Receives the clicked `Menu` and `SubMenu` as arguments.
   */
  onSubMenuClick?: (menu: Menu, subMenu: SubMenu) => void;
  /** Minimum width of the collapsed sidebar */
  minWidth?: number;
  /** Maximum width of the expanded sidebar */
  maxWidth?: number;
  /**
   * Sidebar expanded state
   */
  expanded?: boolean;
  /** Callback when the sidebar expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;

  /** "layout" prop given to the outer motion.div */
  layout?: boolean | 'size' | 'position' | 'preserve-aspect';
}

export const Sidebar = ({
  align,
  symbol,
  logoType,
  menuItems,
  onMenuClick,
  onSubMenuClick,
  maxWidth,
  minWidth,
  expanded,
  onExpandedChange,
  layout,
}: SidebarProps) => {
  return (
    <SidebarWrapper
      align={align}
      maxWidth={maxWidth}
      minWidth={minWidth}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      layout={layout}
    >
      {({ isExpanded }) => (
        <>
          <SidebarHeader symbol={symbol} logoType={logoType} collapsed={!isExpanded} />
          <div
            className={cn(
              'flex flex-col h-full w-full bg-(--afdd-background-low) relative overflow-auto'
            )}
          >
            <div
              className={cn(
                'flex flex-col box-border px-4 py-3.75 gap-0.75 w-full h-full overflow-auto text-(--afdd-neutral-text-title-heading) [&_svg]:w-5 [&_svg]:h-5'
              )}
            >
              {menuItems.map((menuItem, index) =>
                menuItem.subMenus && menuItem.subMenus.length > 0 ? (
                  <Accordion
                    key={index}
                    isExpanded={isExpanded}
                    icon={menuItem.icon}
                    iconFilled={menuItem.iconFilled}
                    text={menuItem.text}
                    active={menuItem.active}
                    isChildrenExpanded={menuItem.isChildrenExpanded}
                    expandedRightIcon={menuItem.expandedRightIcon}
                    collapsedRightIcon={menuItem.collapsedRightIcon}
                    subMenus={menuItem.subMenus}
                    onMenuClick={() => {
                      onMenuClick(menuItem);
                    }}
                    onSubMenuClick={(subMenu) => {
                      onSubMenuClick && onSubMenuClick(menuItem, subMenu);
                    }}
                    to={menuItem.to}
                    className={menuItem.className}
                  />
                ) : (
                  <MenuButton
                    key={index}
                    isExpanded={isExpanded}
                    menuIcon={menuItem.icon}
                    menuIconFilled={menuItem.iconFilled}
                    text={menuItem.text}
                    active={menuItem.active}
                    onMenuClick={() => {
                      onMenuClick(menuItem);
                    }}
                    expandedRightIcon={menuItem.expandedRightIcon}
                    collapsedRightIcon={menuItem.collapsedRightIcon}
                    to={menuItem.to}
                    className={menuItem.className}
                  />
                )
              )}
            </div>
          </div>
        </>
      )}
    </SidebarWrapper>
  );
};
