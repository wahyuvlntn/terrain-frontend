import { CriticalAlertFill, WarningFill } from '@digital-twin/icons';
import { formatDateSlash, formatTime } from '@digital-twin/utils';

import { AlarmEnum, COLOR } from '../../../../index';
import styles from './alarm-item.module.scss';

interface AlarmItemProps {
  message: string;
  severity: AlarmEnum;
  timestamp: Date;
}

export const AlarmItem = ({ message, timestamp, severity }: AlarmItemProps) => {
  return (
    <div className={styles['alarm-item']}>
      <div className={styles.content}>
        {severity === AlarmEnum.enum.WARNING ? (
          <WarningFill color={COLOR.conditionWarningPrimary} />
        ) : (
          <CriticalAlertFill color={COLOR.conditionCriticalPrimary} />
        )}
        <h4 title={message}>{message}</h4>
      </div>
      <h4>{`${formatDateSlash(timestamp)} | ${formatTime(timestamp)}`}</h4>
    </div>
  );
};
