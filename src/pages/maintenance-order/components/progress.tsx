import { COLOR, Container, ImagePaginatedPopup } from '@digital-twin/components';
import { FlagFill, ManageAccounts, ManageHistory, Paused, UserFill } from '@digital-twin/icons';
import { CheckIcon, CloseIcon, ImagesmodeIcon, PlayArrowFillIcon } from '@digital-twin/reusables';
import { convertToPascalCase, getURL } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState } from 'react';

import {
  getMaintenanceOrderProgress,
  getMaintenanceSupervisorAndTechnicians,
} from '../api/maintenance-order';
import { MaintenanceMetadata } from './maintenance-metadata';
import styles from './progress.module.scss';
import { MaintenanceOrderData } from './request-form';

export const Progress = ({
  orderId,
  initialData,
}: {
  orderId: number;
  initialData?: MaintenanceOrderData;
}) => {
  const progressQuery = useQuery({
    queryKey: ['get-maintenance-order-progress', orderId],
    queryFn: () => {
      return getMaintenanceOrderProgress({
        order_id: orderId,
      });
    },
  });
  const maintenancePersonnelsQuery = useQuery({
    queryKey: ['get_maintenance_supervisor_and_technicians', orderId],
    queryFn: () => {
      return getMaintenanceSupervisorAndTechnicians({
        maintenance_id: orderId,
      });
    },
  });
  return (
    <div className={styles['progress']}>
      {initialData && (
        <MaintenanceMetadata
          actualTime={initialData.actualTime || '-'}
          actualTimeStatus={
            initialData.isTimeExceed === null
              ? 'NOT_STARTED'
              : initialData.isTimeExceed
                ? 'EXCEEDED'
                : 'ON_TIME'
          }
          createdAt={initialData.createdAt || ''}
          createdBy={initialData.createdBy || ''}
          estimatedTime={initialData.estimatedTime || ''}
          updatedAt={initialData.updatedAt || ''}
        />
      )}
      <div className={styles['main']}>
        <div className={styles['progress-title']}>Progress:</div>
        <div className={styles['progress-content']}>
          <div className={styles['inner-progress-content']}>
            <div>
              <Container
                title="Supervisor"
                className={styles['personnel-container']}
                titleProps={{
                  className: styles['container-title-props'],
                }}
                icon={<ManageAccounts width={20} height={20} />}
                background="none"
                headerProps={{
                  className: styles['container-header-props'],
                }}
              >
                <div className={styles['personnel-name']}>
                  <UserFill width={20} height={20} />
                  <div>{maintenancePersonnelsQuery.data?.supervisor}</div>
                </div>
              </Container>
            </div>
            <div>
              <Container
                title="Assigned Technician"
                className={styles['personnel-container']}
                titleProps={{ className: styles['container-title-props'] }}
                icon={<ManageAccounts width={20} height={20} />}
                background="none"
                headerProps={{
                  className: styles['container-header-props'],
                }}
                contentWrapperProps={{
                  className: styles['container-content-wrapper-props'],
                }}
              >
                {maintenancePersonnelsQuery.data?.technicians.map((tech) => (
                  <div className={styles['personnel-name']}>
                    <UserFill width={20} height={20} />
                    <div>{tech}</div>{' '}
                  </div>
                ))}
              </Container>
            </div>
          </div>
          <div className={styles['inner-progress-content']}>
            <Container
              title="Work History"
              className={styles['work-history-container']}
              titleProps={{ className: styles['container-title-props'] }}
              icon={<ManageHistory width={20} height={20} />}
              background="none"
              headerProps={{
                className: styles['container-header-props'],
              }}
            >
              <div className={styles['work-progress-list']}>
                {progressQuery.data?.map((data, index) => (
                  <>
                    <WorkProgress
                      date={data.date}
                      time={data.time}
                      status={data.status}
                      details={data.details}
                      viewLine={index !== progressQuery.data.length - 1}
                    />
                    {index !== progressQuery.data.length - 1 && <WorkProgressSeparator />}
                  </>
                ))}
              </div>
            </Container>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WorkProgress = ({
  date,
  time,
  status,
  details,
  viewLine,
  diagnosticView,
}: {
  date: string;
  time: string;
  status: string;
  details: Record<string, unknown>;
  viewLine: boolean;
  diagnosticView?: boolean;
}) => {
  return (
    <div
      className={styles['work-progress']}
      style={
        diagnosticView
          ? {
              background: COLOR.backgroundHigh,
              padding: '8px 12px 8px 12px',
              borderRadius: 8,
            }
          : {}
      }
    >
      <div className={styles['datetime']}>
        <div>{date}</div>
        <div>{time}</div>
      </div>
      {diagnosticView ? (
        <div
          style={{
            display: 'flex',
            alignSelf: 'stretch',
            width: 2,
            background: COLOR.backgroundDefault,
          }}
        ></div>
      ) : (
        <div className={styles['icon-container']}>
          <div
            className={`${styles['icon']} ${
              status === 'STARTED'
                ? styles['icon-started']
                : status === 'REJECTED'
                  ? styles['icon-rejected']
                  : status === 'COMPLETED'
                    ? styles['icon-completed']
                    : styles['icon-default']
            }`}
          >
            {status === 'CREATED' || status === 'UPDATED' ? (
              <div className={styles['icon-dot']}></div>
            ) : status === 'STARTED' ? (
              <PlayArrowFillIcon width={24} height={24} color={COLOR.neutralTextTitleHeading} />
            ) : status === 'RESUMED' ? (
              <PlayArrowFillIcon width={24} height={24} color={COLOR.brandSurfaceDefaultPrimary} />
            ) : status === 'PAUSED' ? (
              <Paused width={24} height={24} color={COLOR.conditionCriticalSecondary} />
            ) : status === 'CLOSED' ? (
              <FlagFill width={24} height={24} />
            ) : status === 'APPROVED' || status === 'COMPLETED' ? (
              <CheckIcon width={24} height={24} />
            ) : status === 'REJECTED' ? (
              <CloseIcon width={24} height={24} />
            ) : (
              <div className={styles['icon-dot']}></div>
            )}
          </div>
          {viewLine && <div className={styles['line']}></div>}
        </div>
      )}
      <div className={styles['progress-content']}>
        <div className={styles['status']}>
          {status === 'CREATED'
            ? 'Order Created'
            : status === 'APPROVED'
              ? 'Order Approved'
              : status === 'STARTED'
                ? 'Order Started'
                : status === 'PAUSED'
                  ? 'Paused Work'
                  : status === 'RESUMED'
                    ? 'Resumed Work'
                    : status === 'UPDATED'
                      ? 'Work update added'
                      : status === 'COMPLETED'
                        ? 'Completed Work'
                        : status === 'CLOSED'
                          ? 'Closed'
                          : status}
        </div>
        {Object.entries(details).map(([key, value]) =>
          typeof value === 'string' ? (
            <div className={styles['key-value']}>
              <div className={styles['key']}>{key}:</div>
              <div className={styles['value']}>{value}</div>
            </div>
          ) : Array.isArray(value) && key === 'attachment_urls' ? (
            <div className={styles['image-attachment']}>
              <div className={styles['overview']}>
                <ImagesmodeIcon width={20} height={20} />
                {value.length > 0 ? (
                  <div>{value.length} images attached</div>
                ) : (
                  <div>No image attached</div>
                )}
              </div>
              {value.length > 0 && <ImageViewer images={value} />}
            </div>
          ) : Array.isArray(value) && key === 'Issue' ? (
            <div className={styles['issue-container']}>
              <div>{details['is_other'] ? 'Other Possible Issue(s):' : 'Issue(s):'}</div>
              {value.map((val) => (
                <div className={styles['issue-item']}>
                  <div className={styles['issue-number']}>{val['no']}.</div>
                  <div className={styles['issue-label']}>
                    {val['label']}{' '}
                    {val['is_other'] === true
                      ? '(Other Issue)'
                      : val['is_other'] === false
                        ? '(Main Issue)'
                        : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : key === 'diagnosis' || key === 'repair' ? (
            <div className={styles['boolean-value-container']}>
              <div>{convertToPascalCase(key)}:</div>
              <div
                className={clsx(
                  styles['alarm-status-badge'],
                  value === null
                    ? styles['null']
                    : value
                      ? key.toUpperCase() === 'DIAGNOSIS'
                        ? styles['valid']
                        : styles['resolved']
                      : key.toUpperCase() === 'DIAGNOSIS'
                        ? styles['invalid']
                        : styles['unresolved']
                )}
              >
                {key.toUpperCase() === 'DIAGNOSIS' ? 'Alarm Status' : 'Issue Status'}:{' '}
                {value === null
                  ? '-'
                  : value
                    ? key.toUpperCase() === 'DIAGNOSIS'
                      ? 'Valid'
                      : 'Resolved'
                    : key.toUpperCase() === 'DIAGNOSIS'
                      ? 'Invalid'
                      : 'Unresolved'}
              </div>
            </div>
          ) : (
            ''
          )
        )}
        {status === 'PAUSED' ? (
          <div className={styles['key-value']}>
            <div className={styles['key']}>Order Status:</div>
            <div className={styles['value']}>In Progress (Active) {'->'} In Progress (On Hold)</div>
          </div>
        ) : (
          ''
        )}
        {status === 'RESUMED' ? (
          <div className={styles['key-value']}>
            <div className={styles['key']}>Order Status:</div>
            <div className={styles['value']}>In Progress (On Hold) {'->'} In Progress (Active)</div>
          </div>
        ) : (
          ''
        )}
      </div>
    </div>
  );
};

const ImageViewer = ({ images }: { images: string[] }) => {
  const imageParams = images.map((image) => ({
    name: 'Attached Images',
    src: getURL() + image,
  }));
  const [openImagePopup, setOpenImagePopup] = useState(false);
  const handleClose = () => {
    setOpenImagePopup(false);
  };
  const handleOpen = () => {
    setOpenImagePopup(true);
  };
  return (
    <div className={styles['view-button']}>
      <div className={styles['view']} onClick={handleOpen}>
        View
      </div>
      <ImagePaginatedPopup images={imageParams} open={openImagePopup} onClose={handleClose} />
    </div>
  );
};

export const WorkProgressSeparator = () => {
  return (
    <div className={styles['work-progress']}>
      <div className={styles['datetime']}></div>
      <div className={styles['icon-container']}>
        <div className={styles['progress-separator-line']}></div>
      </div>
      <div className={styles['progress-content']}></div>
    </div>
  );
};
