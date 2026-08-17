/* eslint-disable simple-import-sort/imports */
import { BarChartH as BarChartHIcon } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import ReactECharts, { EChartsOption } from 'echarts-for-react';

import {
  ALARM_COLOR,
  COLOR,
  Container,
  InfoTooltip,
  Legends,
  Loading,
} from '../../../../index';
import styles from './alarm-status-chart.module.scss';

interface AlarmStatusProps {
  alarmStatusChartOption: EChartsOption;
  statusChartRef: React.RefObject<ReactECharts | null>;
  isFetching: boolean;
}

export default function AlarmStatusChart({
  alarmStatusChartOption,
  statusChartRef,
  isFetching,
}: AlarmStatusProps) {
  return (
    <Container
      className={styles['alarm-status-chart-container']}
      title={t('common.alarm_status_chart')}
      rightTopComponent={
        <div className={styles['right-top-component']}>
          <InfoTooltip
            title={t('common.alarm_status_chart')}
            content={
              <span>
                {t('common.alarm_status_chart_info')}
                {/* Alarm type distribution across the selected equipment within the selected dates. */}
              </span>
            }
          />
          <Legends
            wrapperProps={{ style: { overflow: 'auto' } }}
            data={[
              { color: ALARM_COLOR.WARNING, label: t('common.warning') },
              {
                color: ALARM_COLOR.CRITICAL,
                label: t('common.critical'),
              },
              {
                color: COLOR.conditionAbnormalPrimary,
                label: t('common.abnormal'),
              },
            ]}
          />
        </div>
      }
      icon={<BarChartHIcon />}
      titleProps={{
        style: {
          fontWeight: 600,
          fontSize: 22,
        },
      }}
    >
      <div className={styles['alarm-status-chart-container']}>
        <Loading isLoading={isFetching} />
        {alarmStatusChartOption.dataset.source.length > 1 ? (
          <ReactECharts
            className={styles['alarm-status-chart']}
            ref={statusChartRef}
            option={alarmStatusChartOption}
            style={{
              height: '100%',
              width: '100%',
              overflow: 'hidden',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <span>{t('common.no_data_available')}</span>
          </div>
        )}
      </div>
    </Container>
  );
}
