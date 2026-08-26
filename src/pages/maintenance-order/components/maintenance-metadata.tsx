import { clsx } from 'clsx';

import styles from './maintenance-metadata.module.scss';

type MaintenanceMetadataProps = {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  actualTime: string;
  estimatedTime: string;
  actualTimeStatus: 'ON_TIME' | 'EXCEEDED' | 'NOT_STARTED';
};

export const MaintenanceMetadata = ({
  createdAt,
  createdBy,
  updatedAt,
  actualTime,
  estimatedTime,
  actualTimeStatus,
}: MaintenanceMetadataProps) => {
  return (
    <div className={styles.MaintenanceMetadata}>
      <div className={styles.MaintenanceMetadata__LeftContainer}>
        <span className={styles.MaintenanceMetadata__Label}>
          Created:{' '}
          <span className={styles.MaintenanceMetadata__Value}>
            {`${createdAt}, by: ${createdBy || '-'}`}
          </span>
        </span>
        <span className={styles.MaintenanceMetadata__Label}>
          Updated: <span className={styles.MaintenanceMetadata__Value}>{updatedAt}</span>
        </span>
      </div>
      <div className={styles.MaintenanceMetadata__RightContainer}>
        <span className={styles.MaintenanceMetadata__Label}>Estimated Time:</span>
        <span className={styles.MaintenanceMetadata__Value}>{estimatedTime}</span>
        <span className={styles.MaintenanceMetadata__Label}>Actual Time:</span>
        <span
          className={clsx(
            styles.MaintenanceMetadata__Value,
            actualTimeStatus === 'ON_TIME' && styles.good,
            actualTimeStatus === 'EXCEEDED' && styles.bad
          )}
        >
          {actualTime}
        </span>
      </div>
    </div>
  );
};
