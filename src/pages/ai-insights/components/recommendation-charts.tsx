import { ThemeContext } from '@digital-twin/components';
import { Check, Close } from '@digital-twin/icons';
import clsx from 'clsx';
import { color as echartsColor, format as echartsFormat } from 'echarts';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useMemo } from 'react';
import styles from '../ai-insights.module.scss';
import { fmtNum, signed, withUnit } from '../ai-insights.utils';
import {
  bulletRange,
  ConstraintView,
  pctOf,
  SetpointRow,
  Step,
  TWIN_KPIS,
  TwinCompare,
} from '../recommendation.utils';

/** Recommendation charts: set point dumbbells, twin baseline vs recommended, constraint bullets */

const esc = (s: string) => echartsFormat.encodeHTML(s);
const alpha = (c: string, a: number) => echartsColor.modifyAlpha(c, a) || c;

const ROW_PX = 40;

/**
 * Set points current → recommended: one row per set point on the optimizer's allowed range
 * (track), grey dot = current, brand dot = recommended, the change as a bar between them; the
 * values with units on the right.
 */
export const SetpointChart = ({ rows }: { rows: SetpointRow[] }) => {
  const { colors } = useContext(ThemeContext);

  const option = useMemo<EChartsOption>(() => {
    const pos = (r: SetpointRow, v: number | null) =>
      v === null ? null : (v - r.lo) / (r.hi - r.lo || 1);
    const show = (r: SetpointRow, v: number | null) =>
      v === null ? '--' : withUnit(fmtNum(v, r.digits), r.unit);
    const valueLabel = (r: SetpointRow) =>
      r.changed
        ? `${fmtNum(r.current, r.digits)} → ${show(r, r.recommended)}`
        : `${show(r, r.recommended ?? r.current)} · held`;
    const text = { color: colors.neutralTextTitleHeading, fontSize: 14 };
    const bar = { type: 'bar' as const, silent: true, barWidth: 6, barGap: '-100%' };
    const points = (key: 'current' | 'recommended') =>
      rows.flatMap((r, i) => {
        const x = pos(r, r[key]);
        return x === null ? [] : [[x, i]];
      });

    return {
      animation: false,
      // slack on the left: labels are measured before the web font may have loaded
      grid: { left: 16, right: 8, top: 28, bottom: 0, containLabel: true },
      legend: {
        top: 0,
        left: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: colors.neutralTextCaption, fontSize: 12 },
        data: ['Current', 'Recommended'],
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: colors.backgroundDefault,
        borderColor: colors.borderDefault,
        textStyle: { color: colors.neutralTextTitleHeading, fontSize: 13 },
        formatter: (p: unknown) => {
          const i = (p as { value?: number[] }).value?.[1];
          const r = i === undefined ? undefined : rows[i];
          if (!r) return '';
          return [
            `<b>${esc(r.label)}</b>`,
            `Current ${esc(show(r, r.current))}`,
            `Recommended ${esc(show(r, r.recommended))}`,
            `Allowed ${esc(fmtNum(r.lo, r.digits))} – ${esc(show(r, r.hi))}`,
          ].join('<br/>');
        },
      },
      xAxis: { type: 'value', min: 0, max: 1, show: false },
      yAxis: [
        {
          type: 'category',
          inverse: true,
          // short names: the chart shares the card with the value labels on the right
          data: rows.map((r) => r.label.replace(/ set point$/i, '').replace(/ position$/i, '')),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: text,
        },
        {
          type: 'category',
          inverse: true,
          position: 'right',
          data: rows.map(valueLabel),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { ...text, fontWeight: 600 },
        },
      ],
      series: [
        {
          ...bar,
          name: 'Allowed range',
          data: rows.map(() => 1),
          itemStyle: { color: colors.backgroundHigh, borderRadius: 3 },
        },
        {
          ...bar,
          stack: 'change',
          data: rows.map((r) =>
            Math.min(pos(r, r.current) ?? 0, pos(r, r.recommended) ?? pos(r, r.current) ?? 0)
          ),
          itemStyle: { color: 'transparent' },
        },
        {
          ...bar,
          stack: 'change',
          data: rows.map((r) =>
            r.changed ? Math.abs((pos(r, r.recommended) ?? 0) - (pos(r, r.current) ?? 0)) : 0
          ),
          itemStyle: { color: alpha(colors.brandSurfaceDefaultPrimary, 0.55), borderRadius: 3 },
        },
        {
          type: 'scatter',
          name: 'Current',
          data: points('current'),
          symbolSize: 12,
          itemStyle: { color: colors.neutralTextCaption },
          z: 3,
        },
        {
          type: 'scatter',
          name: 'Recommended',
          data: points('recommended'),
          symbolSize: 14,
          itemStyle: {
            color: colors.brandSurfaceDefaultPrimary,
            borderColor: colors.backgroundLowest,
            borderWidth: 2,
          },
          z: 4,
        },
      ],
    };
  }, [rows, colors]);

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height: rows.length * ROW_PX + 32, width: '100%' }}
    />
  );
};

