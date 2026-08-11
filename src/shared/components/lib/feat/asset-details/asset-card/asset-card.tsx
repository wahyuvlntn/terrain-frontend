import { ImagePlaceholder, TimeEmpty, Uptime } from '@digital-twin/icons';
import {
  convertToPascalCase,
  formatDateHTMLInput,
  formatDurationToMinutesFromDate,
  t,
} from '@digital-twin/utils';
import clsx from 'clsx';
import { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CSSProperties, ReactNode, useContext } from 'react';
import { createSearchParams, Link, useSearchParams } from 'react-router-dom';

import { InfoTooltip } from '../../../data';
import {
  ALARM_ICON,
  AlarmEnum,
  CONDITION_COLOR,
  CONDITION_ICON,
  ConditionEnum,
  STATUS_COLOR,
  STATUS_ICON,
  StatusEnum,
} from '../../../mapping';
import utilStyles from '../../../util-class.module.scss';
import { ThemeContext } from '../../admin';
import styles from './asset-card.module.scss';

type CardBadgeProps = {
  uptime?: number | null;
};
export const CardBadge = ({ uptime }: CardBadgeProps) =>
  uptime === undefined ? null : (
    <AssetCardBadge
      icon={<Uptime />}
      label={`${t('common.uptime')}:`}
      value={uptime === null ? '-' : `${uptime}%`}
      className={styles.uptime}
    />
  );

