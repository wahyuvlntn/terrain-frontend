import {
  AlarmEnum,
  AssetStatusChart,
  AssetStatusChartDataPoint,
  ConditionEnum,
  Legend,
  ParameterAreaChart,
  RecentList,
  Selector,
  StatusEnum,
  TimeSeriesDataPoint,
  TooltipContent,
} from '@digital-twin/components';
import { AlertAlarm, Edit1 } from '@digital-twin/icons';
import AssetDummy from '@digital-twin/images/asset-dummy.webp';
import { formatDateHTMLInput, t } from '@digital-twin/utils';
import clsx from 'clsx';
import { format } from 'date-fns';

import { SPCLineChart, TSpcData } from '../../../components';
import { Alarm } from '../api/alarm-status';
import { AlarmErrorMessage } from './alarm-error-message';
import { AssetCard } from './asset-card';
import styles from './asset-legend.module.scss';
import { ALARM_LIST_COLUMNS } from './constant';
import { StatusCard } from './status-card';

const alarmData: Alarm[] = [
  {
    message: 'Joint position error (Axis 1, 2, & 3)',
    severity: AlarmEnum.enum.WARNING,
    timestamp: new Date(2023, 8, 27, 18).toISOString(),
  },
  {
    message: 'Low Lubricant',
    severity: AlarmEnum.enum.WARNING,
    timestamp: new Date(2023, 8, 27, 13, 20).toISOString(),
  },
  {
    message: 'Collision detected',
    severity: AlarmEnum.enum.WARNING,
    timestamp: new Date(2023, 8, 27, 10).toISOString(),
  },
  {
    message: 'Controller overheat',
    severity: AlarmEnum.enum.CRITICAL,
    timestamp: new Date(2023, 8, 26, 15, 30).toISOString(),
  },
  {
    message: 'Emergency sensor activated',
    severity: AlarmEnum.enum.WARNING,
    timestamp: new Date(2023, 8, 26, 14, 10).toISOString(),
  },
];

const statusData: AssetStatusChartDataPoint<StatusEnum>[] = [
  {
    start: new Date(2024, 0, 1).toISOString(),
    end: new Date(2024, 0, 1, 3).toISOString(),
    value: StatusEnum.enum.OFFLINE,
  },
  {
    start: new Date(2024, 0, 1, 3).toISOString(),
    end: new Date(2024, 0, 1, 3, 15).toISOString(),
    value: StatusEnum.enum['UNPLANNED DOWN'],
  },
  {
    start: new Date(2024, 0, 1, 3, 15).toISOString(),
    end: new Date(2024, 0, 1, 3, 30).toISOString(),
    value: StatusEnum.enum.IDLE,
  },
  {
    start: new Date(2024, 0, 1, 3, 30).toISOString(),
    end: new Date(2024, 0, 1, 21).toISOString(),
    value: StatusEnum.enum.RUNNING,
  },
  {
    start: new Date(2024, 0, 1, 21).toISOString(),
    end: new Date(2024, 0, 1, 22, 30).toISOString(),
    value: StatusEnum.enum.IDLE,
  },
  {
    start: new Date(2024, 0, 1, 22, 30).toISOString(),
    end: new Date(2024, 0, 1, 23).toISOString(),
    value: StatusEnum.enum.RUNNING,
  },
  {
    start: new Date(2024, 0, 1, 23).toISOString(),
    end: new Date(2024, 0, 1, 24).toISOString(),
    value: StatusEnum.enum['UNPLANNED DOWN'],
  },
];

const conditionData: AssetStatusChartDataPoint<ConditionEnum>[] = [
  {
    value: ConditionEnum.enum.OFFLINE,
    start: new Date(2024, 0, 1).toISOString(),
    end: new Date(2024, 0, 1, 3).toISOString(),
  },
  {
    value: ConditionEnum.enum.NORMAL,
    start: new Date(2024, 0, 1, 3).toISOString(),
    end: new Date(2024, 0, 1, 13, 45).toISOString(),
  },
  {
    value: ConditionEnum.enum.WARNING,
    start: new Date(2024, 0, 1, 13, 45).toISOString(),
    end: new Date(2024, 0, 1, 14).toISOString(),
  },
  {
    value: ConditionEnum.enum.NORMAL,
    start: new Date(2024, 0, 1, 14).toISOString(),
    end: new Date(2024, 0, 1, 16).toISOString(),
  },
  {
    value: ConditionEnum.enum.WARNING,
    start: new Date(2024, 0, 1, 16, 30).toISOString(),
    end: new Date(2024, 0, 1, 16, 45).toISOString(),
  },
  {
    value: ConditionEnum.enum.NORMAL,
    start: new Date(2024, 0, 1, 16, 45).toISOString(),
    end: new Date(2024, 0, 1, 17).toISOString(),
  },
  {
    value: ConditionEnum.enum.WARNING,
    start: new Date(2024, 0, 1, 17).toISOString(),
    end: new Date(2024, 0, 1, 22).toISOString(),
  },
  {
    value: ConditionEnum.enum.CRITICAL,
    start: new Date(2024, 0, 1, 22).toISOString(),
    end: new Date(2024, 0, 1, 24).toISOString(),
  },
];