/**
 * Twin validation: baseline vs recommended run (same plant state and seed, 2 h) for plant power,
 * efficiency and energy, each on its own axis; the recommended bar carries the change in %.
 */
export const TwinBars = ({ compare, height = 210 }: { compare: TwinCompare; height?: number }) => {
  const { colors } = useContext(ThemeContext);
  const kpis = useMemo(
    () =>
      TWIN_KPIS.filter(
        (k) => k.better && compare.baseline[k.key] !== null && compare.recommended[k.key] !== null
      ),
    [compare]
  );

  const option = useMemo<EChartsOption>(() => {
    const w = 100 / Math.max(kpis.length, 1);
    return {
      animation: false,
      title: kpis.map((k, i) => ({
        text: `${k.label} (${k.unit})`,
        left: `${i * w + w / 2}%`,
        textAlign: 'center',
        top: 0,
        textStyle: { color: colors.neutralTextTitleHeading, fontSize: 14, fontWeight: 500 },
      })),
      grid: kpis.map((_, i) => ({
        left: `${i * w + 4}%`,
        width: `${w - 8}%`,
        top: 32,
        bottom: 24,
      })),
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: colors.backgroundDefault,
        borderColor: colors.borderDefault,
        textStyle: { color: colors.neutralTextTitleHeading, fontSize: 13 },
        formatter: (p: unknown) => {
          const {
            seriesIndex = 0,
            name,
            value,
          } = p as {
            seriesIndex?: number;
            name: string;
            value: number;
          };
          const k = kpis[seriesIndex];
          return k
            ? `${esc(k.label)}<br/>${esc(name)}: <b>${esc(withUnit(fmtNum(value, k.digits), k.unit))}</b>`
            : '';
        },
      },
      xAxis: kpis.map((_, i) => ({
        type: 'category',
        gridIndex: i,
        data: ['Baseline', 'Recommended'],
        axisTick: { show: false },
        axisLine: { lineStyle: { color: colors.borderDefault } },
        axisLabel: { color: colors.neutralTextCaption, fontSize: 12 },
      })),
      yAxis: kpis.map((_, i) => ({
        type: 'value',
        gridIndex: i,
        show: false,
        max: (v: { max: number }) => v.max * 1.22,
      })),
      series: kpis.map((k, i) => {
        const b = compare.baseline[k.key] as number;
        const r = compare.recommended[k.key] as number;
        const pct = b ? ((r - b) / Math.abs(b)) * 100 : 0;
        const better = k.better === 'lower' ? r < b : r > b;
        const tone = Math.abs(pct) < 0.05 ? 'neutral' : better ? 'good' : 'bad';
        return {
          type: 'bar',
          xAxisIndex: i,
          yAxisIndex: i,
          barWidth: '44%',
          label: {
            show: true,
            position: 'top',
            color: colors.neutralTextTitleHeading,
            fontSize: 13,
            rich: {
              v: { color: colors.neutralTextTitleHeading, fontSize: 13, lineHeight: 16 },
              good: { color: colors.conditionNormalPrimary, fontSize: 12, fontWeight: 600 },
              bad: { color: colors.conditionCriticalPrimary, fontSize: 12, fontWeight: 600 },
              neutral: { color: colors.neutralTextCaption, fontSize: 12, fontWeight: 600 },
            },
          },
          data: [
            {
              name: 'Baseline',
              value: b,
              itemStyle: {
                color: alpha(colors.neutralTextCaption, 0.55),
                borderRadius: [4, 4, 0, 0],
              },
              label: { formatter: `{v|${fmtNum(b, k.digits)}}` },
            },
            {
              name: 'Recommended',
              value: r,
              itemStyle: { color: colors.brandSurfaceDefaultPrimary, borderRadius: [4, 4, 0, 0] },
              label: { formatter: `{${tone}|${signed(pct, 1)} %}\n{v|${fmtNum(r, k.digits)}}` },
            },
          ],
        };
      }),
    };
  }, [kpis, compare, colors]);

  if (!kpis.length) return null;
  return <ReactECharts option={option} notMerge lazyUpdate style={{ height, width: '100%' }} />;
};

