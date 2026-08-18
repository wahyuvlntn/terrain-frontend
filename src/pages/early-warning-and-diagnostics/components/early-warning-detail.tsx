import {
  AssetCard,
  ConditionEnum,
  Container,
  InfoTooltip,
  Loading,
  StatusEnum,
  useExtractFilter,
} from '@digital-twin/components';
import {
  AlertAlarm,
  ChevronLeft,
  ChevronRight,
  CloudOfflineFill,
  Corrective,
  CriticalAlertFill,
  KeyboardArrowDown,
  List,
  SPCChart,
  StackBarChart,
  SuccessNormalCheckCircleFill,
  WarningFill,
} from '@digital-twin/icons';
import { getURL } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DegradationIndicator } from '../../maintenance-order/components/degradation-indicator';
import { RenderEarlyWarningType } from '../../maintenance-order/components/diagnostic-overview';
import {
  RenderMaintenanceSeverity,
  RenderMaintenanceStatus,
} from '../../maintenance-order/components/maintenance-order-card';
import {
  getAssetOverview,
  getMaintenanceOrderOverview,
} from '../api/early-warning-and-diagnostics';
import { EarlyWarningFilterType, GeneralFilterType } from '../type';
import styles from './early-warning-detail.module.scss';
import { MaintenanceInstructionSection } from './maintenance-instruction-section';
import { MaintenanceProgressSection } from './maintenance-progress-section';

type IssueStatus = 'WARNING' | 'CRITICAL' | 'NORMAL' | 'OFFLINE';

