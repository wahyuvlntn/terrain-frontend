import { ThemeContext } from '@digital-twin/components';
import { color as echartsColor } from 'echarts';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useMemo } from 'react';

import { TwinTrend } from '../../api/digital-twin.api';
import { notRunningSpans } from './overlay-utils';

type Limits = { lower: number | null; upper: number | null };

/** y range of the data, widened to nearby limits only (far limits would flatten the trend) */
const yRange = (values: number[], limits: (number | null | undefined)[]) => {
  if (!values.length) return {};
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const span = Math.max(hi - lo, Math.abs(hi) * 0.02, 1e-6);
  limits.forEach((l) => {
    if (l === null || l === undefined) return;
    if (l > hi && l - hi < span * 2.5) hi = l;
    if (l < lo && lo - l < span * 2.5) lo = l;
  });
  const pad = (hi - lo) * 0.12 || span * 0.5;
  return { min: +(lo - pad).toPrecision(6), max: +(hi + pad).toPrecision(6) };
};

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** a theme colour with alpha (hex or rgb); unparsable colours are returned unchanged */
const withAlpha = (color: string, alpha: number) => echartsColor.modifyAlpha(color, alpha) || color;

/** a "Not running" label needs about this share of the plot width */
const BAND_LABEL_MIN_SHARE = 0.18;

/**
 * markArea pairs shading the stretches in which the unit was not running as grey vertical bands
 * (x only, so they span the full plot height). Narrow bands stay unlabelled.
 */
const notRunningBands = (points: TwinTrend['data'], color: string, alpha: number) => {
  const spans = notRunningSpans(points);
  if (!spans.length) return [];
  const extent = Date.parse(points[points.length - 1].timestamp) - Date.parse(points[0].timestamp);
  return spans.map((s) => [
    {
      xAxis: s.start,
      itemStyle: { color: withAlpha(color, alpha), borderWidth: 0 },
      label: {
        show: extent > 0 && (s.end - s.start) / extent >= BAND_LABEL_MIN_SHARE,
        formatter: 'Not running',
        position: 'insideTop',
        distance: 3,
        color,
        fontSize: 12,
      },
    },
    { xAxis: s.end },
  ]);
};

const useAxisStyle = () => {
  const { colors } = useContext(ThemeContext);
  return useMemo(() => {
    const label = { color: colors.neutralTextCaption, fontSize: 12 };
    return {
      colors,
      // time axis: fewer, non-overlapping HH:mm ticks; value axis: no odd min/max labels
      timeLabel: { ...label, hideOverlap: true, formatter: '{HH}:{mm}' },
      axisLabel: { ...label, showMinLabel: false, showMaxLabel: false },
      splitLine: {
        lineStyle: { color: colors.borderLight, type: 'dashed' as const, opacity: 0.6 },
      },
      tooltip: {
        trigger: 'axis' as const,
        confine: true,
        backgroundColor: colors.backgroundDefault,
        borderColor: colors.borderDefault,
        textStyle: { color: colors.neutralTextTitleHeading, fontSize: 13 },
      },
    };
  }, [colors]);
};

type TrendChartProps = {
  points: TwinTrend['data'];
  unit: string;
  warning: Limits;
  critical: Limits;
  height?: number;
};

