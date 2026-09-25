import { InfoTooltip, ThemeContext } from '@digital-twin/components';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useMemo } from 'react';

import { PlanKpi, PlanSummary, parsePlanSummary } from '../api/production-plan.api';
import { SimJobDetail } from '../api/simulation.api';
import { chartAxis, chartLegend, chartTooltip, variantPalette } from '../simulation.charts';
import styles from '../simulation.module.scss';
import { Empty, fmtTime } from './job-bits';

const AREA_NAME: Record<string, string> = {
  LITHO: 'Litho',
  ETCH: 'Etch',
  CVD: 'CVD',
  PVD: 'PVD',
  ECP: 'Cu plating',
  CMP: 'CMP',
  DIFF: 'Diffusion',
  IMP: 'Implant',
  WET: 'Wet clean',
  STRIP: 'Strip',
  MET: 'Metrology',
  TEST: 'Test',
};
const AREAS = Object.keys(AREA_NAME);

const f1 = (v: number | undefined | null, d = 1) =>
  v === undefined || v === null || !Number.isFinite(v) ? '--' : v.toFixed(d);
const signed = (v: number, d = 1) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

type Card = {
  label: string;
  value: string;
  unit?: string;
  delta?: { text: string; good: boolean | null };
};

/** The headline KPIs of a variant, with the change against the first variant */
const cardsOf = (k: PlanKpi, base: PlanKpi | null, products: string[]): Card[] => {
  const d = (cur: number, b: number | undefined, higherGood: boolean, digits = 1, unit = '') =>
    base && b !== undefined && Number.isFinite(cur - b) && Math.abs(cur - b) > 1e-9
      ? { text: `${signed(cur - b, digits)}${unit}`, good: cur - b > 0 === higherGood }
      : undefined;
  const cards: Card[] = [
    { label: 'Lots out', value: String(k.outs), delta: d(k.outs, base?.outs, true, 0) },
    {
      label: 'Wafers out',
      value: k.wafers_out.toLocaleString(),
      delta: d(k.wafers_out, base?.wafers_out, true, 0),
    },
    ...products.map((p) => ({
      label: `Cycle time ${p}`,
      value: f1(k.ct_days[p]),
      unit: 'days',
      delta:
        k.ct_days[p] !== undefined ? d(k.ct_days[p], base?.ct_days[p], false, 1, ' d') : undefined,
    })),
    {
      label: 'On time',
      value: f1(k.on_time, 0),
      unit: '%',
      delta: d(k.on_time, base?.on_time, true, 0, ' %'),
    },
    {
      label: 'WIP at the end',
      value: String(k.wip_end),
      unit: 'lots',
      delta: d(k.wip_end, base?.wip_end, false, 0),
    },
    {
      label: 'Line yield',
      value: f1(k.line_yield, 2),
      unit: '%',
      delta: d(k.line_yield, base?.line_yield, true, 2, ' %'),
    },
    {
      label: 'Bottleneck',
      value: k.bottleneck.replace(/_/g, '-') || '--',
      unit: k.bottleneck ? `${f1(k.util[k.bottleneck], 0)} % busy` : '',
    },
    ...(k.transfers
      ? [
          {
            label: 'OHT delivery',
            value: f1(k.transport_min, 1),
            unit: `min · ${k.vehicles} vehicles ${f1(k.oht_util, 0)} % busy`,
            delta: d(k.transport_min, base?.transport_min, false, 1, ' min'),
          },
        ]
      : []),
  ];
  return cards;
};

const DailyChart = ({
  s,
  metric,
  title,
}: {
  s: PlanSummary;
  metric: 'wafers_out' | 'wip' | 'ct_days';
  title: string;
}) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const palette = variantPalette(colors);
    const days =
      s.variants[s.order[0]]?.daily.map((d) => fmtTime(`${d.day}T00:00:00`, 'dd MMM')) ?? [];
    return {
      animation: false,
      grid: { left: 8, right: 12, top: 40, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0 },
      tooltip: { ...chartTooltip(colors), trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: axis.label,
        axisLine: axis.line,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: title,
        nameTextStyle: { color: colors.neutralTextCaption },
        axisLabel: axis.label,
        splitLine: axis.split,
      },
      series: s.order.map((name, i) => ({
        name,
        type: metric === 'wafers_out' ? ('bar' as const) : ('line' as const),
        barMaxWidth: 10,
        showSymbol: false,
        connectNulls: true,
        step: metric === 'wip' ? ('end' as const) : undefined,
        itemStyle: { color: palette[i % palette.length] },
        lineStyle: { width: 2, color: palette[i % palette.length] },
        data: (s.variants[name]?.daily ?? []).map((d) =>
          metric === 'ct_days' && !d.ct_days ? null : d[metric]
        ),
      })),
    };
  }, [s, metric, title, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: 260, width: '100%' }} />
  );
};

