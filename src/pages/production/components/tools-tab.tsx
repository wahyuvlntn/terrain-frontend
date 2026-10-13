import { Container, Dropdown, InfoTooltip, Loading, ThemeContext } from '@digital-twin/components';
import { BarChartH, ScheduleChart } from '@digital-twin/icons';
import { useQuery } from '@tanstack/react-query';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  getTimeline,
  PRODUCTION_POLL,
  PRODUCTION_QUERY,
  ProductionOverview,
  ProductionTool,
} from '../api/production.api';
import {
  chartAxis,
  chartLegend,
  chartTooltip,
  factorColors,
  stateColors,
} from '../production.charts';
import styles from '../production.module.scss';
import {
  E10_LABEL,
  TIMELINE_WINDOWS,
  TOOL_TYPE_LABEL,
  timelineWindow,
  toolTag,
  withFilters,
} from '../production.utils';
import { Empty } from './shared';
import { ToolTimeline } from './tool-timeline';

const TIMELINE_INFO =
  'Each tool: its SEMI E10 state (the band) and its runs above it. Hover a bar for the lot, step and times; drag or scroll to zoom the time axis.';

/** OEE factors of each tool (grouped bars) */
const ToolFactors = ({ tools }: { tools: ProductionTool[] }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const f = factorColors(colors);
    const axis = chartAxis(colors);
    const bar = (
      name: string,
      key: 'availability' | 'operational' | 'rate' | 'quality' | 'oee'
    ) => ({
      name,
      type: 'bar' as const,
      barMaxWidth: 10,
      itemStyle: { color: f[key], borderRadius: [2, 2, 0, 0] },
      data: tools.map((t) => t[key]),
    });
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0 },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => (typeof v === 'number' ? `${v.toFixed(1)} %` : '--'),
      },
      xAxis: {
        type: 'category',
        data: tools.map((t) => toolTag(t.alias)),
        axisLabel: { ...axis.axisLabel, interval: 0 },
        axisLine: axis.axisLine,
        axisTick: { show: false },
      },
      yAxis: { type: 'value', max: 100, ...axis },
      series: [
        bar('Availability', 'availability'),
        bar('Operational', 'operational'),
        bar('Rate', 'rate'),
        bar('Quality', 'quality'),
        bar('OEE', 'oee'),
      ],
    };
  }, [tools, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: 280, width: '100%' }} />
  );
};

/** OEE of each tool type with its factors */
const TypeOee = ({ byType }: { byType: ProductionOverview['byType'] }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const f = factorColors(colors);
    const axis = chartAxis(colors);
    const labels = byType.map((t) => `${TOOL_TYPE_LABEL[t.toolType]} (${t.tools})`);
    const series = (
      name: string,
      key: 'availability' | 'operational' | 'rate' | 'quality' | 'oee'
    ) => ({
      name,
      type: 'bar' as const,
      barMaxWidth: 12,
      itemStyle: { color: f[key], borderRadius: [0, 2, 2, 0] },
      data: byType.map((t) => t[key]),
    });
    return {
      animation: false,
      grid: { left: 8, right: 24, top: 36, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0 },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => (typeof v === 'number' ? `${v.toFixed(1)} %` : '--'),
      },
      xAxis: { type: 'value', max: 100, ...axis },
      yAxis: {
        type: 'category',
        data: labels,
        inverse: true,
        axisTick: { show: false },
        axisLine: axis.axisLine,
        axisLabel: { color: colors.neutralTextTitleHeading, fontSize: 13 },
      },
      series: [
        series('OEE', 'oee'),
        series('Availability', 'availability'),
        series('Operational', 'operational'),
        series('Rate', 'rate'),
        series('Quality', 'quality'),
      ],
    };
  }, [byType, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: 280, width: '100%' }} />
  );
};

type ToolsTabProps = {
  tools: ProductionTool[];
  overview?: ProductionOverview;
  now: number;
};

/** Tool time states and runs (Gantt), OEE by tool and by tool type */
export const ToolsTab = ({ tools, overview, now }: ToolsTabProps) => {
  const { colors } = useContext(ThemeContext);
  const [url, setUrl] = useSearchParams();
  const [hours, setHours] = useState(() => timelineWindow(url));
  // the window lives in the URL (assistant links, reload); the default is left out
  // biome-ignore lint/correctness/useExhaustiveDependencies: written on the window's change only
  useEffect(() => {
    const next = withFilters(url, [['timeline-window', hours, '24']]);
    if (next) setUrl(next, { replace: true });
  }, [hours]);
  const timeline = useQuery({
    queryKey: PRODUCTION_QUERY.timeline(Number(hours)),
    queryFn: () => getTimeline(Number(hours)),
    refetchInterval: PRODUCTION_POLL.timeline,
    meta: { toastId: 'productionTimeline' },
  });
  const states = stateColors(colors);
  // one row per tool, the time axis below
  const chartHeight = Math.max(320, (timeline.data?.tools.length ?? tools.length) * 44 + 48);
  return (
    <div className={styles.scroll}>
      <Container
        data-nav-section="timeline"
        title="Tool time states and runs"
        icon={<ScheduleChart />}
        titleSuffixIcon={<InfoTooltip title="Timeline" content={TIMELINE_INFO} />}
        background="none"
        className={styles.panel}
        contentWrapperProps={{ style: { overflow: 'hidden', gap: 8, minHeight: 0 } }}
        rightTopComponent={
          <Dropdown
            label="Window"
            labelPosition="left"
            variant="medium"
            background="dark"
            value={hours}
            options={TIMELINE_WINDOWS}
            onChange={setHours}
            wrapperClassName={styles.filter}
          />
        }
      >
        <div className={styles.legendRow}>
          {Object.entries(E10_LABEL).map(([k, label]) => (
            <span key={k}>
              <i style={{ background: states[k] }} />
              {label}
            </span>
          ))}
          <span>
            <i style={{ background: colors.brandSurfaceDefaultPrimary }} />
            Run
          </span>
          <span>
            <i style={{ background: colors.accentInfoSecondary }} />
            Run in process
          </span>
        </div>
        <div style={{ position: 'relative', height: chartHeight }}>
          <Loading isLoading={timeline.isFetching && !timeline.data} />
          {timeline.data?.tools.length ? (
            <ToolTimeline data={timeline.data} now={now} height={chartHeight} />
          ) : !timeline.isLoading ? (
            <Empty>No timeline data</Empty>
          ) : null}
        </div>
      </Container>
      <div className={styles.grid2}>
        <Container
          data-nav-section="oee-by-tool"
          title="OEE by tool"
          icon={<BarChartH />}
          background="none"
          className={styles.panel}
        >
          {tools.length ? <ToolFactors tools={tools} /> : <Empty>No process tools</Empty>}
        </Container>
        <Container
          data-nav-section="oee-by-type"
          title="OEE by tool type"
          icon={<BarChartH />}
          background="none"
          className={styles.panel}
        >
          {overview?.byType.length ? (
            <TypeOee byType={overview.byType} />
          ) : (
            <Empty>No process tools</Empty>
          )}
        </Container>
      </div>
    </div>
  );
};
