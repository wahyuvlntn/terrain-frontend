import { Button, COLOR, ConditionEnum, Loading, ThemeContext } from '@digital-twin/components';
import { SettingsPreferences } from '@digital-twin/icons';
import { addDays, formatStringToObjectDate } from '@digital-twin/utils';
import { DataZoomComponentOption, EChartsOption } from 'echarts';
import { format } from 'echarts/core';
import { MarkArea2DDataItemOption } from 'echarts/types/src/component/marker/MarkAreaModel';
import ReactECharts from 'echarts-for-react';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import styles from './spc-line-chart.module.scss';
import { TSpcData } from './type';

interface SPCLineChartProps {
  unit: string;
  parameterName: string;
  date: string;
  onSettingClick?: () => void;
  data: TSpcData;
  showEditButton?: boolean;
  timestampFrom?: string;
  timestampTo?: string;
  onRestore?: () => void;
  isLoading?: boolean;
  wrapperStyle?: React.CSSProperties;
  showHeader?: boolean;
  dataWrapperStyle?: React.CSSProperties;
  historicalWrapperStyle?: React.CSSProperties;
  chartWidth?: string;
  highlightAbnormalities?: boolean;
  highlightTimestamps?: string[];
}

const YAXIS_ZOOM_PADDING = 0.2;

