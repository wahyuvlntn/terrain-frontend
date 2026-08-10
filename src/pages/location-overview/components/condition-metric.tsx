import { CONDITION_COLOR } from '@digital-twin/components';

import styles from './condition-metric.module.scss';

interface StatusMetricProps {
  type: 'NORMAL' | 'WARNING' | 'CRITICAL';
  title: string;
  value: number;
  ConditionIcon: React.ReactNode;
}

export const ConditionMetric = ({ type, value, title, ConditionIcon }: StatusMetricProps) => {
  return (
    <div
      title={title + ' : ' + value}
      className={styles['condition-status']}
      style={{ borderLeft: `12px solid ${CONDITION_COLOR[type]}` }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {ConditionIcon}
        <span
          style={{
            whiteSpace: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
      </div>
      <span
        style={{
          textAlign: 'right',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >{`${value}`}</span>
    </div>
  );
};