const OP_TEXT: Record<string, string> = { '<=': '≤', '>=': '≥' };

/**
 * Constraint bullets: the zone beyond the limit in red, the limit as a line, the prediction at
 * the current set points as a grey tick and at the recommended ones as a dot (green when met).
 */
export const ConstraintBullets = ({ items }: { items: ConstraintView[] }) => (
  <div className={styles.bullets}>
    <ul>
      {items.map((c, i) => {
        const range = bulletRange([c.limit, c.current, c.predicted]);
        const limitPct = c.limit === null ? null : pctOf(c.limit, range);
        const zone =
          limitPct === null || c.op === null
            ? null
            : c.op === '<='
              ? { left: limitPct, width: 100 - limitPct }
              : { left: 0, width: limitPct };
        const tone = c.ok === false ? 'critical' : c.ok ? 'normal' : 'neutral';
        const fmt = (v: number | null) => fmtNum(v, c.digits);
        const op = c.op ? OP_TEXT[c.op] : 'limit';
        return (
          // positional: the optimizer's constraint list has no ids
          <li key={`${c.key ?? 'c'}:${i}`} className={styles.bullet}>
            <span className={styles.bullet__label} title={c.label}>
              {c.label}
            </span>
            <div
              className={styles.bullet__track}
              role="img"
              aria-label={`${c.label}: predicted ${fmt(c.predicted)}, now ${fmt(c.current)}, limit ${op} ${fmt(c.limit)} ${c.unit}`}
            >
              {zone ? (
                <i
                  className={styles.bullet__zone}
                  style={{ left: `${zone.left}%`, width: `${zone.width}%` }}
                />
              ) : null}
              {limitPct !== null ? (
                <i className={styles.bullet__limit} style={{ left: `${limitPct}%` }} />
              ) : null}
              {c.current !== null ? (
                <i
                  className={styles.bullet__current}
                  style={{ left: `${pctOf(c.current, range)}%` }}
                />
              ) : null}
              {c.predicted !== null ? (
                <i
                  className={clsx(styles.bullet__value, styles[`bullet__value--${tone}`])}
                  style={{ left: `${pctOf(c.predicted, range)}%` }}
                />
              ) : null}
            </div>
            <span className={clsx(styles.bullet__text, styles[`tone--${tone}`])}>
              {c.ok === null ? null : c.ok ? <Check /> : <Close />}
              {fmt(c.predicted)} {op} {withUnit(fmt(c.limit), c.unit)}
            </span>
          </li>
        );
      })}
    </ul>
    <div className={styles.bullets__legend} aria-hidden>
      <span>
        <i className={styles['legend--now']} /> now
      </span>
      <span>
        <i className={styles['legend--value']} /> recommended
      </span>
      <span>
        <i className={styles['legend--limit']} /> limit
      </span>
    </div>
  </div>
);

/** Proposed → Validating → Validated → Applied, with the step where the recommendation stopped */
export const StatusStepper = ({ steps }: { steps: Step[] }) => (
  <ol className={styles.stepper} aria-label="Recommendation status">
    {steps.map((s) => (
      <li
        key={s.label}
        className={clsx(styles.step, styles[`step--${s.state}`])}
        aria-current={s.state === 'active' ? 'step' : undefined}
      >
        <i className={styles.step__dot}>
          {s.state === 'done' ? <Check /> : s.state === 'error' ? <Close /> : null}
        </i>
        <span>{s.label}</span>
      </li>
    ))}
  </ol>
);
