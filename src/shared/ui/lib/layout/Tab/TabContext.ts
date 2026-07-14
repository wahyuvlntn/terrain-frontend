import { createContext, useContext } from 'react';

interface TabContextType {
  value: string;
  type?: '1' | '2' | '3' | '4';
  onChange: (value: string) => void;
}

export const TabContext = createContext<TabContextType | undefined>(undefined);

export const useTabContext = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabContext must be used within a TabProvider');
  }
  return context;
};
