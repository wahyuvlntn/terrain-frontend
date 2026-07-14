import { ReactNode } from 'react';

interface SidebarHeaderProps {
  symbol: ReactNode;
  logoType: ReactNode;
  collapsed: boolean;
}

export const SidebarHeader = ({ symbol, logoType, collapsed }: SidebarHeaderProps) => {
  return (
    <div className="flex flex-row items-center gap-2.5 px-6.25 py-3 bg-(--afdd-background-default) h-13.75 min-h-13.75 box-border overflow-hidden text-(--afdd-neutral-text-title-heading)">
      <div className="h-8.25 w-8.25 shrink-0 grow-0">{symbol}</div>
      <div
        style={{
          visibility: collapsed ? 'hidden' : 'visible',
        }}
      >
        {logoType}
      </div>
    </div>
  );
};

SidebarHeader.displayName = 'SidebarHeader';
