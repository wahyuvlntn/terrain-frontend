import {
  Container,
  InfoTooltip,
  Loading,
  NextBtn,
  Popup,
  PrevBtn,
  ThemeContext,
} from '@digital-twin/components';
import { AreaChart2, Clock, ShowChart } from '@digital-twin/icons';
import { getDataZoomHandler } from '@digital-twin/utils';
import clsx from 'clsx';
import { LabelFormatterCallback } from 'echarts';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useEffect, useMemo, useState } from 'react';

import { InputDuration } from '../../../shared/components/lib/input/input-duration';
import { TIssuePattern, TIssuePatternDetail, TTimeseries } from '../api';
import styles from './issue-pattern.module.scss';

// const YEAR_OPTIONS = new Array(5).fill(0).map((_, index) => new Date().getFullYear() - index);

function getChartOption(
  data: TTimeseries[],
  colors: Record<string, string>,
  showXAxisLabel?: boolean,
  popupMode?: boolean
): EChartsOption {
  const xAxisData = data.map((item) => item.timestamp);

  return {
    grid: {
      left: popupMode ? '5%' : '13%', // Give room for the Y-axis labels
      right: '5%', // Small padding to prevent the line from hitting the edge
      top: '10%',
      bottom: xAxisData.length > 7 ? '15%' : '7%',
      containLabel: false, // Turn this off if you provide specific percentages
    },
    dataZoom: getDataZoomHandler({
      colors: {
        primary: colors.backgroundHighest,
        secondary: colors.borderDefault,
      },
      bottomPadding: '6%',
      maxValue: 7,
      minValue: 7,
      show: xAxisData.length > 7 ? true : false,
    }),
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      appendToBody: true,
      backgroundColor: colors.backgroundDefault,
      borderColor: colors.borderDefault,
      textStyle: {
        color: colors.neutralTextTitleHeading,
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      show: popupMode ? true : false,
      data: xAxisData,
      axisLabel: {
        color: colors.neutralTextTitleHeading,
        show: showXAxisLabel ?? false,
      },
      splitLine: {
        show: true,
        interval: 0,
        lineStyle: {
          color: 'rgb(255, 255, 255)',
          type: 'solid',
        },
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        color: colors.neutralTextTitleHeading,
        show: true,
        formatter: function (value: LabelFormatterCallback) {
          const suffixes = ['', 'k', 'm', 'b', 't'];
          const val = value as unknown as number;

          if (val < 1000) {
            return value.toString();
          }

          const exp = Math.floor(Math.log(val) / Math.log(1000));
          const formattedValue = (val / Math.pow(1000, exp)).toFixed(1);

          return formattedValue.replace(/\.0$/, '') + suffixes[exp];
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.3)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        data: data.map((item) => item.count),
        type: 'line',
        symbol: 'none',
        areaStyle: {
          color: '#2CB5FF',
          opacity: 0.6,
        },
        lineStyle: {
          color: '#2CB5FF', // Optional: set the line color to match
          width: 1,
        },
      },
    ],
  };
}

type IssuePatternDetailProps = {
  open: boolean;
  onClose: () => void;
  data?: TIssuePatternDetail;
  chartData?: TTimeseries[];
  start: Date;
  end: Date;
  period: string | undefined;
  onDateChange: (startDate: Date, endDate: Date, period: string | undefined) => void;
  isLoading: boolean;
};

type DateRange = {
  startDate: Date;
  endDate: Date;
  period: string | undefined;
};

