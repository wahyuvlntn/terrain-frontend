import { SettingsPreferences } from '@digital-twin/icons';
import { addDays, formatStringToObjectDate, t } from '@digital-twin/utils';
import clsx from 'clsx';
import { DataZoomComponentOption, EChartsOption } from 'echarts';
import { format, graphic } from 'echarts/core';
import { MarkArea2DDataItemOption } from 'echarts/types/src/component/marker/MarkAreaModel';
import ReactECharts from 'echarts-for-react';
import { CSSProperties, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import {
  Button,
  CONDITION_COLOR,
  CONDITION_ICON,
  ConditionEnum,
  Loading,
  ThemeContext,
} from '../../../../index';
import { TGetLatestData, TGetParameterData } from './parameter-area-chart.api';
import { TRefetchInterval, useParameterAreaChart } from './parameter-area-chart.hook';
import styles from './parameter-area-chart.module.scss';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

interface ParameterAreaChartProps {
  unit?: string;
  historicalUnit?: string;
  parameterName: string;
  onSettingClick?: () => void;
  parameterId: number;
  date: string;
  fetch?: boolean;
  latestDummy?: TGetLatestData;
  historicalDummy?: TGetParameterData;
  maxYAxis?: number;
  showEditButton?: boolean;
  refetchInterval?: TRefetchInterval;
  wrapperStyle?: CSSProperties;
  chartWidth?: string;
  highlightAbnormalities?: boolean;
  highlightTimestamps?: string[];
}

const YAXIS_ZOOM_PADDING = 0.2;

export const ParameterAreaChart = ({
  unit: unitDummy,
  parameterName,
  onSettingClick,
  parameterId,
  date,
  fetch = true,
  latestDummy,
  historicalDummy,
  maxYAxis,
  showEditButton,
  historicalUnit,
  refetchInterval,
  wrapperStyle,
  chartWidth,
  highlightAbnormalities,
  highlightTimestamps,
}: ParameterAreaChartProps) => {
  const {
    latest: latestFetch,
    historical: historicalFetch,
    isLoading,
  } = useParameterAreaChart({
    parameterId,
    date,
    enabled: fetch,
    refetchInterval,
  });

  const latest = latestDummy ?? latestFetch;
  const historical = historicalDummy ?? historicalFetch;
  const unit = unitDummy ?? latestFetch?.unit ?? '';

  const {
    colors: {
      statusIdlePrimary,
      statusUnplanned_downPrimary,
      neutralTextTitleHeading,
      conditionCriticalPrimary,
      brandBorderDarkPrimary,
    },
  } = useContext(ThemeContext);

  const chartRef = useRef<ReactECharts>(null);

  const markArea: MarkArea2DDataItemOption[] = useMemo(() => {
    return (
      historical?.markArea?.map((item) => [
        {
          [item.from === 'min' ? 'y' : 'yAxis']: item.from,
          itemStyle: {
            color:
              item.type === ConditionEnum.enum.WARNING
                ? statusIdlePrimary
                : statusUnplanned_downPrimary,
            opacity: 0.5,
          },
        },
        { [item.to === 'max' ? 'y' : 'yAxis']: item.to },
      ]) ?? []
    );
  }, [historical?.markArea, statusIdlePrimary, statusUnplanned_downPrimary]);

  if (highlightAbnormalities && historical?.data?.length) {
    const upperLimit =
      latest?.warningThreshold.upperLimit ?? latest?.criticalThreshold.upperLimit ?? null;
    const lowerLimit =
      latest?.warningThreshold.lowerLimit ?? latest?.criticalThreshold.lowerLimit ?? null;

    const isOutOfLimit = (value: number) => {
      if (upperLimit !== null && value > upperLimit) return true;
      if (lowerLimit !== null && value < lowerLimit) return true;
      return false;
    };

    const MARGIN_MS = 7 * 60 * 1000;
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;

    const pushRange = () => {
      if (rangeStart !== null && rangeEnd !== null) {
        markArea.push([
          {
            xAxis: rangeStart - MARGIN_MS,
            itemStyle: {
              color: conditionCriticalPrimary,
              opacity: 0.8,
            },
          },
          { xAxis: rangeEnd + MARGIN_MS },
        ]);
      }
    };

    for (const point of historical.data) {
      const ts = +new Date(point.timestamp);
      if (point.value !== null && isOutOfLimit(point.value)) {
        if (rangeStart === null) {
          rangeStart = ts;
        }
        rangeEnd = ts;
      } else {
        pushRange();
        rangeStart = null;
        rangeEnd = null;
      }
    }
    pushRange();
  }

  const maxXAxis = +addDays(
    datePattern.test(date) ? formatStringToObjectDate(date) : new Date(date),
    1
  );

  const yMax = historical?.yMax === null ? undefined : historical?.yMax;
  const yMin = historical?.yMin === null ? undefined : historical?.yMin;

  const option: EChartsOption = useMemo(() => {
    return {
      animation: false,
      dataZoom: [{ type: 'inside', filterMode: 'none', xAxisIndex: 0 }],
      xAxis: {
        min: datePattern.test(date) ? +formatStringToObjectDate(date) : +new Date(date),
        max: maxXAxis,
        type: 'time',
        axisLabel: {
          showMaxLabel: true,
          formatter: function (value, _index) {
            return value === maxXAxis ? '24:00' : '{HH}:{mm}';
          },
        },
        axisLine: {
          show: true,
          lineStyle: { color: neutralTextTitleHeading },
        },
        splitNumber: 10,
        minorTick: {
          show: true,
          splitNumber: 2,
        },
        boundaryGap: [0, 0],
      },
      yAxis: {
        type: 'value',
        splitNumber: 4,
        max: maxYAxis ?? yMax,
        min: yMin,
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
        axisLine: {
          show: true,
          lineStyle: { color: neutralTextTitleHeading },
        },
      },
      textStyle: {
        color: neutralTextTitleHeading,
        fontFamily: 'Roboto',
      },
      series: [
        {
          type: 'line',
          data: historical?.data?.map((dataPoint) => [dataPoint.timestamp, dataPoint.value]),
          symbolSize: 6,
          showSymbol: false,
          lineStyle: { color: neutralTextTitleHeading, width: 2 },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(60, 228, 251, 0.40)',
              },
              {
                offset: 1,
                color: 'rgba(60, 228, 251, 0.00)',
              },
            ]),
          },
          markArea: {
            data: markArea,
          },
          markLine: highlightTimestamps?.length
            ? {
                silent: true,
                label: { show: false },
                animation: false,
                symbol: ['none', 'none'],
                data: highlightTimestamps.map((ts) => ({
                  xAxis: +new Date(ts),
                  lineStyle: {
                    type: 'solid' as const,
                    color: brandBorderDarkPrimary,
                    width: 4,
                    opacity: 1,
                  },
                })),
              }
            : undefined,
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'none',
        },
        // params typedef (TopLevelFormatterParams) is not consistent with actual typedef
        // check this for actual params typedef: https://echarts.apache.org/en/option.html#tooltip.formatter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (params: any) {
          const value = params[0].data[1];
          const tooltipUnit = historicalUnit ?? unit;
          let bgColor = CONDITION_COLOR[ConditionEnum.enum.NORMAL];
          if (
            (latest?.criticalThreshold.upperLimit &&
              value >= latest?.criticalThreshold.upperLimit) ||
            (latest?.criticalThreshold.lowerLimit && value <= latest?.criticalThreshold.lowerLimit)
          )
            bgColor = CONDITION_COLOR[ConditionEnum.enum.CRITICAL];
          else if (
            (latest?.warningThreshold.upperLimit && value >= latest?.warningThreshold.upperLimit) ||
            (latest?.warningThreshold.lowerLimit && value <= latest?.warningThreshold.lowerLimit)
          )
            bgColor = CONDITION_COLOR[ConditionEnum.enum.WARNING];
          if (value === null) return '';
          if (+new Date(params[0].data[0]) < +formatStringToObjectDate(date)) return '';
          return `<div style="background:${bgColor};padding:4px 8px;color:white;border-radius: 2px">${value}${
            tooltipUnit.length > 1 ? ' ' : ''
          }${tooltipUnit} | ${format.formatTime('hh:mm', params[0].data[0])}</div>`;
        },
        padding: 0,
        borderWidth: 0,
      },
      grid: {
        top: 10,
        left: 65,
        right: 18,
        bottom: 20,
        containLabel: false,
      },
    };
  }, [
    brandBorderDarkPrimary,
    date,
    highlightTimestamps,
    historical?.data,
    historicalUnit,
    latest?.criticalThreshold.lowerLimit,
    latest?.criticalThreshold.upperLimit,
    latest?.warningThreshold.lowerLimit,
    latest?.warningThreshold.upperLimit,
    markArea,
    maxXAxis,
    maxYAxis,
    neutralTextTitleHeading,
    unit,
    yMax,
    yMin,
  ]);

  const conditionLabel =
    latest?.condition === ConditionEnum.enum.OFFLINE ? 'OFF_OFFLINE' : latest?.condition;

  const handleChartZoom = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dataZoomObj: any) => {
      let isFullyZoomOut = false;
      if (!historical) return;

      if (dataZoomObj && dataZoomObj.batch && dataZoomObj.batch.length > 0) {
        const zoomFilter = dataZoomObj.batch[0];
        isFullyZoomOut = zoomFilter.start === 0 && zoomFilter.end === 100;
      }

      const currentOption = chartRef.current?.getEchartsInstance().getOption() as EChartsOption;

      const rawData = historical.data;

      if (!currentOption || !currentOption.dataZoom) {
        return;
      }

      const dataZoom = currentOption?.dataZoom as DataZoomComponentOption[];
      const startValue = dataZoom[0].startValue as number;
      const endValue = dataZoom[0].endValue as number;

      const startIndex = rawData.findIndex((d) => new Date(d.timestamp).getTime() >= startValue);
      const endIndex = rawData.findIndex((d) => new Date(d.timestamp).getTime() > endValue);

      const slicedData = rawData.slice(startIndex, endIndex);

      // console.log(slicedData);

      const { min, max } = slicedData.reduce(
        (acc, curr) => {
          acc.min = Math.min(acc.min, curr.value!);
          acc.max = Math.max(acc.max, curr.value!);
          return acc;
        },
        { min: Infinity, max: -Infinity }
      );

      const { calculatedMinY, calculatedMaxY } = {
        calculatedMinY: Math.floor(min - min * YAXIS_ZOOM_PADDING),
        calculatedMaxY: Math.ceil(max + max * YAXIS_ZOOM_PADDING),
      };

      chartRef.current?.getEchartsInstance().setOption({
        ...option,
        yAxis: {
          ...option.yAxis,
          max: isFullyZoomOut ? (historical?.yMax ?? undefined) : calculatedMaxY,
          min: isFullyZoomOut ? (historical?.yMin ?? undefined) : calculatedMinY,
        },
      });
    },
    [historical, option]
  );

  useEffect(() => {
    setTimeout(() => {
      const chart = chartRef.current?.getEchartsInstance();
      if (chart && option) {
        chart.on('datazoom', handleChartZoom);

        return () => {
          chart.off('datazoom', handleChartZoom);
        };
      }
    }, 50);
  }, [handleChartZoom, option]);

  return (
    <div className={styles['parameter-area-chart']} style={wrapperStyle}>
      <Loading isLoading={isLoading} />
      <div className={styles.header}>
        <h3>{parameterName}</h3>
        {showEditButton ? (
          <Button
            icon={<SettingsPreferences />}
            onClick={onSettingClick}
            className={styles['setting-button']}
          />
        ) : null}
      </div>
      <div className={styles.data}>
        <div
          className={clsx(styles['current-value'], {
            [styles.normal]: latest?.condition === ConditionEnum.enum.NORMAL,
            [styles.warning]: latest?.condition === ConditionEnum.enum.WARNING,
            [styles.critical]: latest?.condition === ConditionEnum.enum.CRITICAL,
            [styles.offline]: latest?.condition === ConditionEnum.enum.OFFLINE,
          })}
        >
          <div className={styles.condition}>
            {latest ? CONDITION_ICON[latest.condition] : null}
            <div>{t(`common.${conditionLabel?.toLowerCase()}`) || ''}</div>
          </div>
          <div className={styles['value-container']}>
            <span className={styles.value} title={latest?.value ?? '-'}>
              {latest?.value ?? '-'}
            </span>
            <span className={styles.unit}>{unit}</span>
          </div>
        </div>
        <div className={styles['historical']}>
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: '100%', width: chartWidth || '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