export const SPCLineChart = ({
  unit,
  parameterName,
  date,
  onSettingClick,
  data,
  showEditButton,
  timestampFrom,
  timestampTo,
  onRestore,
  isLoading,
  wrapperStyle,
  showHeader = true,
  dataWrapperStyle,
  historicalWrapperStyle,
  chartWidth,
  highlightAbnormalities = true,
  highlightTimestamps,
}: SPCLineChartProps) => {
  const {
    colors: {
      statusUnplanned_downPrimary,
      statusIdlePrimary,
      statusRunningPrimary,
      neutralTextTitleHeading,
      conditionCriticalPrimary,
      conditionCriticalSecondary,
      pelorous500,
      brandBorderDarkPrimary,
    },
  } = useContext(ThemeContext);

  const maxYAxis = data?.yMax ?? undefined;
  const minYAxis = data?.yMin ?? undefined;

  const getItemColor = useCallback(
    (itemType: string): string => {
      if (itemType === ConditionEnum.enum.NORMAL) {
        return statusRunningPrimary;
      }
      if (itemType === ConditionEnum.enum.WARNING) {
        return statusIdlePrimary;
      }
      return statusUnplanned_downPrimary;
    },
    [statusIdlePrimary, statusRunningPrimary, statusUnplanned_downPrimary]
  );

  const markArea: MarkArea2DDataItemOption[] = useMemo(() => {
    return (
      data?.markArea.map((item) => [
        {
          [item.from === 'min' ? 'y' : 'yAxis']: item.from,
          xAxis: item.start ? +new Date(item.start) : undefined,
          itemStyle: {
            opacity: 0.5,
            color: getItemColor(item.type),
          },
        },
        {
          [item.to === 'max' ? 'y' : 'yAxis']: item.to,
          xAxis: item.end ? +new Date(item.end) : undefined,
        },
      ]) ?? []
    );
  }, [data, getItemColor]);

  if (timestampFrom && timestampTo)
    markArea.push([
      {
        xAxis: +new Date(timestampFrom),
        itemStyle: {
          color: conditionCriticalPrimary,
          opacity: 0.7,
        },
      },
      { xAxis: +new Date(timestampTo) },
    ]);

  if (highlightAbnormalities && data?.data?.length) {
    const ucl = typeof data.metrics?.ucl === 'number' ? data.metrics.ucl : null;
    const usl = typeof data.metrics?.usl === 'number' ? data.metrics.usl : null;
    const lcl = typeof data.metrics?.lcl === 'number' ? data.metrics.lcl : null;
    const lsl = typeof data.metrics?.lsl === 'number' ? data.metrics.lsl : null;
    const upperLimit = ucl ?? usl;
    const lowerLimit = lcl ?? lsl;

    const isOutOfLimit = (value: number) => {
      if (upperLimit !== null && value > upperLimit) return true;
      if (lowerLimit !== null && value < lowerLimit) return true;
      return false;
    };

    const isOffline = (ts: number) => {
      const ranges = data.offlineRanges ?? [];

      let lo = 0,
        hi = ranges.length - 1;

      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const r = ranges[mid];

        if (ts < r.start) hi = mid - 1;
        else if (ts >= r.end) lo = mid + 1;
        else return true;
      }
      return false;
    };

    data.offlineRanges;

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

    for (const point of data.data) {
      const ts = +new Date(point.timestamp);
      if (point.value !== null && isOutOfLimit(point.value) && !isOffline(ts)) {
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

  const chartRef = useRef<ReactECharts>(null);

  const minXAxis = +formatStringToObjectDate(date);
  const maxXAxis = +addDays(formatStringToObjectDate(date), 1);

  const visualMap = useMemo(() => {
    return timestampFrom && timestampTo
      ? {
        show: false,
        dimension: 0,
        outOfRange: {
          color: pelorous500,
        },
        pieces: [
          {
            min: +new Date(timestampFrom),
            max: +new Date(timestampTo),
            color: conditionCriticalSecondary,
          },
        ],
      }
      : {
        show: false,
        dimension: 0,
        pieces: [
          {
            min: minXAxis,
            max: maxXAxis,
            color: pelorous500,
          },
        ],
      };
  }, [conditionCriticalSecondary, maxXAxis, minXAxis, pelorous500, timestampFrom, timestampTo]);

  const customValues = [
    data?.metrics?.ucl,
    data?.metrics?.lcl,
    data?.metrics?.usl,
    data?.metrics?.lsl,
    data?.metrics?.grandMean,
  ].filter((data) => typeof data === 'number');

  const option: EChartsOption = useMemo(() => {
    return {
      animation: false,
      xAxis: {
        min: minXAxis,
        max: maxXAxis,
        type: 'time',
        axisLabel: {
          showMaxLabel: true,
          formatter: (value) => (value === maxXAxis ? '24:00' : '{HH}:{mm}'),
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
        max: maxYAxis,
        min: minYAxis,
        axisLabel: {
          hideOverlap: true,
          color: neutralTextTitleHeading,
          // customValues: customValues.length
          //   ? customValues.map((data) => Math.round(Number(data)))
          //   : undefined,
        },
        splitLine: { show: false },
        axisLine: {
          show: true,
          lineStyle: { color: neutralTextTitleHeading },
        },
      },
      visualMap,
      textStyle: {
        color: neutralTextTitleHeading,
        fontFamily: 'Roboto',
      },
      dataZoom: [{ type: 'inside', filterMode: 'none', xAxisIndex: 0 }],
      series: [
        {
          type: 'line',
          data: data?.data.map((dataPoint) => [+new Date(dataPoint.timestamp), dataPoint.value]),
          symbolSize: 6,
          lineStyle: { width: 2 },
          markLine: {
            silent: true,
            label: { show: false },
            animation: false,
            lineStyle: {
              type: 'dashed',
              color: neutralTextTitleHeading,
              opacity: 0.2,
            },
            symbol: ['none', 'none'],
            data: [
              ...customValues.map((data) => ({
                yAxis: String(data),
              })),
              ...(highlightTimestamps?.map((ts) => ({
                xAxis: +new Date(ts),
                lineStyle: {
                  type: 'solid' as const,
                  color: brandBorderDarkPrimary,
                  width: 4,
                  opacity: 1,
                },
              })) ?? []),
            ],
          },
          markArea: {
            silent: true,
            data: markArea,
          },
        },
      ],
      toolbox: {
        feature: {
          myRestore: {
            show: true,
            title: 'Restore',
            icon: 'M3.8,33.4 M47,18.9h9.8V8.7 M56.3,20.1 C52.1,9,40.5,0.6,26.8,2.1C12.6,3.7,1.6,16.2,2.1,30.6 M13,41.1H3.1v10.2 M3.7,39.9c4.2,11.1,15.8,19.5,29.5,18 c14.2-1.6,25.2-14.1,24.7-28.5',
            onclick: () => {
              chartRef.current?.getEchartsInstance()?.dispatchAction({
                type: 'dataZoom',
                start: 0,
                end: 100,
              });
              onRestore?.();
            },
          },
        },
        top: 10,
        right: 18,
        iconStyle: { borderColor: neutralTextTitleHeading },
        emphasis: { iconStyle: { borderColor: neutralTextTitleHeading } },
      },
      tooltip: {
        show: true,
        // params typedef (TopLevelFormatterParams) is not consistent with actual typedef
        // check this for actual params typedef: https://echarts.apache.org/en/option.html#tooltip.formatter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (params: any) {
          const value = params.data[1];
          const unitSpace = unit.length > 1 ? ' ' : '';

          return value === null
            ? ''
            : `<div style="background:${COLOR.pelorous500
            };padding:4px 8px;color:white;border-radius: 2px">${value}${unitSpace}${unit} | ${format.formatTime(
              'hh:mm',
              params.data[0]
            )}</div>`;
        },
        padding: 0,
        borderWidth: 0,
      },
      grid: {
        top: 10,
        left: 45,
        right: 18,
        bottom: 20,
        containLabel: false,
      },
    };
  }, [
    brandBorderDarkPrimary,
    customValues,
    data,
    highlightTimestamps,
    markArea,
    maxYAxis,
    minYAxis,
    maxXAxis,
    minXAxis,
    neutralTextTitleHeading,
    onRestore,
    unit,
    visualMap,
  ]);

  const handleChartZoom = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dataZoomObj: any) => {
      let isFullyZoomOut = false;

      if (dataZoomObj && dataZoomObj.batch && dataZoomObj.batch.length > 0) {
        const zoomFilter = dataZoomObj.batch[0];
        isFullyZoomOut = zoomFilter.start === 0 && zoomFilter.end === 100;
      }

      const currentOption = chartRef.current?.getEchartsInstance().getOption() as EChartsOption;

      const rawData = data.data;

      if (!currentOption || !currentOption.dataZoom) {
        return;
      }

      const dataZoom = currentOption?.dataZoom as DataZoomComponentOption[];
      const startValue = dataZoom[0].startValue as number;
      const endValue = dataZoom[0].endValue as number;

      const startIndex = rawData.findIndex((d) => new Date(d.timestamp).getTime() >= startValue);
      const endIndex = rawData.findIndex((d) => new Date(d.timestamp).getTime() > endValue);

      const slicedData = rawData.slice(startIndex, endIndex);

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
          max: isFullyZoomOut ? (data?.yMax ?? undefined) : calculatedMaxY,
          min: isFullyZoomOut ? (data?.yMin ?? undefined) : calculatedMinY,
        },
      });
    },
    [data, option]
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
    }, 50)

  }, [handleChartZoom, option]);

  return (
    <div className={styles['spc-line-chart']} style={wrapperStyle}>
      <Loading isLoading={isLoading ?? false} />
      {showHeader && (
        <div className={styles.header}>
          <h3>{parameterName}</h3>
          {showEditButton ? (
            <Button
              icon={<SettingsPreferences />}
              className={styles['setting-button']}
              onClick={onSettingClick}
            />
          ) : null}
        </div>
      )}
      <div className={styles.data} style={dataWrapperStyle}>
        <div className={styles['stats-list']}>
          <span className={styles['stats-term']}>UCL</span>
          <span className={styles['stats-colon']}>:</span>
          <span className={styles['stats-value']} title={data?.metrics?.ucl?.toString() ?? '-'}>
            {data?.metrics?.ucl ?? '-'}
          </span>

          <span className={styles['stats-term']}>LCL</span>
          <span className={styles['stats-colon']}>:</span>
          <span className={styles['stats-value']} title={data?.metrics?.lcl?.toString() ?? '-'}>
            {data?.metrics?.lcl ?? '-'}
          </span>

          <span className={styles['stats-term']}>X̿</span>
          <span className={styles['stats-colon']}>:</span>
          <span
            className={styles['stats-value']}
            title={data?.metrics?.grandMean?.toString() ?? '-'}
          >
            {data?.metrics?.grandMean ?? '-'}
          </span>

          <span className={styles['stats-term']}>StDev</span>
          <span className={styles['stats-colon']}>:</span>
          <span className={styles['stats-value']} title={data?.metrics?.stdDev?.toString() ?? '-'}>
            {data?.metrics?.stdDev ?? '-'}
          </span>

          <span className={styles['stats-term']}>Cp</span>
          <span className={styles['stats-colon']}>:</span>
          <span className={styles['stats-value']} title={data?.metrics?.cp?.toString() ?? '-'}>
            {data?.metrics?.cp ?? '-'}
          </span>

          <span className={styles['stats-term']}>Cpk</span>
          <span className={styles['stats-colon']}>:</span>
          <span className={styles['stats-value']} title={data?.metrics?.cpk?.toString() ?? '-'}>
            {data?.metrics?.cpk ?? '-'}
          </span>
        </div>
        <div className={styles.historical} style={historicalWrapperStyle}>
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
