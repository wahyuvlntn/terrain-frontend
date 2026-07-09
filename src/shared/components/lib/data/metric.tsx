import { ParameterDisplay } from '@digital-twin/reusables';
import clsx from 'clsx';
import React, { CSSProperties, ReactNode } from 'react';

import styles from './metric.module.scss';

interface MetricProps {
  icon?: ReactNode;
  titleIcon?: ReactNode;
  value: number | string;
  unit?: ReactNode;
  title: React.ReactNode;
  borderColor: string;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  variant?: 'large' | 'small' | 'smaller';
  titleVariant?: 'large' | 'small' | 'smaller';
  tooltipText?: string | null | undefined;
}

export const Metric = ({
  borderColor,
  unit,
  title,
  icon,
  titleIcon,
  value,
  containerStyle,
  containerClassName,
  variant = 'large',
  titleVariant = 'large',
  tooltipText,
}: MetricProps) => {
  return (
    <ParameterDisplay
      borderColor={borderColor}
      className={clsx(
        styles.metric,
        containerClassName,
        variant === 'small' && styles.small
      )}
      style={{
        ...containerStyle,
        backgroundColor: borderColor
      }}
    >
      <div className={styles['title']}>
        <span style={titleVariant === 'smaller' ? { fontSize: '13px' } : {}}>
          {title}
        </span>
        {titleIcon}
      </div>
      <div className={styles.content} title={tooltipText ?? undefined}>
        {icon}
        <div className={styles.badge}>
          {variant === 'large' ? (
            <>
              <span className={styles.value}>{value}</span>
              {unit ? <span className={styles.unit}>{unit}</span> : null}
            </>
          ) : (
            <span
              style={variant === 'smaller' ? { fontSize: 16 } : {}}
            >{`${value}${unit ?? ''}`}</span>
          )}
        </div>
      </div>
    </ParameterDisplay>
  );
};