const AreaChart = ({ s }: { s: PlanSummary }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const palette = variantPalette(colors);
    return {
      animation: false,
      grid: { left: 8, right: 12, top: 40, bottom: 8, containLabel: true },
      legend: { ...chartLegend(colors), top: 0 },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => (typeof v === 'number' ? `${v.toFixed(0)} %` : '--'),
      },
      xAxis: {
        type: 'category',
        data: AREAS.map((a) => AREA_NAME[a]),
        axisLabel: { ...axis.label, interval: 0, rotate: 30 },
        axisLine: axis.line,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '% busy',
        max: 100,
        nameTextStyle: { color: colors.neutralTextCaption },
        axisLabel: axis.label,
        splitLine: axis.split,
      },
      series: s.order.map((name, i) => ({
        name,
        type: 'bar' as const,
        barMaxWidth: 14,
        itemStyle: { color: palette[i % palette.length], borderRadius: [3, 3, 0, 0] },
        data: AREAS.map((a) => s.variants[name]?.kpi.area_util[a] ?? null),
      })),
    };
  }, [s, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: 260, width: '100%' }} />
  );
};

/** Results of a production planning simulation: KPIs per plan, daily outs / WIP / cycle time, utilization */
export const ProductionResults = ({ job }: { job: SimJobDetail }) => {
  const s = parsePlanSummary(job.rawSummary);
  if (!s) return <Empty>Results appear once the simulation finishes</Empty>;
  const base = s.variants[s.order[0]]?.kpi ?? null;
  const products = Array.from(
    new Set(s.order.flatMap((n) => Object.keys(s.variants[n]?.kpi.ct_days ?? {})))
  ).sort();
  return (
    <div className={styles.results}>
      {s.reason ? <p className={styles.results__reason}>{s.reason}</p> : null}
      <div className={styles.vcards}>
        {s.order.map((name, i) => {
          const v = s.variants[name];
          if (!v) return null;
          return (
            <div key={name} className={styles.vcard}>
              <div className={styles.vcard__head}>
                <strong>{name}</strong>
                <span className={styles.caption}>
                  {i === 0 ? 'baseline · ' : ''}
                  {f1(v.plan.starts_per_day)} lots/day · {v.plan.dispatch ?? 'FIFO'}
                  {v.plan.hot_share ? ` · ${f1(100 * v.plan.hot_share, 0)} % hot` : ''}
                </span>
              </div>
              <div className={styles.vcard__kpis}>
                {cardsOf(v.kpi, i === 0 ? null : base, products).map((c) => (
                  <div key={c.label} className={styles.vkpi}>
                    <span className={styles.vkpi__label}>{c.label}</span>
                    <span className={styles.vkpi__value}>
                      {c.value}
                      {c.unit ? <small> {c.unit}</small> : null}
                    </span>
                    {c.delta ? (
                      <span
                        className={
                          c.delta.good === null
                            ? styles.caption
                            : c.delta.good
                              ? styles.good
                              : styles.bad
                        }
                      >
                        {c.delta.text}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              {v.events.filter((e) => e.kind === 'planned' || e.kind === 'added').length ? (
                <ul className={styles.planEvents}>
                  {v.events
                    .filter((e) => e.kind === 'planned' || e.kind === 'added')
                    .map((e) => (
                      <li key={`${e.tool}-${e.from}-${e.kind}`}>
                        {e.kind === 'added' ? 'Added ' : 'Down '}
                        <b>{e.tool.replace(/_/g, '-')}</b>
                        {e.kind === 'planned' ? ` ${fmtTime(e.from)} – ${fmtTime(e.to)}` : ''}
                        {e.note ? ` · ${e.note}` : ''}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className={styles.compare}>
        <h4 className={styles.section__title}>
          Wafers out per day
          <InfoTooltip
            title="Wafers out"
            content="Wafers of the lots completed each day (wafer acceptance test passed)."
          />
        </h4>
        <DailyChart s={s} metric="wafers_out" title="wafers" />
        <h4 className={styles.section__title}>Lots in the fab (WIP)</h4>
        <DailyChart s={s} metric="wip" title="lots" />
        <h4 className={styles.section__title}>Cycle time of the lots completed each day</h4>
        <DailyChart s={s} metric="ct_days" title="days" />
        <h4 className={styles.section__title}>
          Utilization by process area
          <InfoTooltip
            title="Utilization"
            content="Share of the horizon the area's tools were processing (the busiest area limits the fab)."
          />
        </h4>
        <AreaChart s={s} />
        <h4 className={styles.section__title}>Busiest tools</h4>
        <table className={styles.planActions}>
          <thead>
            <tr>
              <th>Tool</th>
              <th>Area</th>
              {s.order.map((n) => (
                <th key={n}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(s.variants[s.order[0]]?.tools ?? []).slice(0, 10).map((t) => (
              <tr key={t.alias}>
                <td>{t.alias.replace(/_/g, '-')}</td>
                <td>{AREA_NAME[t.area] ?? t.area}</td>
                {s.order.map((n) => (
                  <td key={n}>{f1(s.variants[n]?.kpi.util[t.alias], 0)} %</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
