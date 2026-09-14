import { ThemeContext } from '@digital-twin/components';
import {
  type CustomSeriesRenderItemAPI,
  type CustomSeriesRenderItemParams,
  format as echartsFormat,
  graphic,
} from 'echarts';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useMemo } from 'react';
import { assetTag, fmtDuration, fmtNum, fmtTime } from '../ai-insights.utils';
import type { Fault } from '../api/ai-insights.api';

type FaultTimelineProps = {
  faults: Fault[];
  /** window start (epoch ms); bars that started earlier are clipped */
  from: number;
  now: number;
  ruleName: (code: string) => string;
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** chart height (px): rows beyond it scroll with a slider */
  height: number;
};

const ROW_PX = 30;

/** tooltips are HTML: names and aliases from the database are escaped */
const esc = (s: string) => echartsFormat.encodeHTML(s);

/**
 * Gantt of detected faults: one row per rule and equipment, a bar from detection to clearance
 * (active faults run to now). Warning / critical colours with the severity in the tooltip;
 * cleared faults are drawn lighter. Clicking a bar selects the fault.
 */
export const FaultTimeline = ({
  faults,
  from,
  now,
  ruleName,
  selectedId,
  onSelect,
  height,
}: FaultTimelineProps) => {
  const { colors } = useContext(ThemeContext);

  const option = useMemo(() => {
    const rows: string[] = [];
    const rowOf = new Map<string, number>();
    const sorted = [...faults].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    for (const f of sorted) {
      const key = `${f.ruleCode} · ${assetTag(f.assetAlias)}`;
      if (!rowOf.has(key)) {
        rowOf.set(key, rows.length);
        rows.push(key);
      }
    }
    const start = Math.min(from, ...sorted.map((f) => Date.parse(f.startedAt)));
    const byId = new Map(sorted.map((f) => [f.id, f]));

    const data = sorted.map((f) => {
      const end = f.endedAt ? Date.parse(f.endedAt) : now;
      const color =
        f.severity === 'CRITICAL'
          ? colors.conditionCriticalPrimary
          : colors.conditionWarningPrimary;
      const selected = f.id === selectedId;
      return {
        value: [
          rowOf.get(`${f.ruleCode} · ${assetTag(f.assetAlias)}`) ?? 0,
          Date.parse(f.startedAt),
          end,
          f.id,
        ],
        itemStyle: {
          color,
          opacity: f.status === 'ACTIVE' ? 1 : 0.45,
          borderColor: selected ? colors.neutralTextTitleHeading : color,
          borderWidth: selected ? 2 : 0,
        },
      };
    });

    const renderItem = (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
      const row = api.value(0) as number;
      const a = api.coord([api.value(1), row]);
      const b = api.coord([api.value(2), row]);
      const band = (api.size?.([0, 1]) as number[] | undefined)?.[1] ?? ROW_PX;
      const h = Math.min(band * 0.6, 16);
      const cs = params.coordSys as unknown as {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      const shape = graphic.clipRectByRect(
        { x: a[0], y: a[1] - h / 2, width: Math.max(b[0] - a[0], 4), height: h },
        { x: cs.x, y: cs.y, width: cs.width, height: cs.height }
      );
      return shape
        ? {
            type: 'rect' as const,
            shape: { ...shape, r: 3 },
            style: api.style(),
            transition: ['shape'],
          }
        : null;
    };

    const label = { color: colors.neutralTextCaption, fontSize: 12 };
    // rows that do not fit scroll with a slider instead of shrinking
    const visible = Math.max(1, Math.floor((height - 40) / ROW_PX));
    const scroll = rows.length > visible;
    const opt: EChartsOption = {
      animation: false,
      grid: { left: 8, right: scroll ? 28 : 16, top: 8, bottom: 24, containLabel: true },
      dataZoom: scroll
        ? [
            {
              type: 'slider',
              yAxisIndex: 0,
              right: 4,
              width: 12,
              startValue: 0,
              endValue: visible - 1,
              showDetail: false,
              brushSelect: false,
              borderColor: colors.borderDefault,
              fillerColor: colors.backgroundHighest,
            },
            { type: 'inside', yAxisIndex: 0, zoomOnMouseWheel: false, moveOnMouseWheel: true },
          ]
        : undefined,
      tooltip: {
        confine: true,
        backgroundColor: colors.backgroundDefault,
        borderColor: colors.borderDefault,
        textStyle: { color: colors.neutralTextTitleHeading, fontSize: 13 },
        formatter: (p: unknown) => {
          const id = (p as { value?: number[] }).value?.[3];
          const f = id === undefined ? undefined : byId.get(id);
          if (!f) return '';
          const end = f.endedAt ? Date.parse(f.endedAt) : now;
          return [
            `<b>${esc(ruleName(f.ruleCode))}</b> (${esc(f.ruleCode)})`,
            `${esc(assetTag(f.assetAlias))} · ${f.severity.toLowerCase()} · ${f.status === 'ACTIVE' ? 'active' : 'cleared'}`,
            `${fmtTime(f.startedAt)} → ${f.endedAt ? fmtTime(f.endedAt) : 'now'} (${fmtDuration(end - Date.parse(f.startedAt))})`,
            f.intensityEstimate !== null
              ? `Estimated intensity ${fmtNum(f.intensityEstimate, 2)}`
              : '',
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      xAxis: {
        type: 'time',
        min: start,
        max: now,
        axisLabel: { ...label, hideOverlap: true },
        axisLine: { lineStyle: { color: colors.borderDefault } },
        splitLine: {
          show: true,
          lineStyle: { color: colors.borderLight, type: 'dashed', opacity: 0.5 },
        },
      },
      yAxis: {
        type: 'category',
        data: rows,
        inverse: true,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { ...label, fontSize: 13, color: colors.neutralTextTitleHeading },
      },
      series: [{ type: 'custom', renderItem, encode: { x: [1, 2], y: 0 }, data }],
    };
    return opt;
  }, [faults, from, now, colors, ruleName, selectedId, height]);

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height, width: '100%' }}
      onEvents={{
        click: (e: { value?: unknown }) => {
          const id = Array.isArray(e.value) ? e.value[3] : undefined;
          if (typeof id === 'number') onSelect(id);
        },
      }}
    />
  );
};