/** Live trend with warning / critical threshold lines; stretches the unit was not running are shaded */
export const TrendChart = ({ points, unit, warning, critical, height = 150 }: TrendChartProps) => {
  const { colors, timeLabel, axisLabel, splitLine, tooltip } = useAxisStyle();
  const option = useMemo<EChartsOption>(() => {
    const data = points
      .filter((p) => p.value !== null)
      .map((p) => [Date.parse(p.timestamp), p.value as number]);
    const limit = (v: number | null, color: string, name: string) =>
      v === null
        ? []
        : [
            {
              yAxis: v,
              name,
              lineStyle: { color, type: 'dashed', width: 1 },
              label: { formatter: `${name} ${v}`, color, fontSize: 12, position: 'insideEndTop' },
            },
          ];
    return {
      animation: false,
      grid: { left: 52, right: 12, top: 18, bottom: 26 },
      tooltip: {
        ...tooltip,
        valueFormatter: (v: unknown) => (isNumber(v) ? `${v.toFixed(2)} ${unit}` : '--'),
      },
      xAxis: {
        type: 'time',
        splitNumber: 4,
        axisLabel: timeLabel,
        axisLine: { lineStyle: { color: colors.borderDefault } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...yRange(
          data.map((d) => d[1]),
          [warning.lower, warning.upper, critical.lower, critical.upper]
        ),
        axisLabel,
        splitLine,
      },
      series: [
        {
          type: 'line',
          name: unit,
          data,
          showSymbol: false,
          lineStyle: { color: colors.accentInfoSecondary, width: 1.6 },
          itemStyle: { color: colors.accentInfoSecondary },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${colors.accentInfoSecondary}55` },
                { offset: 1, color: `${colors.accentInfoSecondary}00` },
              ],
            },
          },
          markArea: {
            silent: true,
            data: notRunningBands(points, colors.neutralTextCaption, 0.1) as never,
          },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [
              ...limit(warning.upper, colors.conditionWarningPrimary, 'W'),
              ...limit(warning.lower, colors.conditionWarningPrimary, 'W'),
              ...limit(critical.upper, colors.conditionCriticalSecondary, 'C'),
              ...limit(critical.lower, colors.conditionCriticalSecondary, 'C'),
            ],
          },
        },
      ],
    };
  }, [points, unit, warning, critical, colors, timeLabel, axisLabel, splitLine, tooltip]);
  return <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />;
};

type SpcChartProps = {
  points: TwinTrend['data'];
  spc: TwinTrend['spc'];
  violations: TwinTrend['violations'];
  unit: string;
  height?: number;
};

/**
 * Individuals control chart: centre line, ±1/2σ zones, control and spec limits, rule violations.
 * Only running samples are plotted (the line breaks where the unit was not running, and those
 * stretches are shaded); the y range follows the running samples and the limits.
 */
export const SpcChart = ({ points, spc, violations, unit, height = 160 }: SpcChartProps) => {
  const { colors, timeLabel, axisLabel, splitLine, tooltip } = useAxisStyle();
  const option = useMemo<EChartsOption>(() => {
    // a [t, null] item per not-running sample breaks the line and keeps the whole window on the
    // time axis; running samples without a value are skipped (the line bridges them as before)
    const data: [number, number | null][] = [];
    const values: number[] = [];
    points.forEach((p) => {
      if (!p.running) data.push([Date.parse(p.timestamp), null]);
      else if (p.value !== null) {
        data.push([Date.parse(p.timestamp), p.value]);
        values.push(p.value);
      }
    });
    const limits = [spc.ucl, spc.lcl, spc.usl, spc.lsl];
    const cl = spc.centerLine;
    const sg = spc.sigma;
    const line = (
      v: number | null,
      color: string,
      name: string,
      type: 'solid' | 'dashed' | 'dotted'
    ) =>
      v === null
        ? []
        : [
            {
              yAxis: v,
              lineStyle: { color, type, width: 1 },
              label: {
                formatter: `${name} ${v.toFixed(2)}`,
                color,
                fontSize: 12,
                position: 'insideEndTop',
              },
            },
          ];
    const zone = (k: number, opacity: number) =>
      cl !== null && sg !== null
        ? [
            [
              { yAxis: cl - k * sg, itemStyle: { color: colors.conditionNormalPrimary, opacity } },
              { yAxis: cl + k * sg },
            ],
          ]
        : [];
    return {
      animation: false,
      grid: { left: 52, right: 12, top: 18, bottom: 26 },
      tooltip: {
        ...tooltip,
        valueFormatter: (v: unknown) => (isNumber(v) ? `${v.toFixed(3)} ${unit}` : 'not running'),
      },
      xAxis: {
        type: 'time',
        splitNumber: 4,
        axisLabel: timeLabel,
        axisLine: { lineStyle: { color: colors.borderDefault } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        // no running sample at all: frame the limits instead of an empty axis
        ...yRange(values.length ? values : limits.filter(isNumber), limits),
        axisLabel,
        splitLine,
      },
      series: [
        {
          type: 'line',
          name: 'Value',
          data,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { color: colors.accentInfoSecondary, width: 1.2 },
          itemStyle: { color: colors.accentInfoSecondary },
          markArea: {
            silent: true,
            data: [
              ...zone(2, 0.07),
              ...zone(1, 0.1),
              ...notRunningBands(points, colors.neutralTextCaption, 0.16),
            ] as never,
          },
          markLine: {
            symbol: 'none',
            silent: true,
            data: [
              ...line(cl, colors.conditionNormalSecondary, 'CL', 'solid'),
              ...line(spc.ucl, colors.conditionCriticalSecondary, 'UCL', 'dashed'),
              ...line(spc.lcl, colors.conditionCriticalSecondary, 'LCL', 'dashed'),
              ...line(spc.usl, colors.conditionWarningSecondary, 'USL', 'dotted'),
              ...line(spc.lsl, colors.conditionWarningSecondary, 'LSL', 'dotted'),
            ],
          },
        },
        {
          type: 'scatter',
          name: 'Rule violation',
          data: violations.map((v) => [Date.parse(v.timestamp), v.value]),
          symbolSize: 7,
          itemStyle: {
            color: colors.conditionCriticalSecondary,
            borderColor: '#fff',
            borderWidth: 1,
          },
          z: 5,
        },
      ],
    };
  }, [points, spc, violations, unit, colors, timeLabel, axisLabel, splitLine, tooltip]);
  return <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />;
};
