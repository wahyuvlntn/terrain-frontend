import { Container as MasterContainer } from '@digital-twin/reusables';
import clsx from 'clsx';
import React, { ComponentProps, CSSProperties, forwardRef, ReactNode } from 'react';

import styles from './container.module.scss';

interface ContainerProps extends Omit<ComponentProps<'div'>, 'ref'> {
  children: ReactNode;
  title?: string;
  multipleTitle?: {
    title?: string;
    informationIcon?: ReactNode;
    icon?: ReactNode;
    selected: boolean;
  }[];
  onClickMultiple?: (title: string) => void;
  contentWrapperProps?: React.ComponentProps<'div'>;
  titleProps?: React.ComponentProps<'div'>;
  icon?: ReactNode;
  titleSuffixIcon?: ReactNode;
  rightTopComponent?: ReactNode;
  informationIcon?: ReactNode;
  background?: 'default' | 'none';
  headerProps?: React.ComponentProps<'div'>;
}

const defaultContentWrapperStyle: CSSProperties = {
  flexDirection: 'column',
  gap: 21,
};

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      title,
      icon,
      titleSuffixIcon,
      informationIcon,
      rightTopComponent,
      contentWrapperProps,
      titleProps,
      className,
      multipleTitle,
      onClickMultiple,
      background = 'default',
      headerProps,
      ...props
    },
    ref
  ) => {
    const combinedContentWrapperProps = {
      ...contentWrapperProps,
      style: {
        background: background === 'none' ? 'unset' : undefined,
        overflow: 'auto',
        ...defaultContentWrapperStyle,
        ...contentWrapperProps?.style,
      },
    };

    return (
      <MasterContainer
        ref={ref}
        icon={icon}
        titleSuffixIcon={titleSuffixIcon}
        rightTopComponent={rightTopComponent}
        className={className}
        title={title}
        titleProps={{
          ...titleProps,
          className : styles["container-title"],
          style: {
            ...titleProps?.style,
          },
        }}
        contentWrapperProps={combinedContentWrapperProps}
        headerProps={{
          ...headerProps,
          className: clsx(styles['container-header'], headerProps?.className),
        }}
        {...props}
      >
        {children}
      </MasterContainer>
    );
  }
);

Container.displayName = 'Container';
