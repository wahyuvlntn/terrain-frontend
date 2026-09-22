import { InfoTooltip, ThemeContext } from '@digital-twin/components';
import { useQueries, useQuery } from '@tanstack/react-query';
import { connect } from 'echarts';
import ReactECharts, { EChartsInstance, EChartsOption } from 'echarts-for-react';
import { useContext, useMemo } from 'react';

import { PLANT_SYSTEM } from '../../digital-twin/digital-twin.bms';
import {
  getEvents,
  getFrames,
  SIM_EVENT_KIND_LABEL,
  SIM_QUERY,
  SimEvent,
  SimEventKind,
  SimFrames,
} from '../api/simulation.api';
import { tagOf } from '../simulation.catalog';
import {
  CHART_FONT,
  chartAxis,
  chartLegend,
  chartTooltip,
  ThemeColors,
  variantPalette,
} from '../simulation.charts';
import styles from '../simulation.module.scss';
import { Empty, errorText } from './job-bits';

type Metric = {
  param: string;
  title: string;
  unit: string;
  digits: number;
  /** constraint of the post-analysis: above (high) or below (low) the limit counts */
  limit?: { value: number; side: 'high' | 'low'; label: string };
};

/** Plant-level points compared between variants (CHW plant controller CHWS_01), one chart each */
const METRICS: Metric[] = [
  { param: 'plant_kw', title: 'Plant power', unit: 'kW', digits: 0 },
  { param: 'plant_eff', title: 'Plant efficiency', unit: 'kW/RT', digits: 3 },
  // the post-analysis counts a supply above 8.5 °C for > 10 min as a critical violation
  {
    param: 'chws_temp',
    title: 'CHW supply temperature',
    unit: '°C',
    digits: 2,
    limit: { value: 8.5, side: 'high', label: 'max 8.5 °C' },
  },
  // and a riser ΔP below 80 kPa for > 10 min
  {
    param: 'riser_dp',
    title: 'Riser ΔP',
    unit: 'kPa',
    digits: 0,
    limit: { value: 80, side: 'low', label: 'min 80 kPa' },
  },
];

/** Events marked on the trends: what was done to the plant during the run */
const MARKER_KINDS: SimEventKind[] = ['control', 'fault_injected', 'fault_cleared', 'trip'];

type Line = { name: string; data: [number, number | null][] };

const linesOf = (frames: SimFrames | undefined, param: string): Line['data'] => {
  // no start time: nothing was recorded
  if (!frames?.t0) return [];
  const t0 = Date.parse(frames.t0);
  const step = frames.stepS * 1000;
  return (frames.series[PLANT_SYSTEM]?.[param] ?? []).map((v, i) => [t0 + i * step, v]);
};

/** Stretches of a series beyond a limit, as [from, to] times */
const violations = (data: Line['data'], limit: Metric['limit']) => {
  if (!limit) return [];
  const out: [number, number][] = [];
  let from: number | null = null;
  data.forEach(([t, v], i) => {
    const bad = v !== null && (limit.side === 'high' ? v > limit.value : v < limit.value);
    if (bad && from === null) from = t;
    if ((!bad || i === data.length - 1) && from !== null) {
      out.push([from, t]);
      from = null;
    }
  });
  return out;
};

const markerColor = (colors: Partial<ThemeColors>, kind: SimEventKind) =>
  kind === 'trip'
    ? colors.conditionCriticalSecondary
    : kind === 'fault_injected' || kind === 'fault_cleared'
      ? colors.conditionWarningSecondary
      : colors.brandBorderLightPrimary;

