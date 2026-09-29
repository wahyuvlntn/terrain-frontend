import { cn } from '../../utils';
import { useTabContext } from './TabContext';

interface TabPanelProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  className,
  style,
}: TabPanelProps) => {
  const { value: selectedValue, type } = useTabContext();

  return selectedValue === value ? (
    <div
      className={cn('px-2 py-4', className)}
      style={style}
      aria-description={
        type === '2' ? 'panel-secondary' : type === '3' ? 'panel-tertiary' : 'panel-primary'
      }
    >
      {children}
    </div>
  ) : null;
};

export const TabPanelProduct = ({ className, ...props }: TabPanelProps) => {
  return (
    <TabPanel
      className={cn(
        className,
        "aria-[aria-description='panel-secondary']:bg-transparent"
      )}
      {...props}
    />
  );
};

export const TabPanelPlatform = ({ className, ...props }: TabPanelProps) => {
  return (
    <TabPanel
      className={cn(
        className,
        "aria-[aria-description='panel-secondary']:bg-transparent",
        "aria-[aria-description='panel-tertiary']:bg-transparent"
      )}
      {...props}
    />
  );
};
