import React from 'react';
import { cn } from '../../utils';
import { TabContext } from './TabContext';

interface TabProviderProps {
  children: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  type?: '1' | '2' | '3' | '4';
  className?: string;
  style?: React.CSSProperties;
}

export const TabProvider: React.FC<TabProviderProps> = ({
  children,
  value,
  type = '1',
  className,
  style,
  onChange,
}) => {
  return (
    <TabContext.Provider value={{ value, onChange, type }}>
      <div className={cn('flex flex-col w-full', className)} style={style}>
        {children}
      </div>
    </TabContext.Provider>
  );
};
