import { ReactNode } from 'react';

interface MainLayoutContainerProps {
  sidebar: ReactNode;
  header: ReactNode;
  children?: ReactNode;
}

export const MainLayoutContainer = ({ sidebar, header, children }: MainLayoutContainerProps) => {
  return (
    <div className="flex w-screen h-screen items-start bg-(--afdd-background-lowest) overflow-auto text-(--afdd-neutral-text-body-light) relative">
      <div className="flex items-center self-stretch">{sidebar}</div>
      <div className="flex flex-col items-start self-stretch w-full overflow-hidden">
        <div className="w-full">{header}</div>
        <div className="overflow-hidden w-full h-full p-4 box-border">{children}</div>
      </div>
    </div>
  );
};

MainLayoutContainer.displayName = 'MainLayoutContainer';