type CardRightComponentProps = {
  uptime: number | null;
  condition: ConditionEnum | null;
  conditionStartTime: string | null;
  warningCount: number;
  criticalCount: number;
  style?: CSSProperties;
  conditionAlarmContainerClassName?: string;
  conditionBadgeClassName?: string;
  uptimeDuration?: number;
  totalDuration?: number;
  uptimeContainerClassName?: string;
};
export const CardRightComponent = ({
  uptime,
  condition,
  conditionStartTime,
  warningCount,
  criticalCount,
  style,
  conditionAlarmContainerClassName,
  conditionBadgeClassName,
  totalDuration,
  uptimeDuration,
  uptimeContainerClassName,
}: CardRightComponentProps) => {
  const {
    colors: { backgroundLowest, neutralTextTitleHeading, conditionNormalPrimary },
  } = useContext(ThemeContext);

  const option: EChartsOption = {
    animation: false,
    series: [
      {
        type: 'pie',
        top: '-20%',
        left: '-20%',
        right: '-20%',
        bottom: '-20%',
        radius: ['50%', '70%'],
        labelLine: {
          show: false,
        },
        label: {
          show: true,
          position: 'center',
        },
        emphasis: {
          label: {
            show: false,
          },
        },
        silent: true,
        data: [
          {
            value: uptime ?? 0,
            name: ' ',
            itemStyle: { color: conditionNormalPrimary },
          },
          {
            value: 100 - (uptime ?? 0),
            name: '',
            itemStyle: {
              color: backgroundLowest,
            },
          },
        ],
        markPoint: {
          tooltip: { show: false },
          label: {
            show: true,
            formatter: '{b}',
            color: neutralTextTitleHeading,
            fontSize: 16,
          },
          data: [
            {
              name: uptime === null ? '-' : `${uptime}%`,
              value: '-',
              symbol: 'circle',
              itemStyle: { color: 'transparent' },
              x: '50%',
              y: '50%',
            },
          ],
        },
      },
    ],
  };

  const conditionDuration =
    conditionStartTime === null
      ? '-'
      : formatDurationToMinutesFromDate(new Date(conditionStartTime));
  return (
    <div className={styles['card-right']} style={style}>
      <div className={clsx(styles['condition-alarm'], conditionAlarmContainerClassName)}>
        <div className={styles.label}>
          <span>{t('common.condition')}</span>

          <InfoTooltip
            title={t('common.condition')}
            content={
              t('common.condition_info')
              // 'How long the equipment has remained in its current condition'
            }
            height={'fit-content'}
          />
        </div>
        <div className={styles.condition}>
          {condition ? (
            <div
              className={clsx(styles.badge, conditionBadgeClassName)}
              style={{
                background: CONDITION_COLOR[condition],
              }}
            >
              <div className={styles['badge-label']}>
                {CONDITION_ICON[condition]}
                <div className={utilStyles['field-label']}>
                  {t(`common.${condition.toLowerCase()}`)}
                </div>
              </div>
              <div
                className={clsx(styles['badge-value'], utilStyles['field-label'])}
                title={conditionDuration}
              >
                {conditionDuration}
              </div>
            </div>
          ) : null}
          <div className={styles.alarm}>
            <div className={styles.warning}>
              {ALARM_ICON[AlarmEnum.enum.WARNING]}
              <div title={warningCount.toString()}>{warningCount}</div>
            </div>
            <div className={styles.critical}>
              {ALARM_ICON[AlarmEnum.enum.CRITICAL]}
              <div title={criticalCount.toString()}>{criticalCount}</div>
            </div>
          </div>
        </div>
      </div>
      <div className={clsx(styles.oee, uptimeContainerClassName)}>
        <div className={styles.label}>
          <span>Uptime</span>

          <InfoTooltip
            title={'Uptime'}
            contentStyle={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
            /* TODO: change tooltip content */
            content={
              <>
                <span>
                  {t('common.oee_info_equipment_1') + ':'}
                  {/* Average OEE of the selected period: */}
                </span>
                <span>OEE (%) = A x P x Q</span>
                <span>
                  {t('common.oee_info_2')}
                  {/* OEE is calculated only if there is production */}
                </span>
              </>
            }
          />
        </div>
        <ReactECharts
          option={option}
          style={{
            height: 84,
            width: 84,
          }}
        />
        {uptimeDuration !== undefined && totalDuration !== undefined ? (
          <span className={styles.duration}>
            {`${uptimeDuration}/${totalDuration} hour${totalDuration > 1 ? 's' : ''}`}
          </span>
        ) : null}
      </div>
    </div>
  );
};

type CardLeftComponentProps = {
  type: string;
  model: string;
};
export const CardLeftComponent = ({ type, model }: CardLeftComponentProps) => {
  const informations = [
    {
      label: `${t('common.type')}:`,
      value: type ?? '-',
    },
    {
      label: `${t('common.model')}:`,
      value: model ?? '-',
    },
  ];
  return (
    <div className={styles['card-left']}>
      {informations.map((item) => (
        <section key={item.label}>
          <div className={styles.label}>{item.label}</div>
          <div className={styles.value} title={item.value}>
            {item.value}
          </div>
        </section>
      ))}
    </div>
  );
};

type AssetCardBadgeProps = {
  className?: string;
  style?: CSSProperties;
  icon: ReactNode;
  label?: string;
  value: ReactNode;
};
export const AssetCardBadge = ({ className, style, icon, label, value }: AssetCardBadgeProps) => (
  <div className={clsx(styles.badge, className)} style={style}>
    {icon}
    <div className={styles['badge__text']}>
      {label ? <span className={styles['badge__text__label']}>{label}</span> : null}
      <div>{value}</div>
    </div>
  </div>
);

export interface AssetCardProps extends Omit<CardRightComponentProps, 'style' | 'className'> {
  id?: number;
  name: string;
  status: StatusEnum | null;
  statusStartTime: Date | null;
  image: string;
  variant: 'overview' | 'details';
  onImageClick?: () => void;
  disableLink?: boolean;
  badge?: ReactNode;
  width?: string | number;
  height?: string | number;
  imgSize?: string | number;
  className?: string;
  children?: ReactNode;
  headerClassName?: string;
  runningHours?: number;
  model: string;
  type: string;
  rightComponentStyle?: CSSProperties;
  rightComponentClassName?: string;
  runningBadgePosition?: 'top' | 'right';
}

export const AssetCard = ({
  id,
  name,
  statusStartTime,
  status,
  image,
  variant,
  onImageClick,
  disableLink,
  badge,
  height,
  imgSize,
  width,
  className,
  children,
  headerClassName,
  runningHours,
  model,
  type,
  rightComponentStyle,
  rightComponentClassName,
  runningBadgePosition = 'top',
  ...cardRightComponentProps
}: AssetCardProps) => {
  const [searchParams] = useSearchParams();

  const {
    colors: { backgroundLowest },
  } = useContext(ThemeContext);

  const renderRunningHoursBadge = () => (
    <AssetCardBadge
      label={'Running hours:'}
      value={`${runningHours?.toLocaleString()}h`}
      icon={<TimeEmpty />}
      className={styles.RunningDurationBadge}
    />
  );

  const headerContent = (
    <>
      <h3 title={name}>{name}</h3>
      <div className={styles['header-badge']}>
        {badge}
        {runningHours !== undefined && runningBadgePosition === 'top'
          ? renderRunningHoursBadge()
          : null}
        {status ? (
          <AssetCardBadge
            style={{
              background: STATUS_COLOR[status],
            }}
            icon={STATUS_ICON[status]}
            label={`${(() => {
              switch (status) {
                case 'RUNNING':
                  return t('common.running');
                case 'IDLE':
                  return t('common.idle');
                case 'PLANNED DOWN':
                  return t('common.planned_down');
                case 'UNPLANNED DOWN':
                  return t('common.unplanned_down');
                case 'OFFLINE':
                  return t('common.off_offline');
                case 'DOWN':
                  return t('common.down');
                default:
                  return convertToPascalCase(status);
              }
            })()}: `}
            value={statusStartTime ? formatDurationToMinutesFromDate(statusStartTime) : '-'}
          />
        ) : null}
      </div>
    </>
  );

  const queryString: { [key: string]: string | string[] } = {};
  for (const entry of searchParams.entries()) {
    const key = entry[0];
    const data = queryString[key];
    const value = entry[1];
    if (data) queryString[key] = [...data, value];
    else queryString[key] = [value];
  }

  const endDate = searchParams.get('end');

  return (
    <div
      className={clsx(styles['asset-card'], variant === 'details' && styles['details'], className)}
      style={{
        height,
        minHeight: height,
        maxHeight: height,
        width,
        minWidth: width,
      }}
    >
      {children}
      {!disableLink ? (
        <Link
          className={clsx(styles.header, headerClassName)}
          to={{
            pathname: id?.toString(),
            search: `?${createSearchParams({
              ...queryString,
              date: endDate !== null && endDate <= formatDateHTMLInput(new Date()) ? endDate : '',
            })}`,
          }}
        >
          {headerContent}
        </Link>
      ) : (
        <div className={clsx(styles.header, headerClassName)}>{headerContent}</div>
      )}
      <div className={clsx(styles.body, variant === 'overview' && styles.small)}>
        <div className={styles.info}>
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <img
            className={clsx(onImageClick && styles['img-aspect'])}
            onClick={onImageClick}
            src={image}
            alt={'asset-card-img'}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = ImagePlaceholder(backgroundLowest);
            }}
            style={{
              width: imgSize,
              height: imgSize,
              minWidth: imgSize,
              minHeight: imgSize,
            }}
          />
          </div>
          <CardLeftComponent model={model} type={type} />
        </div>
        <div className={clsx(styles['card-right-outer-container'], rightComponentClassName)}>
          {runningHours !== undefined && runningBadgePosition === 'right'
            ? renderRunningHoursBadge()
            : null}
          <CardRightComponent {...cardRightComponentProps} style={rightComponentStyle} />
        </div>
      </div>
    </div>
  );
};
