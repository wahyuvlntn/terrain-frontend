import { ComponentProps, Fragment, forwardRef, ReactNode } from 'react';
import { cn } from '../../utils';

interface ContainerProps extends ComponentProps<'div'> {
  /**
   * The content to be displayed inside the container.
   * @type {ReactNode}
   */
  children: ReactNode;

  /**
   * The title of the container, displayed in the header.
   * @type {string}
   */
  title?: string;

  /**
   * An optional icon to be displayed alongside the title.
   * @type {ReactNode}
   */
  icon?: ReactNode;

  /**
   * An optional icon to be displayed alongside the title.
   * @type {ReactNode}
   */
  titleSuffixIcon?: ReactNode;

  /**
   * An optional component to be displayed at the top-right of the container.
   * @type {ReactNode}
   */
  rightTopComponent?: ReactNode;

  /**
   * Props to be passed to the title `div` element.
   * @type {React.ComponentProps<"div">}
   */
  titleProps?: React.ComponentProps<'div'>;

  /**
   * Props to be passed to the content wrapper `div` element.
   * @type {React.ComponentProps<"div">}
   */
  contentWrapperProps?: React.ComponentProps<'div'>;

  /**
   * Props to be passed to the header `div` element.
   * @type {React.ComponentProps<"div">}
   */
  headerProps?: React.ComponentProps<'div'>;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      title,
      icon,
      rightTopComponent,
      className,
      titleProps,
      contentWrapperProps,
      headerProps,
      titleSuffixIcon,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center gap-4 bg-(--afdd-background-low) p-4 rounded-lg text-(--afdd-neutral-text-title-heading)',
          className
        )}
        {...props}
      >
        {(title ?? icon) && (
          <div
            {...headerProps}
            className={cn(
              'flex justify-between items-center w-full min-h-7 max-h-7 gap-1',
              headerProps?.className
            )}
          >
            <div
              {...titleProps}
              className={cn('flex flex-row items-center gap-1', titleProps?.className)}
            >
              <Fragment>
                {icon}
                <span>{title}</span>
                {titleSuffixIcon}
              </Fragment>
            </div>
            {rightTopComponent}
          </div>
        )}

        <div
          className="flex flex-[1_1_0] bg-(--afdd-background-lowest) rounded self-stretch gap-5.25"
          {...contentWrapperProps}
        >
          {children}
        </div>
      </div>
    );
  }
);

Container.displayName = 'Container';
