import { ClockDowntime } from '@digital-twin/icons';
import { formatDateTime, t } from '@digital-twin/utils';
import clsx from 'clsx';

import utilStyles from '../../util-class.module.scss';
import { useLastUpdated } from './last-updated.hook';
import styles from './last-updated.module.scss';

export const LastUpdated = () => {
  const { lastUpdated } = useLastUpdated();
  return (
    <div className={styles['last-updated']}>
      <div className={styles.label}>
        <ClockDowntime />
        <h4>{t('common.last_updated')}</h4>
      </div>
      <div
        className={clsx(
          styles.value,
          utilStyles['body-ideal-normal_body_text']
        )}
      >
        {lastUpdated ? formatDateTime(new Date(lastUpdated)) : '-'}
      </div>
    </div>
  );
};