export const IssuePatternDetail = ({
  onClose,
  open,
  data,
  start,
  end,
  onDateChange,
  period,
  chartData,
  isLoading,
}: IssuePatternDetailProps) => {
  const { colors } = useContext(ThemeContext);

  const periodDropdown = useMemo(() => {
    return [
      {
        label: 'Daily',
        value: 'daily',
      },
      {
        label: 'Weekly',
        value: 'weekly',
      },
      {
        label: 'Monthly',
        value: 'monthly',
      },
    ];
  }, []);

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: start,
    endDate: end,
    period: period,
  });

  useEffect(() => {
    setDateRange({
      startDate: start,
      endDate: end,
      period: period,
    });
  }, [start, end, period]);

  return (
    <Popup
      title={`Issue Pattern Details (${periodDropdown.find((p) => p.value === period)?.label})`}
      open={open}
      onClose={onClose}
      icon={<AreaChart2 />}
      rightTopComponent={
        <InputDuration
          periodOptions={periodDropdown}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={(startDate, endDate, period) => {
            setDateRange({
              startDate: startDate,
              endDate: endDate,
              period: period,
            });
            onDateChange(startDate, endDate, period);
            // onDateChange()
          }}
          selectedPeriod={dateRange.period}
        />
      }
    >
      <Container
        icon={<ShowChart />}
        title={`${data?.issueCode} • ${data?.issueName}`}
        className={styles.IssuePatternDetail__Container}
        contentWrapperProps={{
          className: styles.IssuePatternDetail,
        }}
        titleSuffixIcon={
          <InfoTooltip
            title={'Issue Pattern'}
            content={
              <>
                <span>Highlights recurring issue patterns and their behavior trends,</span>
                <br />
                <span>supporting faster diagnosis and early identification of</span>
                <br />
                <span>potential root causes.</span>
              </>
            }
          />
        }
      >
        <Loading isLoading={isLoading} />
        <ReactECharts
          option={getChartOption(chartData ?? [], colors, true, true)}
          style={{ height: '100%', width: '100%' }}
        />
        <div className={styles.IssuePatternDetail__Stats}>
          <div
            className={styles.IssuePatternDetail__LabelContainer}
          >{`Total Events: ${data?.totalCount ?? 0}`}</div>
          <div className={styles.IssuePatternDetail__LabelContainer}>{`MTTR: ${
            data?.mttr ?? 0
          }`}</div>
          <div className={styles.IssuePatternDetail__LabelContainer}>{`${
            data?.effectedUnit ?? 0
          } Effected Unit`}</div>
        </div>
      </Container>
    </Popup>
  );
};

type IssuePatternChartProps = TIssuePattern & {
  className?: string;
  onClick: () => void;
  data?: TTimeseries[];
};

const IssuePatternChart = ({
  data,
  issueCode,
  issueName,
  className,
  onClick,
}: IssuePatternChartProps) => {
  const { colors } = useContext(ThemeContext);

  return (
    <div className={clsx(styles.IssuePatternChart, className)}>
      <div className={styles.IssuePatternChart__Title}>
        <ShowChart />
        <span
          className={styles.IssuePatternChart__Title__Label}
        >{`${issueCode} • ${issueName}`}</span>
      </div>

      <div onDoubleClick={onClick} className={styles.IssuePatternChart__ChartContainer}>
        <ReactECharts
          option={getChartOption(data ?? [], colors, true)}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </div>
  );
};

type IssuePatternListProps = {
  className?: string;
  data: (TIssuePattern & { data: TTimeseries[] })[];
  onClick: (alarmCodeId: number, issueName: string) => void;
  page: number;
  totalPage: number;
  onChangePage: (page: number) => void;
  isLoading: boolean;
};

export const IssuePatternList = ({
  data,
  className,
  onClick,
  page,
  onChangePage,
  totalPage,
  isLoading,
}: IssuePatternListProps) => {
  return (
    <Container
      title={'Issue Pattern'}
      icon={<Clock />}
      className={className}
      titleSuffixIcon={
        <InfoTooltip
          title={'Issue Pattern'}
          content={
            <>
              <span>Highlights recurring issue patterns and their behavior trends,</span>
              <br />
              <span>supporting faster diagnosis and early identification of</span>
              <br />
              <span>potential root causes.</span>
            </>
          }
        />
      }
      contentWrapperProps={{
        className: styles.IssuePatternList,
      }}
      rightTopComponent={
        <div className={styles.IssuePatternList__Navigation}>
          <PrevBtn
            onClick={() => onChangePage(Math.max(page - 1, 1))}
            className={clsx(styles.NavBtn, page <= 1 && styles.Disabled)}
          />
          <NextBtn
            onClick={() => onChangePage(Math.min(page + 1, totalPage))}
            className={clsx(styles.NavBtn, page >= totalPage && styles.Disabled)}
          />
        </div>
      }
    >
      <Loading isLoading={isLoading} />
      <div className={styles.IssuePatternList__Grid}>
        {data.slice(0, 3).map((item) => (
          <IssuePatternChart
            key={`${item.alarmCodeId}-${item.issueName}`}
            {...item}
            onClick={() => onClick(item.alarmCodeId, item.issueName)}
            className={styles.IssuePatternList__ChartItem}
          />
        ))}
      </div>
      <div className={styles.IssuePatternList__Grid}>
        {data.slice(3, 6).map((item) => (
          <IssuePatternChart
            key={`${item.alarmCodeId}-${item.issueName}`}
            {...item}
            onClick={() => onClick(item.alarmCodeId, item.issueName)}
            className={styles.IssuePatternList__ChartItem}
          />
        ))}
      </div>
    </Container>
  );
};
