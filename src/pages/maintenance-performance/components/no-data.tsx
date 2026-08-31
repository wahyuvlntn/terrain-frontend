import { t } from 'i18next';

import styles from './no-data.module.scss';

const NoData = () => {
  return (
    <div className={styles['unavailable']}>
      <span>{t('common.no_data_available')}</span>
    </div>
  );
};

export default NoData;
