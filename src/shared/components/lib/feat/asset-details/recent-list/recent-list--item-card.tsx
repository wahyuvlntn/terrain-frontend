import { formatDateSlash, formatTime } from '@digital-twin/utils';
import { ReactNode } from 'react';

import styles from './recent-list--item-card.module.scss';

type RecentItemCardProps = {
  code: string;
  message: string;
  timestamp: Date;
  icon: ReactNode;
};

export const RecentItemCard = ({
  code,
  icon,
  message,
  timestamp,
}: RecentItemCardProps) => {
  return (
    <div className={styles['recent-item-card']}>
      <div className={styles['recent-item-card__content']}>
        <div className={styles['recent-item-card__content__issue']}>
          {icon}
          <h4 title={code}>{code}</h4>
        </div>
      </div>
      <div title={message} className={styles['recent-item-card__remark']}>
        {message}
      </div>
      <h4>{`${formatDateSlash(timestamp)} | ${formatTime(timestamp)}`}</h4>
    </div>
  );
};
