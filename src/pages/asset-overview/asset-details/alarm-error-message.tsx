import { ALARM_ICON, AlarmEnum } from '@digital-twin/components';
import { clsx } from 'clsx';

import styles from './alarm-error-message.module.scss';

type AlarmErrorMessageProps = {
  severity: AlarmEnum;
  message: string;
};

export const AlarmErrorMessage = ({ message, severity }: AlarmErrorMessageProps) => {
  return (
    <div className={clsx(styles['alarm-item__error-code'], styles[severity])}>
      {severity === AlarmEnum.Enum.NORMAL ? null : ALARM_ICON[severity]}
      <span title={message}>{message}</span>
    </div>
  );
};
