import clsx from 'clsx';
import React, { CSSProperties, useEffect, useState } from 'react';

import styles from './loading-circle.module.scss';

interface LoadingCircleProps {
  isLoading: boolean;
  delayLoading?: number;
  scale?: number;
  style?: CSSProperties;
}

export const LoadingCircle = ({
  isLoading,
  delayLoading = 0,
  scale = 0.5,
  style,
}: LoadingCircleProps) => {
  const [delayedLoading, setDelayedLoading] = useState<boolean>(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDelayedLoading(isLoading || false);
    }, delayLoading);

    return () => {
      clearTimeout(timeout);
    };
  }, [isLoading, delayLoading]);

  return delayedLoading ? (
    <div
      className={clsx(
        styles['reusable-loading-data'],
        styles['reusable-loading-data__cover']
      )}
      style={style}
    >
      <div
        style={{ scale: String(scale) }}
        className={styles['reusable-loading-data__loader']}
      />
    </div>
  ) : null;
};
