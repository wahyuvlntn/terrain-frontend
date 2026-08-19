import { COLOR, Container, Loading } from '@digital-twin/components';
import { InstructionFill } from '@digital-twin/icons';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { format } from 'date-fns';
import { getMaintenanceOrderProgress } from '../../maintenance-order/api/maintenance-order';
import { WorkProgress } from '../../maintenance-order/components/progress';
import { MaintenanceOrderOverview } from '../api/early-warning-and-diagnostics';
import styles from './maintenance-progress-section.module.scss';

export const MaintenanceProgressSection = ({
  maintenanceOrder,
}: {
  maintenanceOrder: MaintenanceOrderOverview;
}) => {
  const progressQuery = useQuery({
    queryKey: ['get-maintenance-order-progress', maintenanceOrder.id],
    queryFn: () => {
      return getMaintenanceOrderProgress({
        order_id: maintenanceOrder.id,
      });
    },
  });
  function formatDuration(totalSeconds: number) {
    if (totalSeconds <= 0) return '0 seconds';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts = [];

    if (hours > 0) parts.push(`${hours} hours`);
    parts.push(`${minutes} minutes`);

    return parts.join(' ');
  }

  return (
    <Container
      title="Technician Report"
      style={{ alignSelf: 'stretch', background: COLOR.backgroundDefault }}
      background="none"
      contentWrapperProps={{
        style: { display: 'flex', overflow: 'unset', flexDirection: 'column' },
      }}
      icon={<InstructionFill />}
    >
      <Loading isLoading={progressQuery.isFetching} />
      <MaintenanceMetadata
        plannedStart={
          maintenanceOrder.planned_start
            ? format(new Date(maintenanceOrder.planned_start), 'dd MMM yyyy, HH:mm')
            : '-'
        }
        plannedEnd={
          maintenanceOrder.planned_end
            ? format(new Date(maintenanceOrder.planned_end), 'dd MMM yyyy, HH:mm')
            : '-'
        }
        actualTime={
          maintenanceOrder.actual_time ? formatDuration(maintenanceOrder.actual_time) : '-'
        }
        estimatedTime={
          maintenanceOrder.estimated_time
            ? formatDuration(maintenanceOrder.estimated_time || 0)
            : '-'
        }
        actualTimeStatus={
          maintenanceOrder.actual_time === null || maintenanceOrder.estimated_time === null
            ? 'NOT_STARTED'
            : maintenanceOrder.actual_time > maintenanceOrder.estimated_time
              ? 'EXCEEDED'
              : 'ON_TIME'
        }
      />
      <div className={styles['work-progress-list']}>
        {progressQuery.data?.map((data) => (
          <>
            <WorkProgress
              date={data.date}
              time={data.time}
              status={data.status}
              details={data.details}
              viewLine={false}
              diagnosticView
            />
          </>
        ))}
      </div>
    </Container>
  );
};

const MaintenanceMetadata = ({
  plannedStart,
  plannedEnd,
  actualTime,
  estimatedTime,
  actualTimeStatus,
}: {
  plannedStart: string;
  plannedEnd: string;
  actualTime: string;
  estimatedTime: string;
  actualTimeStatus: 'ON_TIME' | 'EXCEEDED' | 'NOT_STARTED';
}) => {
  return (
    <div className={styles.MaintenanceMetadata}>
      <div className={styles.MaintenanceMetadata__LeftContainer}>
        <span className={styles.MaintenanceMetadata__Label}>
          Planned Start: <span className={styles.MaintenanceMetadata__Value}>{plannedStart}</span>
        </span>
        <span className={styles.MaintenanceMetadata__Label}>
          Planned End: <span className={styles.MaintenanceMetadata__Value}>{plannedEnd}</span>
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
