import { TabPlatform, TabProduct } from './Tab';
import { TabContext } from './TabContext';
import { TabListPlatform, TabListProduct } from './TabList';

interface TabsProps {
  value: string;
  type?: '1' | '2' | '3' | '4';
  onChange: (value: string) => void;
  children:
    | React.ReactElement<typeof TabProduct | typeof TabPlatform>
    | React.ReactElement<typeof TabProduct | typeof TabPlatform>[];
  maxWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const TabsProduct = ({ value, type = '1', onChange, ...props }: TabsProps) => {
  return (
    <TabContext.Provider value={{ value, onChange, type }}>
      <TabListProduct {...props} />
    </TabContext.Provider>
  );
};

export const TabsPlatform = ({ value, type = '1', onChange, ...props }: TabsProps) => {
  return (
    <TabContext.Provider value={{ value, onChange, type }}>
      <TabListPlatform {...props} />
    </TabContext.Provider>
  );
};
