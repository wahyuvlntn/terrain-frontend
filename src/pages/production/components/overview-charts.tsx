import { ThemeContext } from '@digital-twin/components';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useMemo } from 'react';

import type { ProductionLosses, ProductionOverview, ProductionTrend } from '../api/production.api';
import {
  chartAxis,
  chartLegend,
  chartTooltip,
  factorColors,
  stateColors,
} from '../production.charts';
import { fmtHours, fmtTime, waterfall } from '../production.utils';

const HEIGHT = 280;

/**
 * OEE loss waterfall: total tool time, the E10 losses (non-scheduled, scheduled down, unscheduled
 * down, standby) and the E79 losses (rate, quality), down to the good time.
 */
export const LossWaterfall = ({ losses }: { losses: ProductionLosses }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const bars = waterfall(losses);
    const states = stateColors(colors);
    const f = factorColors(colors);
    const color: Record<string, string> = {
      totalH: colors.neutralTextCaption,
      nonScheduledH: states.OFFLINE,
      scheduledDownH: states['PLANNED DOWN'],
      unscheduledDownH: states['UNPLANNED DOWN'],
      standbyH: states.IDLE,
      rateLossH: f.rate,
      qualityLossH: f.quality,
      goodH: states.RUNNING,
    };
    const axis = chartAxis(colors);
    return {
      animation: false,
      grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: unknown) => {
          const list = p as { dataIndex: number }[];
          const b = bars[list[0]?.dataIndex ?? 0];
          const share =
            losses.totalH > 0 ? ` (${((100 * b.value) / losses.totalH).toFixed(1)} %)` : '';
          return `<b>${b.label}</b><br/>${fmtHours(b.value)}${share}`;
        },
      },
      xAxis: {
        type: 'category',
        data: bars.map((b) => b.label),
        axisLabel: {
          ...axis.axisLabel,
          interval: 0,
          hideOverlap: false,
          width: 72,
          overflow: 'break',
        },
        axisLine: axis.axisLine,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'h',
        nameTextStyle: { color: colors.neutralTextCaption },
        ...axis,
      },
      series: [
        {
          type: 'bar',
          stack: 'w',
          silent: true,
          itemStyle: { color: 'transparent' },
          data: bars.map((b) => b.base),
        },
        {
          type: 'bar',
          stack: 'w',
          barMaxWidth: 44,
          label: {
            show: true,
            position: 'top',
            color: colors.neutralTextTitleHeading,
            fontSize: 12,
            formatter: (p: { dataIndex: number }) => {
              const b = bars[p.dataIndex];
              return b.value > 0 ? fmtHours(b.value) : '';
            },
          },
          data: bars.map((b) => ({
            value: b.value,
            itemStyle: { color: color[b.key], borderRadius: [3, 3, 0, 0] },
          })),
        },
      ],
    };
  }, [losses, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: HEIGHT, width: '100%' }} />
  );
};

/** Daily (or per shift) OEE with its four factors */
export const OeeTrend = ({ trend }: { trend: ProductionTrend }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const f = factorColors(colors);
    const axis = chartAxis(colors);
    const fmt = trend.bucket === 'day' ? 'dd MMM' : 'dd MMM HH:mm';
    const x = trend.points.map((p) => fmtTime(p.ts, fmt));
    const line = (
      name: string,
      key: 'oee' | 'availability' | 'operational' | 'rate' | 'quality',
      width: number
    ) => ({
      name,
      type: 'line' as const,
      showSymbol: key === 'oee',
      symbolSize: 5,
      smooth: false,
      connectNulls: true,
      lineStyle: { width, color: f[key] },
      itemStyle: { color: f[key] },
      areaStyle: key === 'oee' ? { color: f.oee, opacity: 0.08 } : undefined,
      data: trend.points.map((p) => p[key]),
      z: key === 'oee' ? 3 : 2,
    });
    return {
      animation: false,
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0 },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'axis',
        valueFormatter: (v: unknown) => (typeof v === 'number' ? `${v.toFixed(1)} %` : '--'),
      },
      xAxis: {
        type: 'category',
        data: x,
        axisLabel: axis.axisLabel,
        axisLine: axis.axisLine,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: (v: { min: number }) => Math.max(0, Math.floor((v.min - 5) / 10) * 10),
        max: 100,
        ...axis,
      },
      series: [
        line('OEE', 'oee', 3),
        line('Availability', 'availability', 1.5),
        line('Operational', 'operational', 1.5),
        line('Rate', 'rate', 1.5),
        line('Quality', 'quality', 1.5),
      ],
    };
  }, [trend, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: HEIGHT, width: '100%' }} />
  );
};

/** Wafer outs (module) and wafer moves (tools) per day */
export const OutputChart = ({ trend }: { trend: ProductionTrend }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const fmt = trend.bucket === 'day' ? 'dd MMM' : 'dd MMM HH:mm';
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0 },
      tooltip: { ...chartTooltip(colors), trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: trend.points.map((p) => fmtTime(p.ts, fmt)),
        axisLabel: axis.axisLabel,
        axisLine: axis.axisLine,
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Wafers',
          nameTextStyle: { color: colors.neutralTextCaption },
          ...axis,
        },
        {
          type: 'value',
          name: 'Wafer moves',
          nameTextStyle: { color: colors.neutralTextCaption },
          axisLabel: axis.axisLabel,
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Wafer starts',
          type: 'bar',
          barMaxWidth: 16,
          itemStyle: { color: colors.neutralTextCaption, borderRadius: [3, 3, 0, 0] },
          data: trend.points.map((p) => p.waferStarts),
        },
        {
          name: 'Wafer outs',
          type: 'bar',
          barMaxWidth: 16,
          itemStyle: { color: colors.brandSurfaceDefaultPrimary, borderRadius: [3, 3, 0, 0] },
          data: trend.points.map((p) => p.waferOuts),
        },
        {
          name: 'Wafer moves',
          type: 'line',
          yAxisIndex: 1,
          showSymbol: false,
          lineStyle: { width: 2, color: colors.accentInfoSecondary },
          itemStyle: { color: colors.accentInfoSecondary },
          data: trend.points.map((p) => p.waferMoves),
        },
      ],
    };
  }, [trend, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: HEIGHT, width: '100%' }} />
  );
};

