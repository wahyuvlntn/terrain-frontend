import { cn } from '../../utils';

interface ParameterDisplayProps {
  /**
   * The color of the border for the metric component.
   * @type {string}
   */
  borderColor: string;

  /**
   * The content to be displayed inside the metric component.
   * @type {React.ReactNode}
   */
  children?: React.ReactNode;

  style?: React.CSSProperties;

  className?: string;

  /**
   * Props to be passed to the wrapper `div` element.
   * This allows for additional customization of the wrapper.
   * @type {React.ComponentProps<"div">}
   */
  wrapperProps?: React.ComponentProps<'div'>;
}

export const ParameterDisplay = ({
  borderColor,
  children,
  style,
  className,
  wrapperProps,
}: ParameterDisplayProps) => {
  return (
    <div
      className={cn(
        'border-solid border-b-[6px] rounded-sm px-8 py-3.5 pb-2 flex items-center bg-(--afdd-background-low) text-(--afdd-neutral-text-title-heading)',
        className
      )}
      style={{
        borderColor,
        ...style,
      }}
      {...wrapperProps}
    >
      {children}
    </div>
  );
};