const historicalData: TimeSeriesDataPoint[] = [
  { value: 0, timestamp: new Date(2024, 0, 1).toISOString() },
  { value: 2, timestamp: new Date(2024, 0, 1, 2, 30).toISOString() },
  { value: 20, timestamp: new Date(2024, 0, 1, 3).toISOString() },
  { value: 50, timestamp: new Date(2024, 0, 1, 5).toISOString() },
  { value: 15, timestamp: new Date(2024, 0, 1, 5, 30).toISOString() },
  { value: 30, timestamp: new Date(2024, 0, 1, 6).toISOString() },
  { value: 50, timestamp: new Date(2024, 0, 1, 10).toISOString() },
  { value: 7.5, timestamp: new Date(2024, 0, 1, 11).toISOString() },
  { value: 50, timestamp: new Date(2024, 0, 1, 12).toISOString() },
  { value: 35, timestamp: new Date(2024, 0, 1, 13).toISOString() },
  { value: 35, timestamp: new Date(2024, 0, 1, 16).toISOString() },
  { value: 50, timestamp: new Date(2024, 0, 1, 17).toISOString() },
  { value: 15, timestamp: new Date(2024, 0, 1, 17, 15).toISOString() },
  { value: 30, timestamp: new Date(2024, 0, 1, 18).toISOString() },
  { value: 35, timestamp: new Date(2024, 0, 1, 22).toISOString() },
  { value: 30, timestamp: new Date(2024, 0, 1, 23).toISOString() },
  { value: 35, timestamp: new Date(2024, 0, 1, 24).toISOString() },
];

const spcData: TSpcData = {
  metrics: {
    cpk: -0.67,
    lcl: 123.7,
    ucl: 134.8,
    cp: -0.14,
    grandMean: 128.2,
    stdDev: 129.3,
    lsl: 110,
    usl: 135,
  },
  data: [
    { value: 115, timestamp: new Date(2024, 0, 1).toISOString() },
    { value: 116, timestamp: new Date(2024, 0, 1, 1).toISOString() },
    { value: 119, timestamp: new Date(2024, 0, 1, 2).toISOString() },
    { value: 118, timestamp: new Date(2024, 0, 1, 3).toISOString() },
    { value: 119, timestamp: new Date(2024, 0, 1, 4).toISOString() },
    { value: 120, timestamp: new Date(2024, 0, 1, 5).toISOString() },
    { value: 121, timestamp: new Date(2024, 0, 1, 6).toISOString() },
    { value: 115, timestamp: new Date(2024, 0, 1, 7).toISOString() },
    { value: 123, timestamp: new Date(2024, 0, 1, 8).toISOString() },
    { value: 124, timestamp: new Date(2024, 0, 1, 9).toISOString() },
    { value: 125, timestamp: new Date(2024, 0, 1, 10).toISOString() },
    { value: 126, timestamp: new Date(2024, 0, 1, 11).toISOString() },
    { value: 110, timestamp: new Date(2024, 0, 1, 12).toISOString() },
    { value: 128, timestamp: new Date(2024, 0, 1, 13).toISOString() },
    { value: 129, timestamp: new Date(2024, 0, 1, 14).toISOString() },
    { value: 130, timestamp: new Date(2024, 0, 1, 15).toISOString() },
    { value: 131, timestamp: new Date(2024, 0, 1, 16).toISOString() },
    { value: 132, timestamp: new Date(2024, 0, 1, 17).toISOString() },
    { value: 115, timestamp: new Date(2024, 0, 1, 18).toISOString() },
    { value: 134, timestamp: new Date(2024, 0, 1, 19).toISOString() },
    { value: 135, timestamp: new Date(2024, 0, 1, 20).toISOString() },
    { value: 135, timestamp: new Date(2024, 0, 1, 21).toISOString() },
    { value: 135, timestamp: new Date(2024, 0, 1, 22).toISOString() },
    { value: 135, timestamp: new Date(2024, 0, 1, 23).toISOString() },
    { value: 135, timestamp: new Date(2024, 0, 1, 24).toISOString() },
  ],
  markArea: [
    {
      from: 110,
      to: 115,
      type: ConditionEnum.enum.CRITICAL,
    },
    {
      from: 115,
      to: 120,
      type: ConditionEnum.enum.WARNING,
    },
    {
      from: 120,
      to: 125,
      type: ConditionEnum.enum.NORMAL,
    },
    {
      from: 125,
      to: 130,
      type: ConditionEnum.enum.WARNING,
    },
    {
      from: 130,
      to: 135,
      type: ConditionEnum.enum.CRITICAL,
    },
  ],
  yMin: 110,
  yMax: 135,
};