const MetricChart = ({
  metric,
  lines,
  palette,
  markers,
  group,
}: {
  metric: Metric;
  lines: Line[];
  palette: string[];
  markers: SimEvent[];
  group: string;
}) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const limit = metric.limit;
    return {
      animation: false,
      color: palette,
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0, right: 0 },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'axis',
        valueFormatter: (v: unknown) =>
          typeof v === 'number' ? `${v.toFixed(metric.digits)} ${metric.unit}` : '--',
      },
      xAxis: {
        type: 'time',
        splitNumber: 6,
        axisLabel: { ...axis.label, hideOverlap: true, formatter: '{HH}:{mm}' },
        axisLine: axis.line,
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: metric.unit,
        nameTextStyle: { ...axis.label, align: 'right' },
        axisLabel: axis.label,
        splitLine: axis.split,
      },
      series: lines.map((l, i) => ({
        type: 'line',
        name: l.name,
        data: l.data,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 2 },
        emphasis: { focus: 'series' },
        // time in violation of the constraint, shaded per variant
        markArea: limit
          ? {
              silent: true,
              itemStyle: { color: colors.conditionCriticalSecondary, opacity: 0.12 },
              data: violations(l.data, limit).map(([from, to]) => [{ xAxis: from }, { xAxis: to }]),
            }
          : undefined,
        markLine:
          i === 0
            ? {
                symbol: 'none',
                animation: false,
                data: [
                  ...(limit
                    ? [
                        {
                          yAxis: limit.value,
                          silent: true,
                          lineStyle: { color: colors.conditionCriticalSecondary, type: 'dashed' },
                          label: {
                            formatter: limit.label,
                            color: colors.neutralTextCaption,
                            fontSize: CHART_FONT.tick,
                            position: 'insideEndTop',
                          },
                        },
                      ]
                    : []),
                  ...markers.map((e) => ({
                    xAxis: Date.parse(e.ts),
                    lineStyle: { color: markerColor(colors, e.kind), type: 'dotted', width: 1 },
                    label: { show: false },
                    emphasis: {
                      label: {
                        show: true,
                        position: 'insideEndTop',
                        color: colors.neutralTextTitleHeading,
                        fontSize: CHART_FONT.tick,
                        formatter: `${SIM_EVENT_KIND_LABEL[e.kind]}${
                          e.assetAlias ? ` · ${tagOf(e.assetAlias)}` : ''
                        }${e.variant ? ` (${e.variant})` : ''}`,
                      },
                    },
                  })),
                ],
              }
            : undefined,
      })),
    };
  }, [metric, lines, palette, colors, markers]);
  return (
    <figure className={styles.chart}>
      <figcaption>{metric.title}</figcaption>
      <ReactECharts
        option={option}
        style={{ height: 240 }}
        notMerge
        lazyUpdate
        onChartReady={(chart: EChartsInstance) => {
          // one tooltip / axis pointer across the four charts
          chart.group = group;
          connect(group);
        }}
      />
    </figure>
  );
};

/**
 * Plant power, efficiency, CHW supply temperature and riser ΔP of every variant over the run,
 * from the recorded frames of the plant controller; what was done to the plant (controls,
 * faults, trips) as dotted markers, time beyond a constraint shaded.
 */
export const VariantCharts = ({ jobId, variants }: { jobId: number; variants: string[] }) => {
  const { colors } = useContext(ThemeContext);
  const names = variants.length ? variants : [''];
  const queries = useQueries({
    queries: names.map((v) => ({
      queryKey: [...SIM_QUERY.frames(jobId, v), PLANT_SYSTEM],
      queryFn: () => getFrames({ jobId, variant: v || undefined, aliases: [PLANT_SYSTEM] }),
      // the run has finished: its frames don't change
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    })),
  });
  const markerQuery = useQuery({
    queryKey: [...SIM_QUERY.events(jobId), 'markers'],
    queryFn: () => getEvents({ jobId, kinds: MARKER_KINDS, limit: 500 }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const markers = useMemo(() => markerQuery.data?.events ?? [], [markerQuery.data]);
  const version = queries.map((q) => q.dataUpdatedAt).join();
  const palette = variantPalette(colors);
  // biome-ignore lint/correctness/useExhaustiveDependencies: query results are a new array every render; version says when they changed
  const byMetric = useMemo(
    () =>
      METRICS.map((m) =>
        queries.map((q, i) => ({
          name: q.data?.variant ?? names[i],
          data: linesOf(q.data, m.param),
        }))
      ),
    [version]
  );

  const failed = queries.find((q) => q.isError);
  if (failed) return <Empty error>Trends unavailable: {errorText(failed.error)}</Empty>;
  if (queries.some((q) => q.isLoading)) return <Empty>Loading the recorded run…</Empty>;
  if (byMetric.every((lines) => lines.every((l) => !l.data.length))) {
    return <Empty>No plant data was recorded for this run</Empty>;
  }
  return (
    <div className={styles.trends}>
      <div className={styles.trends__legend}>
        <span>Dotted lines: controls, faults and trips</span>
        <span>Shaded: beyond a constraint</span>
        <InfoTooltip
          title="Trends"
          content="Hover a dotted line to see the action. Constraints: CHW supply above 8.5 °C or riser ΔP below 80 kPa for more than 10 min fails a run."
        />
      </div>
      <div className={styles.trends__grid}>
        {METRICS.map((m, i) => (
          <MetricChart
            key={m.param}
            metric={m}
            lines={byMetric[i]}
            palette={palette}
            markers={markers}
            group={`simulation-${jobId}`}
          />
        ))}
      </div>
    </div>
  );
};
