import {
  AssetDetails as AssetDetailsReusable,
  AssetStatusChart,
  Loading,
  MAINTENANCE_STATUS_COLOR,
  MaintenanceStatusEnum,
  RecentList,
  StatusEnum,
} from '@digital-twin/components';
import { AlertAlarm, Corrective, Edit1, Preventive } from '@digital-twin/icons';
import { getURL, t } from '@digital-twin/utils';
import { format } from 'date-fns';

import { TAssetAlarm, TAssetMaintenance } from '../api';
import { AlarmErrorMessage } from './alarm-error-message';
import { AssetCard } from './asset-card';
import { useAssetDetails } from './asset-details.hooks';
import styles from './asset-details.module.scss';
import { AssetLegend } from './asset-legend';
import { ParameterList } from './parameter-list';
import { StatusCard } from './status-card';

const paginateData = <T,>(data: T[], page: number, pageSize: number) => {
  const startIndex = (page - 1) * pageSize;
  return data.slice(startIndex, startIndex + pageSize);
};

const parseRecentListRowAlarm = (alarm: TAssetAlarm) => {
  const timestamp = new Date(alarm.timestamp);
  return {
    id: `${alarm.timestamp}-${alarm.message}`,
    errorCode: <AlarmErrorMessage severity={alarm.severity} message={alarm.message} />,
    date: format(timestamp, 'dd MMM yyyy'),
    time: format(timestamp, 'HH:mm'),
  };
};

const getMaintenanceStatusBadge = (status: MaintenanceStatusEnum) => {
  return (
    <div
      className={styles['maintenance-status-badge']}
      style={{
        backgroundColor: MAINTENANCE_STATUS_COLOR[status],
      }}
    >
      {status}
    </div>
  );
};

const parseRecentListRowMaintenance = (maintenance: TAssetMaintenance) => ({
  id: `${maintenance.id}-${maintenance.status}-${maintenance.updatedAt}`,
  orderId: (
    <div className={styles['maintenance-id']}>
      {maintenance.typeName === 'Corrective' ? (
        <Corrective width={20} height={20} />
      ) : (
        <Preventive width={20} height={20} />
      )}
      {maintenance.name}
    </div>
  ),
  issueTitle: maintenance.issue,
  status: getMaintenanceStatusBadge(maintenance.status),
  time: format(new Date(maintenance.updatedAt), 'HH:mm'),
});

export const AssetDetails = () => {
  const {
    assetDetails,
    isLoading,
    date,
    from,
    to,
    locationNames,
    handleChangeDate,
    onExport,
    recentListPage,
    recentListColumns,
    recentListTitle,
    isAlarm,
    recentListValue,
    handleRecentListValueChange,
    recentListCount,
  } = useAssetDetails();

  const MAX_ITEMS_PER_PAGE = 5;
  const recentListData = isAlarm
    ? paginateData(assetDetails?.alarms ?? [], recentListPage, MAX_ITEMS_PER_PAGE).map(
        parseRecentListRowAlarm
      )
    : paginateData(assetDetails?.maintenances ?? [], recentListPage, MAX_ITEMS_PER_PAGE).map(
        parseRecentListRowMaintenance
      );

  return (
    <AssetDetailsReusable
      assetLegendComponent={<AssetLegend />}
      assetName={assetDetails?.name ?? ''}
      date={date}
      handleChangeDate={handleChangeDate}
      locationNames={locationNames ?? []}
      modelName={assetDetails?.modelName ?? ''}
      typeName={assetDetails?.typeName ?? ''}
      excludedSearchParams={['recent', 'spc']}
      onExport={onExport}
      leftComponent={
        <>
          <Loading isLoading={isLoading} />
          <AssetCard
            model={assetDetails?.modelName ?? ''}
            type={assetDetails?.typeName ?? ''}
            runningHours={assetDetails?.runningHours ?? 0}
            name={assetDetails?.name ?? ''}
            status={assetDetails?.status ?? null}
            statusStartTime={
              assetDetails?.statusStartTime ? new Date(assetDetails.statusStartTime) : null
            }
            conditionStartTime={assetDetails?.conditionStartTime ?? null}
            uptime={assetDetails?.uptime ?? null}
            condition={assetDetails?.condition ?? null}
            criticalCount={assetDetails?.criticalCount ?? 0}
            warningCount={assetDetails?.warningCount ?? 0}
            totalDuration={assetDetails?.totalDuration}
            uptimeDuration={assetDetails?.uptimeDuration}
            image={`${getURL()}${assetDetails?.image}`}
            variant={'details'}
            width={'100%'}
          />
          <StatusCard
            running={assetDetails?.runningCounts ?? 0}
            plannedDown={assetDetails?.plannedDownCounts ?? 0}
            unplannedDown={assetDetails?.unplannedDownCounts ?? 0}
            offline={assetDetails?.offlineCounts ?? 0}
          />
          <RecentList
            icon={isAlarm ? <AlertAlarm /> : <Edit1 />}
            selectorProps={{
              options: [
                {
                  icon: <AlertAlarm />,
                  id: 'alarm',
                  tooltip: t('common.recent_alarm'),
                },
                {
                  icon: <Edit1 />,
                  id: 'maintenance',
                  tooltip: 'Recent Maintenance',
                },
              ],
              value: recentListValue,
              onChange: handleRecentListValueChange,
            }}
            title={recentListTitle}
            informationTooltipContent={t('common.recent_alarm_info')}
            paginationProps={{
              count: recentListCount,
              searchParamsPrefix: 'recent-list-',
            }}
            columns={recentListColumns}
            data={recentListData}
          />
        </>
      }
      rightComponent={
        <>
          <AssetStatusChart
            status={assetDetails?.statuses || []}
            conditions={assetDetails?.conditions || []}
            from={from}
            to={to}
            isLoading={isLoading}
            excludedStatus={[StatusEnum.enum.DOWN, StatusEnum.enum.IDLE]}
            chartContainerClassName={styles['status-chart__chart-container']}
            chartYAxisLabelContainerClassName={
              styles['status-chart__chart-container__yaxis-label-container']
            }
          />
          <ParameterList date={date} />
        </>
      }
    />
  );
};
