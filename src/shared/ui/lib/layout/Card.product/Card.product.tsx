import { cn } from '../../utils';

interface CardProps extends React.ComponentProps<'div'> {
  /**
   * The title of the card, displayed in the header.
   * @type {string}
   */
  title?: string;

  /**
   * State whether the card is being selected or not
   * @type {boolean}
   */
  isSelected?: boolean;

  /**
   * The main content inside the card.
   * @type {React.ReactNode}
   */
  children?: React.ReactNode;

  /**
   * Additional content to be displayed in the card header, next to the title.
   * @type {React.ReactNode}
   */
  headerChildren?: React.ReactNode;

  /**
   * Props to be passed to the content wrapper `div` element.
   * @type {React.ComponentProps<"div">}
   */
  contentWrapperProps?: React.ComponentProps<'div'>;

  /**
   * Props to be passed to the title `span` element.
   * @type {React.ComponentProps<"span">}
   */
  titleProps?: React.ComponentProps<'span'>;

  /**
   * Props to be passed to the header `div` element.
   * @type {React.ComponentProps<"div">}
   */
  headerProps?: React.ComponentProps<'div'>;

  /**
   * Props to be passed to the header `div` element.
   * @type {React.ComponentProps<"div">}
   */
  headerClassName?: string;

  /**
   * Props to be passed to the thumbnail `div` element.
   * @type {React.ComponentProps<"div">}
   */
  thumbnailProps?: React.ComponentProps<'div'>;

  /**
   * The type of the card, which determines its layout and appearance.
   * Can be "default", "strip", or "strip-status-thumbnail".
   * @type {"default" | "strip" | "strip-status-thumbnail"}
   */
  type?: 'default' | 'strip' | 'strip-status-thumbnail';

  /**
   * The color of the strip for the card types "strip" and "strip-status-thumbnail".
   * @type {string}
   */
  stripColor?: string;

  /**
   * Content to be displayed inside the thumbnail area for "strip-status-thumbnail" type.
   * @type {React.ReactNode}
   */
  thumbnailContent?: React.ReactNode;
}

export const Card = ({
  title,
  type = 'default',
  isSelected = false,
  children,
  headerChildren,
  contentWrapperProps = {},
  thumbnailContent,
  titleProps,
  headerProps,
  headerClassName,
  thumbnailProps,
  stripColor,
  className,
  ...props
}: CardProps) => {
  const combinedProps = {
    ...contentWrapperProps,
    ...(type !== 'default' && {
      style: { borderLeftColor: stripColor, ...contentWrapperProps.style },
    }),
  };

  return (
    <div
      className={cn(
        'flex flex-col w-full border-none rounded-lg h-full overflow-hidden',
        isSelected &&
          'outline-2 outline-(--afdd-brand-border-default-primary) -outline-offset-2',
        className
      )}
      {...props}
    >
      {type === 'default' && (
        <>
          <div
            className={cn(
              'flex bg-(--afdd-background-high) min-h-13 px-4 py-2 items-center justify-between box-border',
              headerClassName
            )}
            {...headerProps}
          >
            <span className="text-(--afdd-neutral-text-title-heading)" {...titleProps}>
              {title}
            </span>
            {headerChildren}
          </div>
          <div
            className="flex bg-(--afdd-background-default) p-4 h-full box-border"
            {...combinedProps}
          >
            {children}
          </div>
        </>
      )}
      {type === 'strip-status-thumbnail' && (
        <div className="grid grid-cols-[25%_75%] h-full group">
          <div
            className="bg-(--afdd-background-low) flex h-full justify-center items-center box-border px-3 py-4 group-hover:bg-(--afdd-background-default)"
            {...thumbnailProps}
          >
            {thumbnailContent}
          </div>
          <div
            className={cn(
              'flex bg-(--afdd-background-low) p-4 h-full box-border border-l-8 border-l-solid hover:bg-(--afdd-background-default) group-hover:bg-(--afdd-background-default)'
            )}
            {...combinedProps}
          >
            {children}
          </div>
        </div>
      )}
      {type === 'strip' && (
        <div
          className={cn(
            'flex bg-(--afdd-background-low) p-4 h-full box-border border-l-8 border-l-solid hover:bg-(--afdd-background-default)'
          )}
          {...combinedProps}
        >
          {children}
        </div>
      )}
    </div>
  );
};

Card.displayName = 'Card';
