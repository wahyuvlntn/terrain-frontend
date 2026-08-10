import { STATUS_COLOR, STATUS_ICON } from '@digital-twin/components';
import { useMemo } from 'react';

import styles from './status-metric.module.scss';

interface StatusMetricProps {
  type: 'RUNNING' | 'IDLE' | 'UNPLANNED DOWN' | 'PLANNED DOWN' | 'OFFLINE';
  title: string;
  value: number;
  totalAssetCount: number;
  isHovering: boolean;
  onHover: (hover: boolean) => void;
}

export const StatusMetric = ({ type, title, value, totalAssetCount }: StatusMetricProps) => {
  const statusPercentage = useMemo(() => {
    return `(${
      isNaN((100 * value) / totalAssetCount) ? '0.0' : ((100 * value) / totalAssetCount).toFixed(1)
    }%)`;
  }, [totalAssetCount, value]);
  return (
    <div
      id={type}
      className={styles['status-metric-container']}
      style={{
        background: STATUS_COLOR[type],
        flex: 1,
      }}
      onMouseOver={() => {}}
      onMouseLeave={() => {}}
    >
      <div className={styles['metric-title']}>
        <div>
          {STATUS_ICON[type]}
          <span
            style={{
              whiteSpace: 'normal',
              textAlign: 'left',
              width: type === 'PLANNED DOWN' ? 50 : type === 'UNPLANNED DOWN' ? 60 : 'auto',
              textOverflow: 'ellipsis',
              display: 'block',
            }}
          >
            {title}
          </span>
        </div>
      </div>
      <div className={styles['metric-value-container']}>
        <span className={styles['metric-value']}>{`${value.toLocaleString()}`}</span>
        <span className={styles['metric-value-percent']}>{statusPercentage}</span>
      </div>
    </div>
  );
};
