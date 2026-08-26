import { COLOR } from '@digital-twin/components';
import { Corrective, Preventive, SettingsFill, UserFill } from '@digital-twin/icons';
import { formatDateTimeWithoutSec } from '@digital-twin/utils';
import clsx from 'clsx';
import { CSSProperties, useMemo } from 'react';

import styles from './maintenance-order-list.module.scss';

export const MaintenanceOrderCard = ({
  id,
  name,
  equipment_id,
  planned_start,
  status,
  severity,
  priority,
  is_corrective,
  from_system,
  assignee,
  two_columns = false,
  wrapperStyle,
  wrapperClassName,
  contentStyle,
  contentClassName,
  simple = false,
  selected,
  handleClick,
  time,
  maxWidthTitle = '100px',
  handleDoubleClick,
  planned_end,
  shrinkMode,
}: {
  id: number;
  name: string;
  equipment_id: string;
  planned_start: string;
  planned_end?: string;
  assignee: string;
  status: 'REQUESTED' | 'IN_PROGRESS' | 'DONE' | 'REJECTED' | 'OPEN' | 'CLOSED' | 'PAUSED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | '';
  is_corrective: boolean;
  from_system: boolean;
  two_columns?: boolean;
  wrapperStyle?: CSSProperties;
  wrapperClassName?: string;
  contentStyle?: CSSProperties;
  contentClassName?: string;
  simple?: boolean;
  time?: string;
  maxWidthTitle?: string;
  selected: boolean;
  handleClick?: () => void;
  handleDoubleClick?: () => void;
  shrinkMode?: boolean;
}) => {
  // const { filter, setFilter } = useExtractFilter<
  //   GeneralFilterType,
  //   MaintenanceOrderFilterType
  // >();
  return (
    <div
      className={clsx(styles['maintenance-order-card'], wrapperClassName)}
      // onClick={() => {
      //   setFilter((prev) => ({
      //     ...prev,
      //     selected: String(id),
      //     add: 'false',
      //   }));
      // }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        border:
          // filter.selected === String(id) && filter.add !== 'true'
          selected ? `2px solid ${COLOR.brandBorderLightPrimary}` : '',
        backgroundColor:
          // filter.selected === String(id) && filter.add !== 'true'
          selected ? COLOR.backgroundHighest : '',
        ...wrapperStyle,
      }}
    >
      <div
        className={styles['priority']}
        role="status"
        style={{
          backgroundColor:
            priority === 'HIGH'
              ? COLOR.conditionCriticalSecondary
              : priority === 'MEDIUM'
                ? COLOR.conditionWarningPrimary
                : priority === 'LOW'
                  ? COLOR.conditionNormalPrimary
                  : 'transparent',
        }}
      ></div>
      <div className={clsx(styles['detail'], contentClassName)} style={contentStyle}>
        <div className={styles['header']}>
          <div className={styles['left-side']}>
            {is_corrective ? (
              <Corrective width={29} height={29} />
            ) : (
              <Preventive width={29} height={29} />
            )}
            <div
              style={
                !simple && !shrinkMode
                  ? undefined
                  : {
                      maxWidth: maxWidthTitle,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }
              }
              title={name}
            >
              {name}
            </div>
            {!simple && (
              <div
                className={styles['icon']}
                style={
                  !shrinkMode
                    ? undefined
                    : {
                        display: 'none',
                      }
                }
              >
                {from_system ? (
                  <SettingsFill width={20} height={20} />
                ) : (
                  <UserFill width={20} height={20} />
                )}
              </div>
            )}
          </div>
          <div className={styles['right-side']}>
            {simple ? (
              <div className={styles['time']}>{time}</div>
            ) : (
              <div
                style={
                  !shrinkMode
                    ? undefined
                    : {
                        display: 'none',
                      }
                }
              >
                <RenderMaintenanceStatus status={status} />
              </div>
            )}
            <RenderMaintenanceSeverity severity={severity} simple={simple} />
          </div>
        </div>
        {!simple && (
          <div className={styles['detail-content']}>
            <div className={styles['left-side']}>
              <div className={styles['detail-row']} style={{ display: 'flex', gap: 4 }}>
                <span
                  style={
                    !shrinkMode
                      ? undefined
                      : {
                          maxWidth: `calc(${100 - equipment_id.length * 4}px)`,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }
                  }
                >
                  Equipment ID:{' '}
                </span>
                <span
                  style={{
                    width: 0,
                    flex: '1 0 0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: '600',
                  }}
                >
                  {equipment_id}
                </span>
              </div>
              <div className={styles['detail-row']} style={{ display: 'flex', gap: 4 }}>
                <span
                  style={
                    !shrinkMode
                      ? undefined
                      : {
                          maxWidth: '25px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }
                  }
                >
                  Planned Start:{' '}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {formatDateTimeWithoutSec(new Date(planned_start))}
                </span>
              </div>
              {planned_end && (
                <div className={styles['detail-row']} style={{ display: 'flex', gap: 4 }}>
                  <span>Planned End: </span>
                  <span style={{ fontWeight: 600 }}>
                    {formatDateTimeWithoutSec(new Date(planned_end))}
                  </span>
                </div>
              )}
              {!two_columns && (
                <div
                  className={styles['detail-row']}
                  style={{
                    maxWidth: '300px',
                    overflow: 'auto',
                    display: 'flex',
                    gap: '2px',
                  }}
                  title={assignee}
                >
                  <span
                    style={
                      !shrinkMode || assignee.length < 14
                        ? undefined
                        : {
                            maxWidth: '30px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }
                    }
                  >
                    Assignee:{' '}
                  </span>
                  <span
                    style={{
                      width: 0,
                      flex: '1 0 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: '600',
                    }}
                    title={assignee}
                  >
                    {' '}
                    {assignee}
                  </span>
                </div>
              )}
            </div>
            {two_columns && (
              <div className={styles['left-side']} style={{ alignItems: 'flex-end' }}>
                <div style={{ fontWeight: 600 }}>Assignee:</div>
                <div title={assignee} className={styles['assignee']}>
                  {assignee || '-'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const RenderMaintenanceStatus = ({
  status,
}: {
  status: 'REQUESTED' | 'IN_PROGRESS' | 'DONE' | 'REJECTED' | 'OPEN' | 'CLOSED' | 'PAUSED' | string;
}) => {
  const newStatus = status === 'PAUSED' ? 'IN_PROGRESS' : status;
  const parsedStatus = useMemo(() => {
    return newStatus
      .split('_')
      .map((s) => (s ? s[0] + s.slice(1).toLowerCase() : s))
      .join('-');
  }, [newStatus]);
  const statusColorMapping: { [key: string]: string } = {
    REQUESTED: COLOR.severityTagsStatusRequested,
    IN_PROGRESS: COLOR.severityTagsStatusInProgress,
    DONE: COLOR.severityTagsStatusDone,
    REJECTED: COLOR.severityTagsStatusRejected,
    OPEN: COLOR.severityTagsStatusOpen,
    CLOSED: COLOR.severityTagsStatusClosed,
    PAUSED: COLOR.severityTagsStatusPaused,
  };
  return (
    <div
      className={styles['maintenance-status']}
      style={{ backgroundColor: statusColorMapping[newStatus] }}
    >
      {parsedStatus}
    </div>
  );
};

export const RenderMaintenanceSeverity = ({
  severity,
  simple = false,
}: {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  simple?: boolean;
}) => {
  const severityColorMapping = {
    CRITICAL: COLOR.conditionCriticalPrimary,
    HIGH: COLOR.severityHigh,
    MEDIUM: COLOR.severityMedium,
    LOW: COLOR.conditionNormalPrimary,
  };
  return (
    <div
      className={styles['maintenance-severity']}
      style={{
        backgroundColor: severityColorMapping[severity],
        width: simple ? '22px' : '26px',
        height: simple ? '22px' : '26px',
      }}
    >
      !
    </div>
  );
};
