import {
  Checkbox,
  COLOR,
  Container,
  InfoTooltip,
  Loading,
  ThemeContext,
  useToggle,
} from '@digital-twin/components';
import { BarChartH } from '@digital-twin/icons';
import { getDataZoomHandler } from '@digital-twin/utils';
import { format } from 'date-fns';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { memo, useContext } from 'react';

import { TEarlyWarningAndDiagnosticTrend } from '../api';
import styles from './early-warning-and-diagnostic-trend.module.scss';

type EarlyWarningAndDiagnosticTrendProps = {
  className?: string;
  data: TEarlyWarningAndDiagnosticTrend[];
  disableToggler?: boolean;
  isLoading: boolean;
};

const MAXIMUM_BAR_TO_SHOW = 7;

export const EarlyWarningAndDiagnosticTrend = memo(
  ({ className, data, disableToggler, isLoading }: EarlyWarningAndDiagnosticTrendProps) => {
    const [showDegradation, toggleShowDegradation] = useToggle(true);
    const [showCompoundDegradation, toggleShowCompoundDegradation] = useToggle(true);

    const {
      colors: {
        neutralTextTitleHeading,
        persimmon500,
        backgroundDefault,
        brandBorderDefaultPrimary,
        backgroundHighest,
        borderDefault,
      },
    } = useContext(ThemeContext);

    // 1. Define the available series configurations
    const allSeries = [
      {
        name: 'Degradation',
        type: 'bar',
        stack: 'total',
        barWidth: '32px',
        data: data.map((val) => {
          // If Compound is hidden OR value is 0, give this bar rounded corners
          if (!showCompoundDegradation || val.compoundDegradation === 0) {
            return {
              value: val.degradation,
              itemStyle: { borderRadius: [6, 6, 0, 0] },
            };
          }
          return val.degradation;
        }),
        itemStyle: {
          color: persimmon500,
        },
      },
      {
        name: 'Compound Degradation',
        type: 'bar',
        stack: 'total',
        barWidth: '32px',
        itemStyle: {
          color: '#2CB5FF',
          borderRadius: [6, 6, 0, 0],
        },
        data: data.map((val) => val.compoundDegradation),
      },
    ];

    // 2. Filter series based on toggles
    const activeSeries = allSeries.filter((s) => {
      if (s.name === 'Degradation') return showDegradation;
      if (s.name === 'Compound Degradation') return showCompoundDegradation;
      return true;
    });

    const xAxisData = data.map((val) => val.day);

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        confine: true,
        backgroundColor: backgroundDefault,
        borderColor: brandBorderDefaultPrimary,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        textStyle: {
          color: COLOR.neutralTextTitleHeading,
        },
        formatter: function (params: unknown[]) {
          // Safe check: ensure params has data
          if (!params || params.length === 0) return '';

          const dateHeader = format(new Date((params[0] as { name: string }).name), 'dd MMM yyyy');

          let res = `<span>${dateHeader}</span>`;

          // 2. Sort the params by seriesName (Ascending)
          // We cast to 'any' here to access seriesName, similar to how you handled it inside the loop
          const sortedParams = (params as any[]).sort((a, b) => {
            const nameA = a.seriesName || '';
            const nameB = b.seriesName || '';
            return nameA.localeCompare(nameB);
          });

          // 3. Add the series rows using the sorted array
          sortedParams.forEach((item: any) => {
            res += `<br/>${item.marker} ${item.seriesName} <span style="float:right;font-weight:bold;margin-left:20px">${item.value}</span>`;
          });

          return res;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: xAxisData.length > MAXIMUM_BAR_TO_SHOW ? '8%' : '3%',
        top: '7%',
        containLabel: true,
        show: false,
      },
      // dataZoom: [
      //   {
      //     id: 'dataZoomX',
      //     type: 'inside',
      //     xAxisIndex: [0],
      //     filterMode: 'filter',
      //     start: 0,
      //     end:
      //       xAxisData.length > MAXIMUM_BAR_TO_SHOW
      //         ? (MAXIMUM_BAR_TO_SHOW / xAxisData.length) * 100
      //         : 100,
      //     maxSpan:
      //       xAxisData.length > MAXIMUM_BAR_TO_SHOW
      //         ? (MAXIMUM_BAR_TO_SHOW / xAxisData.length) * 100
      //         : 100,
      //     minSpan:
      //       xAxisData.length > MAXIMUM_BAR_TO_SHOW
      //         ? (MAXIMUM_BAR_TO_SHOW / xAxisData.length) * 100
      //         : 100,
      //   },
      // ],

      dataZoom: getDataZoomHandler({
        bottomPadding: '5%',
        maxValue: MAXIMUM_BAR_TO_SHOW,
        minValue: 0,
        show: xAxisData.length > MAXIMUM_BAR_TO_SHOW ? true : false,
        colors: {
          primary: backgroundHighest,
          secondary: borderDefault,
        },
      }),
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLine: {
          lineStyle: {
            color: neutralTextTitleHeading,
          },
        },
        axisTick: {
          alignWithLabel: true,
          lineStyle: { color: neutralTextTitleHeading },
          interval: 0,
        },
        axisLabel: {
          color: neutralTextTitleHeading,
          fontSize: 12,
          //@ts-expect-error unknown type
          formatter: function (value) {
            return format(new Date(value), 'dd/MM');
          },
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: {
          color: neutralTextTitleHeading,
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: neutralTextTitleHeading, // Or any color you prefer
          },
        },
        axisTick: {
          show: true,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)',
            type: 'dashed',
          },
        },
      },
      series: activeSeries,
    };

    return (
      <Container
        icon={<BarChartH />}
        title={'Early Warning & Diagnostic Trend'}
        titleProps={{
          style: {
            width: 0,
            flexGrow: 1,
          },
        }}
        className={className}
        titleSuffixIcon={
          <InfoTooltip
            title={'Early Warning & Diagnostic Trend'}
            content={
              <>
                <span>Displays the trend of early warning and diagnostic events over</span>
                <br />
                <span>time, enabling users to monitor changes and emerging</span>
                <br />
                <span>patterns within the selected period.</span>
              </>
            }
          />
        }
        rightTopComponent={
          <div className={styles.SeriesTogglerContainer}>
            <Checkbox
              value={showDegradation}
              checked={showDegradation}
              onChange={disableToggler ? undefined : toggleShowDegradation}
              label="Degradation"
              checkboxClassName={styles.SeriesTogglerContainer__Degradation}
            />
            <Checkbox
              value={showCompoundDegradation}
              checked={showCompoundDegradation}
              onChange={disableToggler ? undefined : toggleShowCompoundDegradation}
              label="Compound Degradation"
              checkboxClassName={styles.SeriesTogglerContainer__CompoundDegradation}
            />
          </div>
        }
      >
        <Loading isLoading={isLoading} />
        <ReactECharts
          notMerge={true}
          option={option}
          style={{
            height: '100%',
            width: '100%',
            overflow: 'hidden',
          }}
        />
      </Container>
    );
  },
  (prev, next) => {
    return JSON.stringify(prev) === JSON.stringify(next);
  }
);
