/* eslint-disable simple-import-sort/imports */
import { AlarmOccurence as AlarmOccurenceIcon } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';

import {
  ALARM_COLOR,
  COLOR,
  Container,
  InfoTooltip,
  Legends,
  Loading,
} from '../../../../index';
import styles from './alarm-occurence.module.scss';

interface AlarmOccurenceProps {
  alarmOccurenceOption: EChartsOption;
  abnormalChartOption: EChartsOption;
  collapsibleRef: React.RefObject<ImperativePanelHandle | null>;
  abnormalChartRef: React.RefObject<ReactECharts | null>;
  criticalWarningChartRef: React.RefObject<ReactECharts | null>;
  isFetching: boolean;
  isPreview: boolean;
  onPanelResizeHandler: () => void;
  resizerClickHandler: () => void;
}

export default function AlarmOccurenceProps({
  alarmOccurenceOption,
  abnormalChartOption,
  abnormalChartRef,
  collapsibleRef,
  criticalWarningChartRef,
  isFetching,
  isPreview,
  onPanelResizeHandler,
  resizerClickHandler,
}: AlarmOccurenceProps) {
  return (
    <Container
      className={styles['alarm-chart-occurence']}
      style={{ height: isPreview ? 350 : undefined }}
      title={t('common.equipment_alarm_occurrence')}
      // informationIcon={
      //   <InfoTooltip
      //     title="Equipment Alarm Occurrence"
      //     content={
      //       <span>Alarm type distribution across the selected dates.</span>
      //     }
      //   />
      // }
      icon={<AlarmOccurenceIcon />}
      rightTopComponent={
        <div className={styles['right-top-component']}>
          <InfoTooltip
            title={t('common.equipment_alarm_occurrence')}
            content={
              <span>
                {t('common.equipment_alarm_occurrence_info')}
                {/* Alarm type distribution across the selected dates. */}
              </span>
            }
          />
          <Legends
            wrapperProps={{ style: { overflow: 'auto' } }}
            data={[
              {
                color: ALARM_COLOR.CRITICAL,
                label: t('common.critical'),
              },
              { color: ALARM_COLOR.WARNING, label: t('common.warning') },
              {
                color: COLOR.conditionAbnormalPrimary,
                label: t('common.abnormal'),
              },
            ]}
          />
        </div>
      }
    >
      <div className={styles['alarm-chart-occurence']}>
        <Loading isLoading={isFetching} />
        <div className={styles['alarm-chart-container']}>
          <PanelGroup
            className={styles['chart-container']}
            direction="horizontal"
          >
            <Panel
              className={styles['chart-panel']}
              collapsible
              ref={collapsibleRef}
              onResize={onPanelResizeHandler}
              collapsedSize={0}
            >
              {alarmOccurenceOption.series[0].data.length > 0 ? (
                <ReactECharts
                  ref={criticalWarningChartRef}
                  option={alarmOccurenceOption}
                  key={1}
                  style={{ height: '100%', width: '100%' }}
                />
              ) : (
                <div className={styles['unavailable']}>
                  <span>{t('common.no_data_available')}</span>
                </div>
              )}
            </Panel>
            <PanelResizeHandle
              onClick={resizerClickHandler}
              className={styles['divider']}
            >
              <div className={styles['divider-handle']}></div>
            </PanelResizeHandle>
            {
              <Panel className={styles['chart-panel']} collapsedSize={0}>
                {abnormalChartOption.series[0].data.length > 0 ? (
                  <ReactECharts
                    ref={abnormalChartRef}
                    style={{ height: '100%', width: '100%' }}
                    key={2}
                    option={abnormalChartOption}
                  />
                ) : (
                  <div className={styles['unavailable']}>
                    <span>{t('common.no_data_available')}</span>
                  </div>
                )}
              </Panel>
            }
          </PanelGroup>
        </div>
      </div>
    </Container>
  );
}
