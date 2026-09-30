import clsx from 'clsx';
import React, { useEffect, useState } from 'react';

import styles from './loading.module.scss';

interface LoadingProps {
  isLoading: boolean;
  delayLoading?: number;
  scale?: number;
}

export const Loading = ({
  isLoading,
  delayLoading = 500,
  scale = 0.5,
}: LoadingProps) => {
  const [delayedLoading, setDelayedLoading] = useState<boolean>(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDelayedLoading(isLoading || false);
    }, delayLoading);

    return () => {
      clearTimeout(timeout);
    };
  }, [isLoading, delayLoading]);

  // a shimmer sweeping over the area instead of a dimming overlay with icons; `scale` is kept for
  // the callers but no longer used
  void scale;
  return delayedLoading ? (
    <div
      className={clsx(styles['reusable-loading-data'], styles['reusable-loading-data__shimmer'])}
      role="progressbar"
      aria-busy="true"
      aria-label="Loading"
    />
  ) : null;
};
