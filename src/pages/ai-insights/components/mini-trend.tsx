import { ThemeContext } from '@digital-twin/components';
import { useQuery } from '@tanstack/react-query';
import { color as echartsColor } from 'echarts';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useMemo } from 'react';
import styles from '../ai-insights.module.scss';
import { fmtNum } from '../ai-insights.utils';
import { AI_INSIGHTS_POLL, AI_INSIGHTS_QUERY, getParameterTrend } from '../api/ai-insights.api';
import { Empty } from './shared';

/** Trend windows the endpoint serves (minutes, at most 7 days) */
const WINDOWS = [60, 240, 480, 1440, 4320, 10080];

/** Smallest window that shows the anomaly from a little before its start */
export const trendWindow = (startedAt: string, now: number) => {
  const needed = (now - Date.parse(startedAt)) / 60_000 + 30;
  return WINDOWS.find((w) => w >= needed) ?? WINDOWS[WINDOWS.length - 1];
};

const withAlpha = (c: string, a: number) => echartsColor.modifyAlpha(c, a) || c;

type MiniTrendProps = {
  parameterId: number;
  minutes: number;
  /** the anomalous stretch (epoch ms; end = now while active) */
  span: { start: number; end: number };
  expected: number | null;
  unit: string;
  height?: number;
};

/**
 * The logged values of the anomalous parameter around the anomaly: the anomalous stretch shaded,
 * the detector's expected value dashed, and the configured warning / critical limits.
 */
export const MiniTrend = ({
  parameterId,
  minutes,
  span,
  expected,
  unit,
  height = 170,
}: MiniTrendProps) => {
  const { colors } = useContext(ThemeContext);
  const query = useQuery({
    queryKey: AI_INSIGHTS_QUERY.trend(parameterId, minutes),
    queryFn: () => getParameterTrend(parameterId, minutes),
    placeholderData: undefined,
    refetchInterval: AI_INSIGHTS_POLL.trend,
    meta: { toastId: 'aiInsightsTrend' },
  });
  const trend = query.data?.id === parameterId ? query.data : undefined;

  const option = useMemo<EChartsOption | null>(() => {
    if (!trend) return null;
    const data = trend.data
      .filter((p) => p.value !== null)
      .map((p) => [Date.parse(p.timestamp), p.value as number]);
    if (!data.length) return null;
    const label = { color: colors.neutralTextCaption, fontSize: 12 };
    const shownUnit = unit || trend.unit;
    const limit = (v: number | null, color: string, name: string) =>
      v === null
        ? []
        : [
            {
              yAxis: v,
              name,
              lineStyle: { color, type: 'dashed' as const, width: 1 },
              label: { show: false },
            },
          ];
    const first = data[0][0];
    return {
      animation: false,
      grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: colors.backgroundDefault,
        borderColor: colors.borderDefault,
        textStyle: { color: colors.neutralTextTitleHeading, fontSize: 13 },
        valueFormatter: (v: unknown) =>
          typeof v === 'number' ? `${fmtNum(v, 2)} ${shownUnit}`.trim() : '--',
      },
      xAxis: {
        type: 'time',
        splitNumber: 4,
        axisLabel: { ...label, hideOverlap: true },
        axisLine: { lineStyle: { color: colors.borderDefault } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { ...label, showMinLabel: false, showMaxLabel: false },
        splitLine: { lineStyle: { color: colors.borderLight, type: 'dashed', opacity: 0.6 } },
      },
      series: [
        {
          name: trend.name,
          type: 'line',
          data,
          showSymbol: false,
          lineStyle: { width: 2, color: colors.brandSurfaceDefaultPrimary },
          itemStyle: { color: colors.brandSurfaceDefaultPrimary },
          markArea: {
            silent: true,
            data: [
              [
                {
                  xAxis: Math.max(span.start, first),
                  itemStyle: { color: withAlpha(colors.conditionWarningPrimary, 0.14) },
                  label: {
                    show: true,
                    formatter: 'Anomaly',
                    position: 'insideTop',
                    fontSize: 12,
                    color: colors.conditionWarningPrimary,
                  },
                },
                { xAxis: span.end },
              ],
            ],
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              ...(expected === null
                ? []
                : [
                    {
                      yAxis: expected,
                      name: 'Expected',
                      lineStyle: {
                        color: colors.neutralTextCaption,
                        type: 'dashed' as const,
                        width: 1,
                      },
                      label: {
                        formatter: `expected ${fmtNum(expected, 2)}`,
                        color: colors.neutralTextCaption,
                        fontSize: 12,
                        position: 'insideEndTop' as const,
                      },
                    },
                  ]),
              ...limit(trend.warning.upper, colors.conditionWarningPrimary, 'Warning high'),
              ...limit(trend.warning.lower, colors.conditionWarningPrimary, 'Warning low'),
              ...limit(trend.critical.upper, colors.conditionCriticalPrimary, 'Critical high'),
              ...limit(trend.critical.lower, colors.conditionCriticalPrimary, 'Critical low'),
            ],
          },
        },
      ],
    };
  }, [trend, colors, span.start, span.end, expected, unit]);

  if (!option) {
    return (
      <Empty className={styles.trend__empty}>
        {query.isError
          ? 'The trend could not be loaded.'
          : query.isLoading
            ? 'Loading the trend…'
            : 'No logged values in this window.'}
      </Empty>
    );
  }
  return <ReactECharts option={option} notMerge lazyUpdate style={{ height, width: '100%' }} />;
};
