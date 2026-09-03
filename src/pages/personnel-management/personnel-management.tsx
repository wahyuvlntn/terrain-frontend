import { LastUpdated } from '@digital-twin/components';
import { PMDetails } from './components/pm-details';
import { PMInputDuration } from './components/pm-input-duration';
import { PMLegend } from './components/pm-legend';
import { PMList } from './components/pm-list';
import { PMFilterDrawer } from './filter/filter.drawer';
import { PMFilterProvider } from './filter/filter.provider';
import { PMFilterShortcut } from './filter/filter.shortcut';
import styles from './personnel-management.module.scss';

export const PersonnelManagement = () => {
  return (
    <PMFilterProvider>
      <div className={styles['container']}>
        <div className={styles['header']}>
          <div className="ribbon-item">
            <PMLegend />
            <PMFilterShortcut />
            <PMFilterDrawer />
          </div>
          <div className="ribbon-item">
            <PMInputDuration />
            <LastUpdated />
          </div>
        </div>
        <div className={styles['body']}>
          <PMList className={styles['list']} />
          <PMDetails className={styles['details']} />
        </div>
      </div>
    </PMFilterProvider>
  );
};