/** Lots in the fab by the process area of their current step and state */
export const WipChart = ({ wip }: { wip: ProductionOverview['wipByArea'] }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const states = stateColors(colors);
    const series = (name: string, key: 'queued' | 'processing' | 'hold', color: string) => ({
      name,
      type: 'bar' as const,
      stack: 'wip',
      barMaxWidth: 36,
      itemStyle: { color },
      emphasis: { focus: 'series' as const },
      data: wip.map((w) => w[key] || null),
    });
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0 },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: unknown) => {
          const list = p as {
            dataIndex: number;
            seriesName: string;
            value: number | null;
            color: string;
          }[];
          const w = wip[list[0]?.dataIndex ?? 0];
          const rows = list
            .filter((x) => x.value)
            .map((x) => `<span style="color:${x.color}">●</span> ${x.seriesName}: ${x.value} lots`);
          return [
            `<b>${w.name ?? w.area}</b> · ${w.wafers} wafers`,
            ...(rows.length ? rows : ['No lots']),
          ].join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        data: wip.map((w) => w.area),
        axisLabel: { ...axis.axisLabel, interval: 0, rotate: 30 },
        axisLine: axis.axisLine,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'lots',
        minInterval: 1,
        nameTextStyle: { color: colors.neutralTextCaption },
        ...axis,
      },
      series: [
        series('Queued', 'queued', states.IDLE),
        series('Processing', 'processing', states.RUNNING),

        series('On hold', 'hold', states['UNPLANNED DOWN']),
      ],
    };
  }, [wip, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: HEIGHT, width: '100%' }} />
  );
};

/** Line profile: lots by the mask layer / module of their current step, in flow order */
export const LineProfile = ({ wip }: { wip: ProductionOverview['wipByLayer'] }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const states = stateColors(colors);
    const series = (name: string, key: 'queued' | 'processing' | 'hold', color: string) => ({
      name,
      type: 'bar' as const,
      stack: 'wip',
      barMaxWidth: 14,
      itemStyle: { color },
      emphasis: { focus: 'series' as const },
      data: wip.map((w) => w[key] || null),
    });
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0 },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: unknown) => {
          const list = p as {
            dataIndex: number;
            seriesName: string;
            value: number | null;
            color: string;
          }[];
          const w = wip[list[0]?.dataIndex ?? 0];
          const rows = list
            .filter((x) => x.value)
            .map((x) => `<span style="color:${x.color}">●</span> ${x.seriesName}: ${x.value} lots`);
          return [
            `<b>${w.layer}</b>${w.module ? ` · ${w.module}` : ''}`,
            ...(rows.length ? rows : ['No lots']),
          ].join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        data: wip.map((w) => w.layer),
        axisLabel: { ...axis.axisLabel, interval: 0, rotate: 60, fontSize: 10 },
        axisLine: axis.axisLine,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'lots',
        minInterval: 1,
        nameTextStyle: { color: colors.neutralTextCaption },
        ...axis,
      },
      series: [
        series('Queued', 'queued', states.IDLE),
        series('Processing', 'processing', states.RUNNING),
        series('On hold', 'hold', states['UNPLANNED DOWN']),
      ],
    };
  }, [wip, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: HEIGHT, width: '100%' }} />
  );
};

/** Cycle time of the lots completed each day and the WIP in the fab */
export const CycleChart = ({ trend }: { trend: ProductionTrend }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const fmt = trend.bucket === 'day' ? 'dd MMM' : 'dd MMM HH:mm';
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0 },
      tooltip: { ...chartTooltip(colors), trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: trend.points.map((p) => fmtTime(p.ts, fmt)),
        axisLabel: axis.axisLabel,
        axisLine: axis.axisLine,
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'days',
          nameTextStyle: { color: colors.neutralTextCaption },
          ...axis,
        },
        {
          type: 'value',
          name: 'lots',
          minInterval: 1,
          nameTextStyle: { color: colors.neutralTextCaption },
          axisLabel: axis.axisLabel,
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Cycle time',
          type: 'line',
          connectNulls: true,
          symbolSize: 6,
          lineStyle: { width: 2, color: colors.brandSurfaceDefaultPrimary },
          itemStyle: { color: colors.brandSurfaceDefaultPrimary },
          data: trend.points.map((p) => p.cycleTimeDays),
        },
        {
          name: 'WIP',
          type: 'line',
          yAxisIndex: 1,
          showSymbol: false,
          step: 'end',
          lineStyle: { width: 2, color: colors.accentInfoSecondary },
          itemStyle: { color: colors.accentInfoSecondary },
          areaStyle: { color: colors.accentInfoSecondary, opacity: 0.08 },
          data: trend.points.map((p) => p.wipLots),
        },
      ],
    };
  }, [trend, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: HEIGHT, width: '100%' }} />
  );
};
