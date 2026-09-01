import { ThemeContext } from '@digital-twin/components';
import { UserPlaceholderImg } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { PropsWithChildren } from 'react';
import { useContext } from 'react';
import type { PersonnelEntry } from '../schemas/personnel';
import { CurrentMaintenanceOrder } from './current-maintenance-order';
import { KV } from './kv';
import { PMInfoTooltip } from './pm-info-tooltip';
import styles from './pm-list-card.module.scss';

interface PMListCardProps extends PropsWithChildren {
  entry: PersonnelEntry;
  selected: boolean;
  onSelect?: (entry: PersonnelEntry) => void;
  className?: string;
}

export const PMListCard = ({ entry, selected, onSelect, className, children }: PMListCardProps) => {
  const {
    colors: { backgroundLowest, neutralTextTitleHeading, conditionNormalPrimary },
  } = useContext(ThemeContext);

  const chartOption: EChartsOption = {
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
            value: entry.capacityPercentage ?? 0,
            name: ' ',
            itemStyle: { color: conditionNormalPrimary },
          },
          {
            value: 100 - (entry.capacityPercentage ?? 0),
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
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 27,
          },
          data: [
            {
              name: entry.capacityPercentage != null ? `${entry.capacityPercentage}%` : '-',
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

  return (
    <div
      className={clsx(
        styles['card'],
        selected && styles['card--selected'],
        onSelect && styles['card--selectable'],
        className
      )}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect(entry);
            }
          : undefined
      }
    >
      <div className={styles['card__left']}>
        <div className={styles['card__left__header']}>
          {entry.image ? (
            <img className={styles['card__left__header__image']} alt={entry.id} src={entry.image} />
          ) : (
            <UserPlaceholderImg className={styles['card__left__header__image']} />
          )}
          <span
            className={clsx(styles['card__left__header__title'], styles['ellipsis'])}
            title={entry.name}
          >
            {entry.name}
          </span>
        </div>
        <div className={styles['card__left__body']}>
          <KV k={t('common.assigned_building') + ':'} v={entry.assignedBuildings ?? '-'} />
          <KV
            k={t('common.assigned_equipment_type') + ':'}
            v={entry.assignedEquipmentTypes ?? '-'}
          />
          <KV
            k={t('common.current_maintenance_order') + ':'}
            v={
              entry.currentMaintenanceOrder ? (
                <CurrentMaintenanceOrder orderName={entry.currentMaintenanceOrder} />
              ) : (
                '-'
              )
            }
          />
        </div>
      </div>
      <div className={styles['card__right']}>
        <div className={styles['card__right__title']}>
          <span>{t('common.capacity')}</span>
          <PMInfoTooltip
            title={t('common.capacity')}
            content={`${t('common.capacity')} (%) = (${t(
              'common.actual_working_hours'
            )} / ${t('common.available_working_hours')}) x 100%`}
          />
        </div>
        <ReactECharts
          option={chartOption}
          style={{
            height: 84,
            width: 84,
          }}
        />
      </div>
      {children}
    </div>
  );
};
