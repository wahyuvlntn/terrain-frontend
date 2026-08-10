/* eslint-disable simple-import-sort/imports */
import { Badge, InfoTooltip, Loading, ThemeContext } from '@digital-twin/components';
import {
  CloseDownErrorCircle as CloseDownErrorCircleIcon,
  Factory as FactoryIcon,
  ImagePlaceholder,
  SuccessNormalCheckCircle as SuccessNormalCheckCircleIcon,
  Warning as WarningAlarmIcon,
} from '@digital-twin/icons';
import { Card } from '@digital-twin/reusables';
import { getURL, t } from '@digital-twin/utils';
import ReactECharts from 'echarts-for-react';
import { useContext } from 'react';
import { ConditionMetric } from './condition-metric';
import { useLocationCard } from './location-card.hook';
import styles from './location-card.module.scss';
import { StatusMetric } from './status-metric';

interface LocationCardProps {
  locationId: number;
  locationName: string;
  locationImagePath: string;
  totalAsset: number;
  totalCriticalAsset: number;
  totalIdleAsset: number;
  totalNormalAsset: number;
  totalPlannedDownAsset: number;
  totalRunningAsset: number;
  totalUnplannedDownAsset: number;
  totalOfflineAsset: number;
  totalWarningAsset: number;
  availabilityTh: number;
  qualityTh: number;
  performanceTh: number;
  oeeLimit: number;
  isLastChild: boolean;
  handleSelectLocation: (e: string) => void;
  isPreview: boolean;
}

export const LocationCard = ({ ...props }: LocationCardProps) => {
  const {
    colors: { backgroundLowest },
  } = useContext(ThemeContext);

  const {
    chartRef,
    chartOption,
    navigate,
    isHovering,
    handleOnHover,
    isFetching,
    assetOverviewUrl,
  } = useLocationCard(props.locationId, props.oeeLimit, props.isPreview);

  return (
    <Card
      title={props.locationName}
      style={{
        width: props.isPreview ? 620 : 'unset',
        height: props.isPreview ? 350 : undefined,
      }}
      headerChildren={
        <Badge
          id={props.locationId.toString()}
          style={{
            whiteSpace: 'nowrap',
          }}
          className={styles['equipment-count-badge']}
          leftIcon={<FactoryIcon />}
          onClick={(e) => {
            e.stopPropagation();
            !props.isPreview && navigate(assetOverviewUrl);
          }}
        >
          <span>{`${t('common.equipment')}: ${props.totalAsset.toLocaleString()}`}</span>
        </Badge>
      }
      titleProps={{
        style: {
          fontWeight: 600,
          fontSize: 22,
        },
        id: props.locationId.toString(),
        onClick: (e) => {
          const targetElement = e.target as HTMLElement;
          if (!props.isLastChild) {
            !props.isPreview && props.handleSelectLocation(targetElement.id);
          } else {
            !props.isPreview && navigate(assetOverviewUrl);
          }
        },
      }}
      headerProps={{
        style: {
          maxHeight: 52,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        },
        id: props.locationId.toString(),
        onClick: (e) => {
          const targetElement = e.target as HTMLElement;
          if (!props.isLastChild) {
            !props.isPreview && props.handleSelectLocation(targetElement.id);
          } else {
            !props.isPreview && navigate(assetOverviewUrl);
          }
        },
      }}
      contentWrapperProps={{
        style: {
          padding: 0,
          height: '100%',
          alignItems: 'unset',
          justifyContent: 'unset',
        },
      }}
    >
      <div className={styles['location-card']}>
        <Loading isLoading={isFetching} />
        <div className={styles['card-top-section']}>
          <div className={styles['location-image']}>
            <img
              id={props.locationId.toString()}
              src={`${getURL()}${props.locationImagePath}`}
              alt={t('common.location')}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = ImagePlaceholder(backgroundLowest);
              }}
            ></img>
          </div>
          <div className={styles['oee-chart-container']}>
            <div className={styles['oee-chart-header']}>
              <span>Uptime</span>
              <InfoTooltip
                title="Uptime"
                height={'100%'}
                content={
                  <div className={styles['tooltip-container']}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginBottom: 16,
                      }}
                    >
                      <span>{t('common.uptime_info_1')}</span>
                    </div>
                  </div>
                }
              />
            </div>
            <ReactECharts
              style={{ height: '100%', width: '100%' }}
              ref={chartRef}
              key={props.locationId}
              option={chartOption}
            />
          </div>
        </div>
        <div className={styles['card-bottom-section']}>
          <div className={styles['current-status']}>
            <div className={styles['current-status-header']}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{t('common.current_status')}</span>
              <InfoTooltip
                title={t('common.current_status')}
                content={
                  <span>
                    {t('common.current_status_info')}
                    {/* Current statuses of all equipment in the location. */}
                  </span>
                }
              />
            </div>
            <div className={styles['status-metrics']}>
              <StatusMetric
                totalAssetCount={props.totalAsset}
                title={t('common.running')}
                type="RUNNING"
                value={props.totalRunningAsset}
                isHovering={isHovering}
                onHover={handleOnHover}
              />
              <StatusMetric
                totalAssetCount={props.totalAsset}
                title={t('common.planned_down')}
                type="PLANNED DOWN"
                value={props.totalPlannedDownAsset}
                isHovering={isHovering}
                onHover={handleOnHover}
              />
              <StatusMetric
                totalAssetCount={props.totalAsset}
                title={t('common.unplanned_down')}
                type="UNPLANNED DOWN"
                value={props.totalUnplannedDownAsset}
                isHovering={isHovering}
                onHover={handleOnHover}
              />
              <StatusMetric
                totalAssetCount={props.totalAsset}
                title={t('common.off_offline')}
                type="OFFLINE"
                value={props.totalOfflineAsset}
                isHovering={isHovering}
                onHover={handleOnHover}
              />
            </div>
          </div>
          <div className={styles['current-condition']}>
            <div
              className={styles['current-condition-header']}
              title={t('common.current_condition')}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t('common.current_condition')}
              </span>
              <InfoTooltip
                title={t('common.current_condition')}
                content={
                  <span>
                    {t('common.current_condition_info')}
                    {/* Current conditions of all equipment in the location. */}
                  </span>
                }
              />
            </div>
            <div className={styles['condition-status']}>
              <ConditionMetric
                ConditionIcon={<SuccessNormalCheckCircleIcon />}
                title={t('common.normal')}
                type="NORMAL"
                value={props.totalNormalAsset}
              />
              <ConditionMetric
                ConditionIcon={<WarningAlarmIcon />}
                title={t('common.warning')}
                type="WARNING"
                value={props.totalWarningAsset}
              />
              <ConditionMetric
                ConditionIcon={<CloseDownErrorCircleIcon />}
                title={t('common.critical')}
                type="CRITICAL"
                value={props.totalCriticalAsset}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
