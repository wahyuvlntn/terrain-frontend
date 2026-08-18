import { ALARM_COLOR } from '../../../../index';
import styles from './status-indicator.module.scss';

interface StatusIndicatorProps {
  status: string;
  statusType: string;
}

export default function StatusIndicator({
  status,
  statusType,
}: StatusIndicatorProps) {
  const statusUppercase: string = statusType.toUpperCase();
  return (
    <div className={styles['status-indicator']}>
      <div
        style={{
          backgroundColor:
            statusUppercase === 'WARNING'
              ? ALARM_COLOR.WARNING
              : ALARM_COLOR.CRITICAL,
        }}
        className={styles['indicator-shape']}
      ></div>
      <span>{status}</span>
    </div>
  );
}