export const EarlyWarningDetail = () => {
  const { filter } = useExtractFilter<GeneralFilterType, EarlyWarningFilterType>();
  const orderId = Number(filter.selected);

  const { data: maintenanceOrder, isFetching: isFetchingMaintenanceOrder } = useQuery({
    queryKey: ['getMaintenanceOrderOverview', orderId] as const,
    queryFn: () => getMaintenanceOrderOverview(orderId),
    enabled: !!orderId,
    meta: {
      toastId: 'getMaintenanceOrderOverview',
    },
  });

  const asset_id = Number(maintenanceOrder?.asset_id);
  const start_date = filter.start || format(new Date(), 'yyyy-MM-dd');
  const end_date = filter.end
    ? format(new Date(new Date(filter.end).getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    : format(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const timezone_offset = new Date().getTimezoneOffset();

  const { data: assetOverview, isFetching: isFetchingAssetOverview } = useQuery({
    queryKey: ['getAssetOverview', { asset_id, start_date, end_date, timezone_offset }] as const,
    queryFn: () => getAssetOverview({ asset_id, start_date, end_date, timezone_offset }),
    enabled: !!asset_id,
    meta: {
      toastId: 'getAssetOverview',
    },
  });

  const navigate = useNavigate();

  const ISSUES_PAGE_SIZE = 3;
  const [currentIssuesStart, setCurrentIssuesStart] = useState(0);
  const [otherIssuesStart, setOtherIssuesStart] = useState(0);

  const alarmCodes = maintenanceOrder?.alarm_codes ?? [];
  const otherAlarmCodes = maintenanceOrder?.other_alarm_codes ?? [];

  const handleNavigateMaintenanceOrder = useCallback(() => {
    if (maintenanceOrder) {
      const dateFilter = format(new Date(maintenanceOrder.planned_start), 'yyyy-MM-dd');
      navigate(
        `/maintenance-order?start=${dateFilter}&end=${dateFilter}&selected=${maintenanceOrder.id}`
      );
    }
  }, [JSON.stringify(maintenanceOrder)]);

  return (
    <Container
      title="Diagnostics"
      icon={<StackBarChart width={24} height={24} />}
      className={styles.container}
      contentWrapperProps={{ className: styles.contentWrapper }}
      rightTopComponent={
        <div className={styles.diagnosticHeaderRight}>
          <InfoTooltip
            title="Diagnostic"
            content="Review detected issues and recorded diagnostic results to determine required actions."
          />
          <RenderEarlyWarningType
            type={
              maintenanceOrder?.alarm_codes && maintenanceOrder.alarm_codes.length > 1
                ? 'COMPOUND'
                : 'DEGRADATION'
            }
            isDeduction={maintenanceOrder?.is_deduction}
            long={true}
          />
        </div>
      }
      style={{ position: 'relative' }}
    >
      <Loading isLoading={isFetchingMaintenanceOrder || isFetchingAssetOverview} />
      {maintenanceOrder && (
        <>
          <div className={styles.topRow}>
            <div className={styles.cardWrapper}>
              <AssetCard
                image={`${getURL()}${assetOverview?.image ?? ''}`}
                model={assetOverview?.model_name ?? ''}
                name={assetOverview?.name ?? ''}
                type={assetOverview?.type_name ?? ''}
                status={assetOverview?.status ? (assetOverview.status as StatusEnum) : null}
                statusStartTime={
                  assetOverview?.status_start_time
                    ? new Date(assetOverview.status_start_time)
                    : null
                }
                variant="details"
                disableLink
                conditionStartTime={assetOverview?.condition_start_time ?? null}
                condition={
                  assetOverview?.condition ? (assetOverview.condition as ConditionEnum) : null
                }
                warningCount={assetOverview?.warning_counts ?? 0}
                criticalCount={assetOverview?.critical_counts ?? 0}
                uptime={assetOverview?.uptime ?? null}
                runningBadgePosition="right"
                runningHours={assetOverview?.running_duration_hours ?? undefined}
                className={styles['asset-card']}
              />
            </div>
            <div className={styles.cardWrapper}>
              <Container
                title={maintenanceOrder?.name}
                icon={<Corrective width={24} height={24} />}
                className={styles.maintenanceContainer}
                contentWrapperProps={{
                  className: styles.maintenanceContainerContent,
                }}
                background="none"
                rightTopComponent={
                  <div className={styles.maintenanceHeader}>
                    <RenderMaintenanceStatus status={maintenanceOrder?.status || ''} />
                    <div className={styles.viewOrderLink} onClick={handleNavigateMaintenanceOrder}>
                      <div className={styles.viewOrderLinkText}>
                        <span>View Maintenance Order</span>
                      </div>
                      <KeyboardArrowDown width={24} height={24} className={styles.arrowIcon} />
                    </div>
                  </div>
                }
              >
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <div>Severity:</div>
                    <div className={styles.fieldValue}>
                      <RenderMaintenanceSeverity
                        severity={
                          maintenanceOrder?.severity.toUpperCase() as
                            | 'CRITICAL'
                            | 'HIGH'
                            | 'MEDIUM'
                            | 'LOW'
                        }
                      />
                      <div>{maintenanceOrder?.severity}</div>
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <div>Priority:</div>
                    <div className={styles.fieldValue}>{maintenanceOrder?.priority || '-'}</div>
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <div>Planned Start:</div>
                    <div className={styles.fieldValue}>
                      {maintenanceOrder?.planned_start
                        ? format(new Date(maintenanceOrder.planned_start), 'dd MMM yyyy, HH:mm')
                        : '-'}
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <div>Assignee:</div>
                    <div className={styles.fieldValue} title={maintenanceOrder?.assignee || '-'}>
                      <span>{maintenanceOrder?.assignee || '-'}</span>
                    </div>
                  </div>
                </div>
              </Container>
            </div>
          </div>
          <div className={styles.topRow}>
            <Container
              title="Current Issues"
              icon={<AlertAlarm width={24} height={24} />}
              className={styles.issuesContainer}
              contentWrapperProps={{ className: styles.issuesContainerContent }}
              background="none"
              rightTopComponent={
                alarmCodes.length > ISSUES_PAGE_SIZE ? (
                  <div className={styles.chevronWrapper}>
                    <div
                      className={`${styles.chevronButton} ${
                        currentIssuesStart <= 0 ? styles['chevronButton--disabled'] : ''
                      }`}
                      onClick={() =>
                        setCurrentIssuesStart((prev) => Math.max(0, prev - ISSUES_PAGE_SIZE))
                      }
                    >
                      <ChevronLeft width={20} height={20} />
                    </div>
                    <div
                      className={`${styles.chevronButton} ${
                        currentIssuesStart + ISSUES_PAGE_SIZE >= alarmCodes.length
                          ? styles['chevronButton--disabled']
                          : ''
                      }`}
                      onClick={() =>
                        setCurrentIssuesStart((prev) =>
                          Math.min(alarmCodes.length - ISSUES_PAGE_SIZE, prev + ISSUES_PAGE_SIZE)
                        )
                      }
                    >
                      <ChevronRight width={20} height={20} />
                    </div>
                  </div>
                ) : undefined
              }
            >
              {alarmCodes
                .slice(currentIssuesStart, currentIssuesStart + ISSUES_PAGE_SIZE)
                .map((alarm, index) => (
                  <RenderIssue
                    key={index}
                    label={alarm.label}
                    code={alarm.code}
                    timestamp={alarm.timestamp}
                    status={alarm.alarm_status as IssueStatus}
                  />
                ))}
            </Container>
            <Container
              title="Other Possible Issues"
              icon={<List width={24} height={24} />}
              className={styles.issuesContainer}
              contentWrapperProps={{
                className: styles.otherIssuesContainerContent,
              }}
              background="none"
              rightTopComponent={
                otherAlarmCodes.length > ISSUES_PAGE_SIZE ? (
                  <div className={styles.chevronWrapper}>
                    <div
                      className={`${styles.chevronButton} ${
                        otherIssuesStart <= 0 ? styles['chevronButton--disabled'] : ''
                      }`}
                      onClick={() =>
                        setOtherIssuesStart((prev) => Math.max(0, prev - ISSUES_PAGE_SIZE))
                      }
                    >
                      <ChevronLeft width={20} height={20} />
                    </div>
                    <div
                      className={`${styles.chevronButton} ${
                        otherIssuesStart + ISSUES_PAGE_SIZE >= otherAlarmCodes.length
                          ? styles['chevronButton--disabled']
                          : ''
                      }`}
                      onClick={() =>
                        setOtherIssuesStart((prev) =>
                          Math.min(
                            otherAlarmCodes.length - ISSUES_PAGE_SIZE,
                            prev + ISSUES_PAGE_SIZE
                          )
                        )
                      }
                    >
                      <ChevronRight width={20} height={20} />
                    </div>
                  </div>
                ) : undefined
              }
            >
              {otherAlarmCodes
                .slice(otherIssuesStart, otherIssuesStart + ISSUES_PAGE_SIZE)
                .map((alarm, index) => (
                  <RenderIssue key={index} label={alarm.label} code={alarm.code} />
                ))}
            </Container>
          </div>

          {maintenanceOrder && (
            <div className={styles.instructionSectionWrapper}>
              <MaintenanceInstructionSection maintenanceOrder={maintenanceOrder} />
            </div>
          )}

          {maintenanceOrder?.is_deduction && (
            <Container
              title="Degradation Indicators"
              className={styles.degradationContainer}
              contentWrapperProps={{
                className: styles.degradationContainerContent,
              }}
              icon={<SPCChart width={24} height={24} />}
            >
              <DegradationIndicator
                hideTitle={true}
                asset_id={maintenanceOrder.asset_id}
                initialDate={format(new Date(maintenanceOrder.planned_start), 'yyyy-MM-dd')}
                maintenance_id={maintenanceOrder.id}
              />
            </Container>
          )}
          {maintenanceOrder && <MaintenanceProgressSection maintenanceOrder={maintenanceOrder} />}
        </>
      )}
    </Container>
  );
};

const getBadgeClassName = (status?: IssueStatus) => {
  const baseClass = styles.issueBadge;
  const statusClass = status
    ? styles[`issueBadge--${status.toLowerCase()}`]
    : styles['issueBadge--default'];
  return `${baseClass} ${statusClass}`;
};

const RenderIssueIcon = ({ status }: { status?: IssueStatus }) => {
  switch (status) {
    case 'CRITICAL':
      return <CriticalAlertFill width={24} height={24} />;
    case 'NORMAL':
      return <SuccessNormalCheckCircleFill width={24} height={24} />;
    case 'OFFLINE':
      return <CloudOfflineFill />;
    default:
      return <WarningFill width={24} height={24} />;
  }
};

const RenderIssue = ({
  status,
  code,
  label,
  timestamp,
}: {
  status?: IssueStatus;
  code?: string;
  label: string;
  timestamp?: string;
}) => {
  return (
    <div className={styles.issueRow}>
      <div className={styles.issueContent}>
        <div className={getBadgeClassName(status)}>
          <RenderIssueIcon status={status} />
          <div>{code}</div>
        </div>
        <div className={styles.issueLabel} title={label}>
          {label}
        </div>
      </div>
      {timestamp && (
        <div className={styles.issueTimestamp}>
          <div className={styles.issueTimestampLabel}>Timestamp:</div>
          <div>{format(new Date(timestamp), 'dd MMM yyyy, HH:mm')}</div>
        </div>
      )}
    </div>
  );
};