const selector = {
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
  value: 'alarm',
  onChange: () => {},
};

export const AssetLegend = () => {
  const date = formatDateHTMLInput(new Date(2024, 0, 1));

  return (
    <Legend className={styles.legend}>
      <div
        className={clsx(styles.container, styles['asset-card'])}
        style={{
          marginTop: 132,
        }}
      >
        <AssetCard
          runningHours={999999}
          name={'VMC-008'}
          status={StatusEnum.enum.RUNNING}
          statusStartTime={new Date()}
          model={'Fanuc Robodrill 540 iD'}
          type={'Vertical Machining Center'}
          conditionStartTime={'2024-01-01'}
          condition={ConditionEnum.enum.NORMAL}
          warningCount={2}
          criticalCount={3}
          uptime={78}
          totalDuration={24}
          uptimeDuration={16}
          image={AssetDummy}
          variant={'details'}
          width={715}
        />
        <TooltipContent
          content={t('common.equipment_name')}
          position={'bottom'}
          size={'large'}
          className={styles['tooltip__eq-name']}
        />
        <TooltipContent
          content={t('common.equipment_photo')}
          position={'right'}
          size={'large'}
          className={styles['tooltip__eq-photo']}
          contentStyle={{
            whiteSpace: 'unset',
            width: 125,
          }}
        />
        <TooltipContent
          content={t('common.equipment_information')}
          position={'top'}
          size={'large'}
          className={styles['tooltip__eq-information']}
        />
        <TooltipContent
          content={'Accumulated Alarm Information'}
          position={'top'}
          size={'large'}
          className={styles['tooltip__eq-alarm-info']}
          contentStyle={{
            whiteSpace: 'unset',
            width: 200,
          }}
        />
        <TooltipContent
          content={
            <div className={styles.description}>
              <span>{t('common.current')}</span>
              <span>{t('common.equipment_status')}</span>
            </div>
          }
          position={'bottom-start'}
          size={'large'}
          className={styles['tooltip__eq-status']}
        />
        <TooltipContent
          content={t('common.current_condition_information')}
          position={'bottom'}
          size={'large'}
          className={styles['tooltip__eq-condition']}
        />
        <TooltipContent
          content={
            <div className={styles.description}>
              <span>Uptime</span>
            </div>
          }
          position={'left'}
          size={'large'}
          className={styles['tooltip__eq-oee']}
        />
      </div>
      <div
        style={{
          width: 715,
          marginTop: 100,
          position: 'relative',
        }}
      >
        <StatusCard running={200} plannedDown={100} unplannedDown={200} offline={200} />
        <TooltipContent
          content={'Total Feedback'}
          position={'left'}
          size={'large'}
          style={{
            right: -150,
            top: 100,
          }}
        />
      </div>

      <div
        className={clsx(styles.container, styles['recent-list'])}
        style={{
          marginTop: 100,
        }}
      >
        <RecentList
          icon={<AlertAlarm />}
          title={t('common.recent_alarm')}
          selectorProps={selector}
          informationTooltipContent={
            t('common.recent_alarm_info')
            // 'The last 5 equipment alarms occurred on the selected date'
          }
          style={{ width: 715 }}
          columns={ALARM_LIST_COLUMNS}
          data={alarmData.map((alarm) => {
            const timestamp = new Date(alarm.timestamp);
            return {
              id: `${alarm.timestamp}-${alarm.message}`,
              errorCode: <AlarmErrorMessage severity={alarm.severity} message={alarm.message} />,
              date: format(timestamp, 'dd MMM yyyy'),
              time: format(timestamp, 'HH:mm'),
            };
          })}
        />
        <TooltipContent
          content={'Tab Selector'}
          position={'left'}
          size={'large'}
          className={styles['tooltip__tab-selector']}
        />
        <TooltipContent
          content={t('common.warning')}
          position={'right'}
          size={'large'}
          className={styles['tooltip__warning']}
        />
        <TooltipContent
          content={t('common.critical')}
          position={'right'}
          size={'large'}
          className={styles['tooltip__critical']}
        />
      </div>
      <div
        className={clsx(styles.container, styles['recent-list-tab'])}
        style={{
          marginTop: 100,
        }}
      >
        <Selector {...selector} />
        <TooltipContent
          content={t('common.alarms')}
          position={'right'}
          size={'large'}
          className={styles['tooltip__alarm']}
        />
        <TooltipContent
          content={'Maintenance'}
          position={'left'}
          size={'large'}
          className={styles['tooltip__maintenance']}
        />
      </div>
      <div
        className={styles['container-2']}
        style={{
          marginTop: 100,
        }}
      >
        <AssetStatusChart
          status={statusData}
          conditions={conditionData}
          from={date}
          to={'2024-01-02'}
          width={1300}
          isLoading={false}
          excludedStatus={[StatusEnum.enum.DOWN, StatusEnum.enum.IDLE]}
        />
        <TooltipContent
          content={t('common.status_chart')}
          position={'bottom'}
          size={'large'}
          left={200}
          top={-40}
        />
        <TooltipContent
          content={t('common.condition_chart')}
          position={'bottom'}
          size={'large'}
          left={400}
          top={0}
        />
        <TooltipContent
          content={t('common.status_legend')}
          position={'top'}
          size={'large'}
          left={110}
          top={260}
        />
        <TooltipContent
          content={t('common.condition_legend')}
          position={'top'}
          size={'large'}
          left={550}
          top={260}
        />
      </div>
      <div
        className={clsx(styles.container, styles['legend-chart'])}
        style={{ marginTop: 145, width: '90%', alignSelf: 'center' }}
      >
        <ParameterAreaChart
          unit={'%'}
          parameterName={'Motor Load'}
          parameterId={0}
          date={date}
          fetch={false}
          latestDummy={{
            value: '39',
            condition: ConditionEnum.enum.NORMAL,
            criticalThreshold: { upperLimit: 55, lowerLimit: 10 },
            warningThreshold: { lowerLimit: 15, upperLimit: 50 },
            unit: '%',
          }}
          historicalDummy={{
            data: historicalData,
            markArea: [
              {
                from: 'min',
                to: 10,
                type: ConditionEnum.enum.CRITICAL,
              },
              {
                from: 10,
                to: 15,
                type: ConditionEnum.enum.WARNING,
              },
              {
                from: 50,
                to: 55,
                type: ConditionEnum.enum.WARNING,
              },
              {
                from: 55,
                to: 'max',
                type: ConditionEnum.enum.CRITICAL,
              },
            ],
          }}
          maxYAxis={60}
        />
        <TooltipContent
          content={t('common.real_time_value_condition')}
          position={'top'}
          size={'large'}
          left={0}
          top={210}
          contentStyle={{
            whiteSpace: 'wrap',
            width: 180,
          }}
        />
        <TooltipContent
          content={t('common.real_time_line_chart')}
          position={'top'}
          size={'large'}
          left={480}
          top={210}
        />
      </div>
      <div
        className={clsx(styles.container, styles['legend-chart'])}
        style={{
          marginTop: 145,
          marginBottom: 100,
          width: '90%',
          alignSelf: 'center',
        }}
      >
        <SPCLineChart
          unit={'A'}
          parameterName={'Motor Current'}
          date={date}
          data={spcData}
          showEditButton
        />
        <TooltipContent
          content={t('common.control_chart_metrics')}
          position={'top-start'}
          size={'large'}
          left={50}
          bottom={-50}
        />
        <TooltipContent
          content={t('common.control_chart')}
          position={'top'}
          size={'large'}
          left={480}
          bottom={-50}
        />
        <TooltipContent
          content={t('common.control_chart_configuration')}
          position={'bottom-end'}
          size={'large'}
          right={20}
          top={-50}
        />
      </div>
    </Legend>
  );
};
