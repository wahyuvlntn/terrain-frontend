// React builtins
import { useMemo } from 'react';

export const useVerticalLimit = ({
  container,
  itemHeight,
  itemGap = 0,
  offset = 0,
}: {
  container: HTMLDivElement | null;
  itemHeight: number;
  itemGap?: number;
  offset?: number;
}) => {
  return useMemo(() => {
    if (!container) {
      return null;
    }

    const divisor = itemHeight + itemGap;

    // Handle division by zero
    if (divisor === 0) {
      return 1;
    }

    return Math.max(
      Math.floor((container.clientHeight - offset + itemGap) / divisor),
      1
    );
  }, [container, itemHeight, itemGap, offset]);
};
