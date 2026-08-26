import { COLOR, Loading, STATUS_COLOR, STATUS_ICON, useExtractFilter } from '@digital-twin/components';
import { convertToPascalCase, formatDurationToMinutesFromDate } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMemo } from 'react';

import { getAssetOverview } from '../../early-warning-and-diagnostics/api/early-warning-and-diagnostics';
import { GeneralFilterType, MaintenanceOrderFilterType } from '../type';
import styles from './diagnostic-overview.module.scss';

type StatusType = 'RUNNING' | 'IDLE' | 'PLANNED DOWN' | 'UNPLANNED DOWN' | 'OFFLINE' | 'DOWN';

export const DiagnosticOverview = ({
  isCompound,
  detectedAt,
  asset_id,
  isDeduction,
}: {
  isCompound?: boolean;
  detectedAt: string;
  asset_id: number;
  isDeduction?: boolean;
}) => {
  const { filter } = useExtractFilter<GeneralFilterType, MaintenanceOrderFilterType>();

  const earlyWarningType = isCompound ? 'COMPOUND' : 'DEGRADATION';

  const today = format(new Date(), 'yyyy-MM-dd');
  const effectiveStart = filter.start && filter.start > today ? today : filter.start;
  const effectiveEnd = filter.end && filter.end > today ? today : filter.end;
  const start_date = effectiveStart || today;
  const end_date = effectiveEnd
    ? format(new Date(new Date(effectiveEnd).getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    : format(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const timezone_offset = new Date().getTimezoneOffset();

  const { data: assetOverview, isFetching } = useQuery({
    queryKey: ['getAssetOverview', { asset_id, start_date, end_date, timezone_offset }] as const,
    queryFn: () => getAssetOverview({ asset_id, start_date, end_date, timezone_offset }),
    enabled: !!asset_id,
    meta: {
      toastId: 'getAssetOverview',
    },
  });

  return (
    <div className={styles['diagnostic-overview']}>
      <Loading isLoading={isFetching} />
      <div className={styles['diagnostic-overview__title']}>Diagnostic Overview</div>
      <div className={styles['diagnostic-overview__description']}>
        Review the equipment condition and detected issues
      </div>
      <div className={styles['diagnostic-status']}>
        <div className={styles['diagnostic-status__key-val-1']}>
          <div style={{ whiteSpace: 'nowrap' }}>Detected at:</div>
          <span className={styles['val']}>{detectedAt}</span>
        </div>
        <div className={styles['diagnostic-status__key-val-2']}>
          <div style={{ display: 'flex', flexShrink: 1, whiteSpace: 'nowrap' }}>
            Equipment Status:
          </div>
          {assetOverview && (
            <RenderAssetStatus
              background={STATUS_COLOR[assetOverview?.status as StatusType]}
              icon={STATUS_ICON[assetOverview?.status as StatusType]}
              label={convertToPascalCase(assetOverview?.status as StatusType)}
              duration={
                assetOverview?.status_start_time
                  ? formatDurationToMinutesFromDate(new Date(assetOverview?.status_start_time))
                  : ''
              }
            />
          )}
        </div>
        <div className={styles['diagnostic-status__key-val-3']}>
          <div style={{ whiteSpace: 'nowrap' }}>Early Warning Type:</div>
          <RenderEarlyWarningType
            type={earlyWarningType}
            isDeduction={isDeduction}
            long={true}
            wrapperStyle={{ flexShrink: 1 }}
            contentStyle={{ flexShrink: 1 }}
          />
        </div>
      </div>
    </div>
  );
};

const RenderAssetStatus = ({
  icon,
  background,
  label,
  duration,
}: {
  icon: React.ReactNode;
  background: string;
  label: string;
  duration: string;
}) => {
  return (
    <div className={styles['asset-status']} style={{ background }}>
      <div>{icon}</div>
      <div
        title={label}
        style={{
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: COLOR.neutralTextTitleHeading,
          width: 6,
          height: 6,
          borderRadius: 3,
        }}
      ></div>
      <div
        title={duration}
        style={{
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textAlign: 'end',
        }}
      >
        {duration}
      </div>
    </div>
  );
};

export const RenderEarlyWarningType = ({
  type,
  isDeduction,
  long,
  wrapperStyle,
  contentStyle,
}: {
  type: 'DEGRADATION' | 'COMPOUND';
  isDeduction?: boolean;
  long?: boolean;
  wrapperStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}) => {
  const color = useMemo(() => {
    return type === 'COMPOUND' ? COLOR.conditionCriticalPrimary : COLOR.conditionWarningPrimary;
  }, [type]);
  return (
    <div
      className={styles['early-warning']}
      style={{
        border: `1px solid ${color}`,
        background: `color-mix(in srgb, ${color} 20%, transparent)`,
        ...wrapperStyle,
      }}
    >
      <div className={styles['early-warning-content']} style={{ ...contentStyle }}>
        <div
          title={
            convertToPascalCase(type) +
            `${long && type === 'COMPOUND' ? ' Degradation' : ''} ${
              isDeduction ? 'with Deduction' : ''
            }`
          }
          style={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {convertToPascalCase(type) +
            `${long && type === 'COMPOUND' ? ' Degradation' : ''} ${
              isDeduction ? 'with Deduction' : ''
            }`}
        </div>
      </div>
    </div>
  );
};
