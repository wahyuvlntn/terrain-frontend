import { ArrowBackCircleFill, ArrowForwardCircleFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import ReactECharts from 'echarts-for-react';
import { useContext, useMemo, useRef, useState } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { useSearchParams } from 'react-router-dom';

import { COLOR, Legend, ThemeContext, TooltipContent } from '../../../..';
import AlarmEventList from './alarm-event-list';
import styles from './alarm-legend.module.scss';
import AlarmOccurence from './alarm-occurence';
import AlarmTable from './alarm-table';
import StatusIndicator from './status-indicator';

const generateAlarmLogsTable = () => {
  const rowData = [];
  const ALARM_MESSAGES = [
    'Soft Limit',
    'Vibration:99.5 Hz approaching high limit',
    'Undefined Axis Existence',
    'Axis has not passed Z Phase',
    'Illegal dir. for origin return',
    'Temperature:66 C approaching high limit',
  ];
  const ALARM_STATUSES = ['Warning', 'Critical'];
  const ALARM_TYPES = ['Abnormal', 'Alarm'];
  const ASSET_NAMES = [
    'V-120-1',
    'V-120-2',
    'V-120-3',
    'V-120-4',
    'V-120-5',
    'V-120-6',
  ];
  const TIMESTAMPS = [
    '27 Oct 2023 03:00',
    '27 Oct 2023 05:00',
    '27 Oct 2023 07:00',
    '27 Oct 2023 09:00',
    '27 Oct 2023 11:00',
    '27 Oct 2023 13:00',
  ];
  for (let k = 0; k < 6; k++) {
    const randomIndex = Math.floor(Math.random() * 6);
    const status = ALARM_STATUSES[Math.floor(Math.random() * 2)];
    rowData.push({
      id: k.toString(),
      alarmMessage: ALARM_MESSAGES[randomIndex],
      alarmStatus: (
        <StatusIndicator
          statusType="WARNING"
          status={status ? (status === 'Warning' ? 'Warning' : 'Critical') : ''}
        />
      ),
      alarmType: ALARM_TYPES[Math.floor(Math.random() * 2)],
      assetName: ASSET_NAMES[randomIndex],
      timestamp: TIMESTAMPS[k],
    });
  }

  return rowData;
};

const AlarmLegend = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState('');
  const collapsibleRef = useRef<ImperativePanelHandle>(null);
  const criticalWarningChartRef = useRef<ReactECharts>(null);
  const abnormalChartRef = useRef<ReactECharts>(null);
  const [widthScaler, setWidthScaler] = useState<null | number>(null);

  const [tagPosition, setTagPosition] = useState(510);
  const [showDragLeft, setShowDragLeft] = useState(false);
  const [showDragRight, setShowDragRight] = useState(false);

  const onPanelResizeHandler = () => {
    const widthPercentage = collapsibleRef.current?.getSize();

    // Resize charts if they exist
    if (abnormalChartRef.current && criticalWarningChartRef.current) {
      abnormalChartRef.current.getEchartsInstance().resize();
      criticalWarningChartRef.current.getEchartsInstance().resize();
    }

    if (widthPercentage !== undefined) {
      const scaler = widthPercentage / 100;
      setWidthScaler(scaler);

      // Calculate tag position based on width percentage
      const tagPosition = widthPercentage === 50 ? 510 : scaler * 1010;
      setTagPosition(tagPosition);

      // Handle showing/hiding drag indicators
      if (widthPercentage >= 80) {
        collapsibleRef.current?.resize(100);
        setShowDragRight(true);
        setShowDragLeft(false);
      } else if (widthPercentage <= 20) {
        collapsibleRef.current?.resize(0);
        setShowDragLeft(true);
        setShowDragRight(false);
      } else {
        setShowDragLeft(false);
        setShowDragRight(false);
      }
    }
  };

  const resizerClickHandler = () => {
    const widthPercentage = collapsibleRef.current?.getSize();
    if (widthPercentage === 100 || widthPercentage === 0) {
      collapsibleRef.current?.resize(50);
      setShowDragRight(false);
      setShowDragLeft(false);
    }
  };

  const {
    colors: {
      neutralTextTitleHeading,
      conditionWarningSecondary,
      conditionCriticalSecondary,
      conditionAbnormalPrimary,
    },
  } = useContext(ThemeContext);

  const rowData = useMemo(() => {
    return generateAlarmLogsTable();
  }, []);

  return (
    <Legend>
      <div className={styles.container1}>
        <AlarmTable
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          isPreview
          columnOrder={{
            timestamp: null,
            assetName: null,
            alarmType: null,
            alarmStatus: null,
            alarmMessage: null,
          }}
          alarmTableData={rowData.map((row) => ({
            id: row.id,
            data: { ...row },
          }))}
          changeView={() => {}}
          columnData={[
            {
              header: t('common.timestamp'),
              field: 'timestamp',
              alignment: 'left',
            },
            {
              header: t('common.equipment'),
              field: 'assetName',
              alignment: 'left',
            },
            {
              header: t('common.type'),
              field: 'alarmType',
              alignment: 'left',
            },
            {
              header: t('common.status'),
              field: 'alarmStatus',
              alignment: 'center',
            },
            {
              header: t('common.alarm_message'),
              field: 'alarmMessage',
              alignment: 'left',
            },
          ]}
          handleSearchInputChange={(e) => {
            setSearchInput(e.target.value);
          }}
          isFetching={false}
          limit={6}
          maxPage={36}
          searchInput={searchInput}
          handleSortColumn={() => {}}
        />
        <TooltipContent
          content={t('common.alarm_list')}
          className={styles.tooltip__right}
          position={'right'}
          size={'large'}
          left={150}
          top={200}
        />
        <TooltipContent
          content={t('common.alarm_search_box')}
          className={styles.tooltip__bottom}
          position={'bottom'}
          size={'large'}
          left={550}
          top={0}
        />
        <TooltipContent
          content={t('common.view_switcher')}
          className={styles.tooltip__bottom}
          position={'bottom'}
          size={'large'}
          left={920}
          top={0}
        />
        <TooltipContent
          content={t('common.pagination')}
          className={styles.tooltip__top}
          position={'top'}
          size={'large'}
          left={540}
          top={430}
        />
      </div>
      <div className={styles.container2}>
        <AlarmEventList
          startDate="2024-08-22"
          endDate="2024-09-05"
          //TODO: remove onPageChange since it's not used
          //onPageChange={() => {}}
          //TODO: remove page since it's not used
          //page={1}
          setFilter={() => {}}
          isPreview
          count={20}
          changeView={() => {}}
          machineAlarmData={[
            {
              assetId: 176,
              assetImagePath: null,
              assetName: 'Asset_Abnormal12',
              data: [
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '07 May 2024',
                  timestamp: '07/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '08 May 2024',
                  timestamp: '08/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '09 May 2024',
                  timestamp: '09/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '10 May 2024',
                  timestamp: '10/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '11 May 2024',
                  timestamp: '11/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '12 May 2024',
                  timestamp: '12/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '13 May 2024',
                  timestamp: '13/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '14 May 2024',
                  timestamp: '14/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '15 May 2024',
                  timestamp: '15/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '16 May 2024',
                  timestamp: '16/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '17 May 2024',
                  timestamp: '17/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '18 May 2024',
                  timestamp: '18/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '19 May 2024',
                  timestamp: '19/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '20 May 2024',
                  timestamp: '20/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '21 May 2024',
                  timestamp: '21/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '22 May 2024',
                  timestamp: '22/05',
                  warningCount: 0,
                },
              ],
              lastAlarmMessage: 'Asset_Abnormal12: Abnormal Parameter is 200 v',
              lastAlarmName: 'Abnormal',
              lastAlarmStatus: 'CRITICAL',
              lastAlarmTimestamp: '2024-06-06T08:08:11.208+00:00',
              lastAlarmType: 'ABNORMAL',
              modelName: 'Model Abnormal',
            },
            {
              assetId: 177,
              assetImagePath: null,
              assetName: 'Asset_Warning',
              data: [
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '07 May 2024',
                  timestamp: '07/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '08 May 2024',
                  timestamp: '08/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '09 May 2024',
                  timestamp: '09/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '10 May 2024',
                  timestamp: '10/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '11 May 2024',
                  timestamp: '11/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '12 May 2024',
                  timestamp: '12/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '13 May 2024',
                  timestamp: '13/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '14 May 2024',
                  timestamp: '14/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '15 May 2024',
                  timestamp: '15/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '16 May 2024',
                  timestamp: '16/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '17 May 2024',
                  timestamp: '17/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '18 May 2024',
                  timestamp: '18/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '19 May 2024',
                  timestamp: '19/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '20 May 2024',
                  timestamp: '20/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '21 May 2024',
                  timestamp: '21/05',
                  warningCount: 0,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 0,
                  dateAlt: '22 May 2024',
                  timestamp: '22/05',
                  warningCount: 0,
                },
              ],
              lastAlarmMessage: 'warning warning',
              lastAlarmName: 'alarm_warning',
              lastAlarmStatus: 'WARNING',
              lastAlarmTimestamp: '2024-06-07T03:39:41.125+00:00',
              lastAlarmType: 'ALARM',
              modelName: 'Model Warning',
            },
            {
              assetId: 152,
              assetImagePath: null,
              assetName: 'LOW_M5',
              data: [
                {
                  abnormalCount: 0,
                  criticalCount: 23,
                  dateAlt: '07 May 2024',
                  timestamp: '07/05',
                  warningCount: 25,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 25,
                  dateAlt: '08 May 2024',
                  timestamp: '08/05',
                  warningCount: 23,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 30,
                  dateAlt: '09 May 2024',
                  timestamp: '09/05',
                  warningCount: 18,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 20,
                  dateAlt: '10 May 2024',
                  timestamp: '10/05',
                  warningCount: 28,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 22,
                  dateAlt: '11 May 2024',
                  timestamp: '11/05',
                  warningCount: 26,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 25,
                  dateAlt: '12 May 2024',
                  timestamp: '12/05',
                  warningCount: 23,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 23,
                  dateAlt: '13 May 2024',
                  timestamp: '13/05',
                  warningCount: 25,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 21,
                  dateAlt: '14 May 2024',
                  timestamp: '14/05',
                  warningCount: 27,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 22,
                  dateAlt: '15 May 2024',
                  timestamp: '15/05',
                  warningCount: 26,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 29,
                  dateAlt: '16 May 2024',
                  timestamp: '16/05',
                  warningCount: 19,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 23,
                  dateAlt: '17 May 2024',
                  timestamp: '17/05',
                  warningCount: 25,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 28,
                  dateAlt: '18 May 2024',
                  timestamp: '18/05',
                  warningCount: 20,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 24,
                  dateAlt: '19 May 2024',
                  timestamp: '19/05',
                  warningCount: 24,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 27,
                  dateAlt: '20 May 2024',
                  timestamp: '20/05',
                  warningCount: 21,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 25,
                  dateAlt: '21 May 2024',
                  timestamp: '21/05',
                  warningCount: 23,
                },
                {
                  abnormalCount: 0,
                  criticalCount: 28,
                  dateAlt: '22 May 2024',
                  timestamp: '22/05',
                  warningCount: 20,
                },
              ],
              lastAlarmMessage: null,
              lastAlarmName: null,
              lastAlarmStatus: null,
              lastAlarmTimestamp: null,
              lastAlarmType: null,
              modelName: 'Model Low',
            },
          ]}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          handleSearchInputChange={() => {}}
        />
        <TooltipContent
          content={t('common.legend')}
          className={styles.tooltip__bottom}
          position={'bottom'}
          size={'large'}
          title="test"
          left={970}
          top={0}
        />
        <TooltipContent
          content={t('common.view_switcher')}
          className={styles.tooltip__bottom}
          position={'bottom'}
          size={'large'}
          left={680}
          top={0}
        />
        <TooltipContent
          content={t('common.alarm_search_box')}
          className={styles.tooltip__right}
          position={'right'}
          size={'large'}
          left={400}
          top={30}
        />
        <TooltipContent
          content={t('common.equipment_image')}
          position={'left'}
          size={'large'}
          left={140}
          top={150}
        />
        <TooltipContent
          content={t('common.condition')}
          className={styles.tooltip__top}
          position={'top'}
          size={'large'}
          left={390}
          top={350}
        />
        <TooltipContent
          content={t('common.alarm_details')}
          className={styles.tooltip__top}
          position={'top'}
          size={'large'}
          left={220}
          top={470}
        />
        <TooltipContent
          className={styles.tooltip__top}
          content={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex' }}>
                <span>{t('common.alarm_distribution_bar')}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  fontSize: 16,
                  gap: 6,
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'stretch', gap: 6 }}
                >
                  <div
                    style={{
                      width: 8,
                      backgroundColor: conditionWarningSecondary,
                    }}
                  ></div>
                  <span>{t('common.warning')}</span>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'stretch', gap: 6 }}
                >
                  <div
                    style={{
                      width: 8,
                      backgroundColor: conditionCriticalSecondary,
                    }}
                  ></div>
                  <span>{t('common.critical')}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'stretch',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      backgroundColor: conditionAbnormalPrimary,
                    }}
                  ></div>
                  <span>{t('common.abnormal')}</span>
                </div>
              </div>
            </div>
          }
          position={'top'}
          size={'large'}
          left={800}
          top={230}
        />
        <TooltipContent
          content={t('common.day_of_the_month')}
          className={styles.tooltip__top}
          position={'top'}
          size={'large'}
          left={720}
          top={690}
        />
      </div>
      <div className={styles.container3}>
        <AlarmOccurence
          isPreview
          isFetching={false}
          abnormalChartOption={{
            tooltip: {
              trigger: 'axis',
              axisPointer: {
                type: 'shadow',
              },
              confine: true,
              backgroundColor: COLOR.backgroundDefault,
              borderColor: COLOR.borderDefault,
              textStyle: {
                color: COLOR.neutralTextTitleHeading,
              },
            },
            grid: {
              left: '5%',
              right: '5%',
              bottom: '10%',
              top: '10%',
              containLabel: true,
            },
            xAxis: [
              {
                name: t('common.abnormal_parameters'),
                nameLocation: 'middle',
                nameTextStyle: {
                  color: neutralTextTitleHeading,
                  fontWeight: 600,
                  fontSize: '16px',
                },
                nameGap: 30,
                axisLabel: {
                  color: neutralTextTitleHeading,
                  interval: 0,
                  width: 60,
                  overflow: 'truncate',
                  hideOverlap: true,
                },
                type: 'category',
                data: ['V-120-1', 'V-120-2', 'V-120-3', 'V-120-4', 'Others'],
                axisLine: {
                  show: false,
                },
                axisTick: {
                  show: false,
                },
              },
            ],
            yAxis: [
              {
                type: 'value',
                splitNumber: 3,
                axisLabel: {
                  color: neutralTextTitleHeading,
                },
                splitLine: {
                  lineStyle: {
                    color: neutralTextTitleHeading,
                    opacity: 0.3,
                  },
                },
              },
            ],
            series: [
              {
                name: 'Abnormality',
                type: 'bar',
                stack: 'Ad',

                barCategoryGap: '50%',
                color: conditionAbnormalPrimary,
                emphasis: {
                  focus: 'series',
                },
                data: [60, 40, 30, 20, 10],
              },
            ],
          }}
          alarmOccurenceOption={{
            tooltip: {
              trigger: 'axis',
              axisPointer: {
                type: 'shadow',
              },
              confine: true,
              backgroundColor: COLOR.backgroundDefault,
              borderColor: COLOR.borderDefault,
              textStyle: {
                color: COLOR.neutralTextTitleHeading,
              },
            },
            grid: {
              left: '5%',
              right: '5%',
              bottom: '10%',
              top: '10%',
              containLabel: true,
            },
            xAxis: [
              {
                name: t('common.critical_and_warning_alarms'),
                nameLocation: 'middle',
                nameTextStyle: {
                  color: neutralTextTitleHeading,
                  fontWeight: 600,
                  fontSize: '16px',
                },
                nameGap: 30,
                axisLabel: {
                  color: neutralTextTitleHeading,
                  interval: 0,
                  width: 60,
                  overflow: 'truncate',
                  hideOverlap: true,
                },
                type: 'category',
                data: ['V-120-1', 'V-120-2', 'V-120-3', 'V-120-4', 'Others'],
                axisLine: {
                  show: false,
                },
                axisTick: {
                  show: false,
                },
              },
            ],
            yAxis: [
              {
                type: 'value',
                splitNumber: 3,
                axisLabel: {
                  color: neutralTextTitleHeading,
                },

                splitLine: {
                  lineStyle: {
                    color: neutralTextTitleHeading,
                    opacity: 0.3,
                  },
                },
              },
            ],
            series: [
              {
                name: 'Warning',
                type: 'bar',
                stack: 'Ad',
                barCategoryGap: '50%',
                color: conditionWarningSecondary,
                emphasis: {
                  focus: 'series',
                },
                data: [50, 40, 40, 30, 15],
              },
              {
                name: 'Critical',
                type: 'bar',
                stack: 'Ad',
                color: conditionCriticalSecondary,
                emphasis: {
                  focus: 'series',
                },
                data: [36, 36, 22, 17, 15],
              },
            ],
          }}
          onPanelResizeHandler={onPanelResizeHandler}
          resizerClickHandler={resizerClickHandler}
          abnormalChartRef={abnormalChartRef}
          collapsibleRef={collapsibleRef}
          criticalWarningChartRef={criticalWarningChartRef}
        />
        {!showDragLeft && !showDragRight && (
          <TooltipContent
            content={t('common.width_adjuster')}
            className={styles.tooltip__top}
            position={'top'}
            size={'large'}
            title="test"
            left={tagPosition}
            top={280}
          />
        )}
        {showDragRight && (
          <TooltipContent
            content={
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 200,
                  height: 'fit-content',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'center', gap: 6 }}
                >
                  <span>{t('common.drag_to_right')}</span>
                  <ArrowForwardCircleFill />
                </div>
                <div style={{}}>
                  <span
                    style={{
                      fontSize: 16,
                      wordBreak: 'break-word',
                      whiteSpace: 'wrap',
                    }}
                  >
                    {t('common.drag_to_right_2')}
                    {/* Widen the Critical and Warning Alarms Chart View */}
                  </span>
                </div>
              </div>
            }
            position={'right'}
            className={styles.tooltip__right}
            size={'large'}
            title="test"
            left={950}
            top={160}
          />
        )}
        {showDragLeft && (
          <TooltipContent
            content={
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 200,
                  height: 'fit-content',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'center', gap: 6 }}
                >
                  <ArrowBackCircleFill />
                  <span>{t('common.drag_to_left')}</span>
                </div>
                <div style={{}}>
                  <span
                    style={{
                      fontSize: 16,
                      wordBreak: 'break-word',
                      whiteSpace: 'wrap',
                    }}
                  >
                    {t('common.drag_to_left_2')}
                    {/* Widen the Abnormal Parameters Chart View */}
                  </span>
                </div>
              </div>
            }
            position={'left'}
            size={'large'}
            title="test"
            left={60}
            top={150}
          />
        )}
        {!showDragLeft && !showDragRight && (
          <TooltipContent
            content={t('common.asset_name')}
            position={'top'}
            className={styles.tooltip__top}
            size={'large'}
            title="test"
            left={widthScaler ? widthScaler * 200 : 240}
            top={330}
          />
        )}
        {!showDragLeft && !showDragRight && (
          <TooltipContent
            content={t('common.total_alarm')}
            className={styles.tooltip__bottom}
            position={'bottom'}
            size={'large'}
            title="test"
            left={widthScaler ? widthScaler * 240 : 120}
            top={90}
          />
        )}
        {!showDragLeft && !showDragRight && (
          <TooltipContent
            content={t('common.legend')}
            className={styles.tooltip__bottom}
            position={'bottom'}
            size={'large'}
            title="test"
            left={900}
            top={0}
          />
        )}
      </div>
    </Legend>
  );
};

export default AlarmLegend;
