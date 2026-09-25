import { ThemeContext } from '@digital-twin/components';
import {
  type CustomSeriesRenderItemAPI,
  type CustomSeriesRenderItemParams,
  format as echartsFormat,
  graphic,
} from 'echarts';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useMemo } from 'react';

import type { ProductionTimeline } from '../api/production.api';
import { chartAxis, chartTooltip, stateColors } from '../production.charts';
import { E10_LABEL, fmtDuration, fmtTime, toolTag } from '../production.utils';

const ROW_PX = 44;
const esc = (s: string) => echartsFormat.encodeHTML(s);

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Gantt of the process tools over the window: per tool, its E10 state as a band (productive,
 * standby, scheduled / unscheduled down, non-scheduled) and its runs above it (lot and step;
 * wet bench batches show their lots, aborted runs are hatched red).
 */
export const ToolTimeline = ({
  data,
  now,
  height,
}: {
  data: ProductionTimeline;
  now: number;
  height: number;
}) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const states = stateColors(colors);
    const rows = data.tools.map((t) => toolTag(t.alias));
    const from = Date.parse(data.from);
    const to = Math.min(Date.parse(data.to), now);
    type Item = {
      kind: 'state' | 'run';
      row: number;
      a: number;
      b: number;
      label: string;
      tip: string;
    };
    const items: Item[] = [];
    data.tools.forEach((t, row) => {
      for (const iv of t.intervals) {
        const a = Date.parse(iv.start);
        const b = Date.parse(iv.end);
        items.push({
          kind: 'state',
          row,
          a,
          b,
          label: iv.status,
          tip: `<b>${esc(toolTag(t.alias))}</b> · ${esc(E10_LABEL[iv.status] ?? iv.status)}<br/>${fmtTime(iv.start)} → ${fmtTime(iv.end)} (${fmtDuration(b - a)})`,
        });
      }
      for (const r of t.runs) {
        const a = Date.parse(r.start);
        const b = r.end ? Date.parse(r.end) : now;
        items.push({
          kind: 'run',
          row,
          a,
          b,
          label: r.outcome === 'ABORTED' ? 'ABORTED' : r.end ? 'DONE' : 'RUNNING',
          tip: [
            `<b>${esc(r.lotCode)}</b> · ${esc(r.stepCode)}`,
            `${esc(toolTag(t.alias))} · ${r.wafers} wafers`,
            `${fmtTime(r.start)} → ${r.end ? fmtTime(r.end) : 'now'} (${fmtDuration(b - a)})`,
            r.outcome ? `Outcome: ${esc(r.outcome.toLowerCase())}` : 'In process',
          ].join('<br/>'),
        });
      }
    });
    const runColor = {
      DONE: colors.brandSurfaceDefaultPrimary,
      RUNNING: colors.accentInfoSecondary,
      ABORTED: states['UNPLANNED DOWN'],
    } as Record<string, string>;
    const renderItem = (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
      const it = items[params.dataIndex];
      const a = api.coord([it.a, it.row]);
      const b = api.coord([it.b, it.row]);
      const band = (api.size?.([0, 1]) as number[] | undefined)?.[1] ?? ROW_PX;
      const cs = params.coordSys as unknown as Rect;
      const top = a[1] - band * 0.36;
      const rect: Rect =
        it.kind === 'state'
          ? { x: a[0], y: a[1] + band * 0.14, width: Math.max(b[0] - a[0], 1), height: band * 0.16 }
          : { x: a[0], y: top, width: Math.max(b[0] - a[0] - 1, 1), height: band * 0.42 };
      const shape = graphic.clipRectByRect(rect, {
        x: cs.x,
        y: cs.y,
        width: cs.width,
        height: cs.height,
      });
      if (!shape) return null;
      const fill = it.kind === 'state' ? (states[it.label] ?? states.OFFLINE) : runColor[it.label];
      return {
        type: 'rect' as const,
        shape: { ...shape, r: it.kind === 'run' ? 2 : 0 },
        style: { fill, opacity: it.kind === 'run' && it.label === 'DONE' ? 0.85 : 1 },
      };
    };
    const axis = chartAxis(colors);
    const visible = Math.max(1, Math.floor((height - 40) / ROW_PX));
    const scroll = rows.length > visible;
    return {
      animation: false,
      grid: { left: 8, right: scroll ? 28 : 16, top: 8, bottom: 24, containLabel: true },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'weakFilter' },
        ...(scroll
          ? [
              {
                type: 'slider' as const,
                yAxisIndex: 0,
                right: 4,
                width: 12,
                startValue: 0,
                endValue: visible - 1,
                showDetail: false,
                brushSelect: false,
              },
            ]
          : []),
      ],
      tooltip: {
        ...chartTooltip(colors),
        formatter: (p: unknown) => {
          const i = (p as { dataIndex?: number }).dataIndex;
          return i === undefined ? '' : (items[i]?.tip ?? '');
        },
      },
      xAxis: {
        type: 'time',
        min: from,
        max: to,
        axisLabel: axis.axisLabel,
        axisLine: axis.axisLine,
        splitLine: { show: true, ...axis.splitLine },
      },
      yAxis: {
        type: 'category',
        data: rows,
        inverse: true,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: colors.neutralTextTitleHeading, fontSize: 13 },
      },
      series: [
        {
          type: 'custom',
          renderItem,
          encode: { x: [1, 2], y: 0 },
          data: items.map((it) => [it.row, it.a, it.b]),
        },
      ],
    };
  }, [data, now, colors, height]);
  return <ReactECharts option={option} notMerge lazyUpdate style={{ height, width: '100%' }} />;
};
