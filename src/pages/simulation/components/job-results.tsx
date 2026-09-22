import {
  Badge,
  Button,
  Column,
  InfoTooltip,
  Popup,
  Table,
  ThemeContext,
} from '@digital-twin/components';
import { TableChart } from '@digital-twin/icons';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { ReactNode, useContext, useMemo, useState } from 'react';

import { SimJobDetail, SimSummary, SimVariantSummary } from '../api/simulation.api';
import { tagOf } from '../simulation.catalog';
import {
  CHART_FONT,
  chartAxis,
  chartLegend,
  chartTooltip,
  variantPalette,
} from '../simulation.charts';
import styles from '../simulation.module.scss';
import { BadgeColor, fmtTime } from './job-bits';

const BASELINE = 'baseline';

type NumericKey = {
  [K in keyof SimVariantSummary]: SimVariantSummary[K] extends number | null ? K : never;
}[keyof SimVariantSummary];

type Kpi = {
  key: NumericKey;
  label: string;
  short: string;
  unit: string;
  digits: number;
  /** which way is better, for the comparison with the baseline (none: neutral) */
  better?: 'lower' | 'higher';
};

const KPIS: Kpi[] = [
  {
    key: 'energyKwh',
    label: 'Plant energy',
    short: 'Energy',
    unit: 'kWh',
    digits: 0,
    better: 'lower',
  },
  {
    key: 'avgPlantKw',
    label: 'Average plant power',
    short: 'Avg power',
    unit: 'kW',
    digits: 0,
    better: 'lower',
  },
  {
    key: 'avgKwPerRt',
    label: 'Average plant efficiency',
    short: 'kW/RT',
    unit: 'kW/RT',
    digits: 3,
    better: 'lower',
  },
  { key: 'peakLoadKw', label: 'Peak cooling load', short: 'Peak load', unit: 'kW', digits: 0 },
  { key: 'avgChwsTemp', label: 'Average CHW supply', short: 'Avg CHWS', unit: '°C', digits: 2 },
  {
    key: 'maxChwsTemp',
    label: 'Highest CHW supply',
    short: 'Max CHWS',
    unit: '°C',
    digits: 2,
    better: 'lower',
  },
  {
    key: 'minRiserDp',
    label: 'Lowest riser ΔP',
    short: 'Min riser ΔP',
    unit: 'kPa',
    digits: 0,
    better: 'higher',
  },
  {
    key: 'maxMauValve',
    label: 'Highest MAU valve',
    short: 'Max MAU valve',
    unit: '%',
    digits: 0,
    better: 'lower',
  },
  { key: 'statusChanges', label: 'Status changes', short: 'Status changes', unit: '', digits: 0 },
  { key: 'trips', label: 'Trips', short: 'Trips', unit: '', digits: 0, better: 'lower' },
  {
    key: 'anomalies',
    label: 'Anomalies',
    short: 'Anomalies',
    unit: '',
    digits: 0,
    better: 'lower',
  },
];

const kpi = (key: NumericKey) => KPIS.find((k) => k.key === key) as Kpi;

/** Headline KPIs of a variant card */
const CARD_KPIS = (['energyKwh', 'avgPlantKw', 'avgKwPerRt', 'maxChwsTemp'] as const).map(kpi);
/** KPIs compared in the change chart */
const CHANGE_KPIS = (
  ['energyKwh', 'avgPlantKw', 'avgKwPerRt', 'maxChwsTemp', 'minRiserDp'] as const
).map(kpi);

const num = (v: number | null, digits: number) =>
  v === null
    ? '--'
    : v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

type Delta = { diff: number; pct: number | null; good: boolean | null };

/** Change of a KPI against the baseline (null: not comparable or no change at its precision) */
const deltaOf = (row: Kpi, value: number | null, base: number | null): Delta | null => {
  if (value === null || base === null) return null;
  const diff = value - base;
  if (Number(Math.abs(diff).toFixed(row.digits)) === 0) return null;
  const pct = base !== 0 ? (diff / Math.abs(base)) * 100 : null;
  const good = row.better ? (row.better === 'lower' ? diff < 0 : diff > 0) : null;
  return { diff, pct, good };
};

const sign = (v: number) => (v > 0 ? '+' : '−');

const deltaText = (row: Kpi, d: Delta) =>
  d.pct !== null && Math.abs(d.pct) >= 0.05
    ? `${sign(d.diff)}${Math.abs(d.pct).toFixed(1)} %`
    : `${sign(d.diff)}${Math.abs(d.diff).toFixed(row.digits)}${row.unit ? ` ${row.unit}` : ''}`;

const DeltaBadge = ({ row, delta }: { row: Kpi; delta: Delta | null }) => {
  if (!delta) return <span className={styles.caption}>no change</span>;
  const color: BadgeColor =
    delta.good === true ? 'normal' : delta.good === false ? 'critical' : 'secondary';
  return (
    <Badge
      color={color}
      fillVariant="outlined"
      className={styles.badge}
      title={`${sign(delta.diff)}${Math.abs(delta.diff).toFixed(row.digits)} ${row.unit} against ${BASELINE}`}
    >
      {deltaText(row, delta)}
    </Badge>
  );
};

const Verdict = ({ success }: { success: boolean | null }) => (
  <Badge
    color={success === null ? 'offline' : success ? 'normal' : 'critical'}
    className={styles.badge}
  >
    {success === null ? 'Not assessed' : success ? 'Within constraints' : 'Constraints violated'}
  </Badge>
);

/** Variants with results, the job's order first; the reference is the baseline (else the first) */
export const resultNames = (summary: SimSummary, variants: string[]) => {
  const names = [
    ...variants.filter((v) => summary.variants[v]),
    ...Object.keys(summary.variants).filter((v) => !variants.includes(v)),
  ];
  const base = summary.variants[BASELINE] ? BASELINE : names[0];
  return { names, base };
};

// ------------------------------------------------------------------ KPI cards
const VariantCard = ({
  name,
  v,
  base,
  isBase,
  color,
}: {
  name: string;
  v: SimVariantSummary;
  base: SimVariantSummary;
  isBase: boolean;
  color: string;
}) => (
  <section className={styles.vcard} aria-label={`Variant ${name}`}>
    <header className={styles.vcard__head}>
      <i className={styles.swatch} style={{ background: color }} aria-hidden="true" />
      <strong title={name}>{name}</strong>
      {isBase ? (
        <Badge color="secondary" fillVariant="outlined" className={styles.badge}>
          Reference
        </Badge>
      ) : null}
      <Verdict success={v.success} />
    </header>
    <div className={styles.vcard__kpis}>
      {CARD_KPIS.map((row) => (
        <div key={row.key} className={styles.vkpi}>
          <span className={styles.vkpi__label}>{row.short}</span>
          <span className={styles.vkpi__value}>
            {num(v[row.key], row.digits)}
            {row.unit && row.unit !== row.short ? <small> {row.unit}</small> : null}
          </span>
          {isBase ? null : <DeltaBadge row={row} delta={deltaOf(row, v[row.key], base[row.key])} />}
        </div>
      ))}
    </div>
  </section>
);

// ------------------------------------------------------------------ charts
const ComparisonCharts = ({
  summary,
  names,
  base,
  palette,
}: {
  summary: SimSummary;
  names: string[];
  base: string;
  palette: string[];
}) => {
  const { colors } = useContext(ThemeContext);
  const energy = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const color = (n: string) => palette[names.indexOf(n) % palette.length];
    return {
      animation: false,
      grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'item',
        valueFormatter: (v: unknown) => (typeof v === 'number' ? `${num(v, 0)} kWh` : '--'),
      },
      xAxis: {
        type: 'value',
        splitNumber: 3,
        // "4.5k": full numbers run into each other on a narrow chart
        axisLabel: {
          ...axis.label,
          formatter: (v: number) =>
            Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v),
        },
        splitLine: axis.split,
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: names,
        axisLabel: {
          ...axis.label,
          fontSize: CHART_FONT.legend,
          color: colors.neutralTextTitleHeading,
        },
        axisLine: axis.line,
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          name: 'Plant energy',
          barMaxWidth: 22,
          data: names.map((n) => ({
            value: summary.variants[n].energyKwh,
            itemStyle: { color: color(n), borderRadius: [0, 4, 4, 0] },
          })),
          label: {
            show: true,
            position: 'right',
            color: colors.neutralTextTitleHeading,
            fontSize: CHART_FONT.tick,
            formatter: ({ value }: { value: unknown }) =>
              typeof value === 'number' ? num(value, 0) : '',
          },
        },
      ],
    };
  }, [colors, names, summary, palette]);

  const alternatives = names.filter((n) => n !== base);
  const change = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const color = (n: string) => palette[names.indexOf(n) % palette.length];
    const b = summary.variants[base];
    return {
      animation: false,
      legend: { ...chartLegend(colors), bottom: 0, left: 'center' },
      grid: { left: 8, right: 8, top: 12, bottom: 32, containLabel: true },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const list = params as { axisIndex: number; dataIndex: number }[];
          const row = CHANGE_KPIS[list[0]?.dataIndex ?? 0];
          const lines = names.map(
            (n) =>
              `${n}: ${num(summary.variants[n][row.key], row.digits)} ${row.unit}${
                n === base
                  ? ''
                  : (
                      () => {
                        const d = deltaOf(row, summary.variants[n][row.key], b[row.key]);
                        return d ? ` (${deltaText(row, d)})` : '';
                      }
                    )()
              }`
          );
          return [`<b>${row.label}</b>`, ...lines].join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        data: CHANGE_KPIS.map(
          (k) => `${k.short}\n${k.better === 'higher' ? '▲ better' : '▼ better'}`
        ),
        axisLabel: { ...axis.label, color: colors.neutralTextTitleHeading, interval: 0 },
        axisLine: axis.line,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '% vs baseline',
        nameTextStyle: { ...axis.label, align: 'left' },
        axisLabel: { ...axis.label, formatter: '{value} %' },
        splitLine: axis.split,
      },
      series: alternatives.map((n) => ({
        type: 'bar',
        name: n,
        barMaxWidth: 26,
        itemStyle: { color: color(n), borderRadius: 3 },
        data: CHANGE_KPIS.map((row) => {
          const value = summary.variants[n][row.key];
          const ref = b[row.key];
          return value !== null && ref
            ? Number((((value - ref) / Math.abs(ref)) * 100).toFixed(2))
            : null;
        }),
        markLine:
          n === alternatives[0]
            ? {
                symbol: 'none',
                silent: true,
                label: { show: false },
                lineStyle: { color: colors.neutralTextCaption, type: 'solid' },
                data: [{ yAxis: 0 }],
              }
            : undefined,
      })),
    };
  }, [colors, names, base, alternatives, summary, palette]);

  return (
    <div className={styles.compare}>
      <figure className={styles.chart}>
        <figcaption>Plant energy</figcaption>
        <ReactECharts
          option={energy}
          style={{ height: Math.max(120, names.length * 48 + 24) }}
          notMerge
          lazyUpdate
        />
      </figure>
      {alternatives.length ? (
        <figure className={styles.chart}>
          <figcaption>
            Change against {base}
            <InfoTooltip
              title="Change against the reference"
              content="Each bar is the alternative's KPI minus the reference, in % of the reference. Hover for the values."
            />
          </figcaption>
          <ReactECharts option={change} style={{ height: 220 }} notMerge lazyUpdate />
        </figure>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------------------ findings
const Findings = ({ name, v }: { name: string; v: SimVariantSummary }) => {
  const chips: ReactNode[] = [];
  v.constraintViolations.forEach((c) => {
    const details = [
      c.longestMin ? `longest ${c.longestMin.toFixed(0)} min` : null,
      c.limitMin ? `allowed ${c.limitMin.toFixed(0)} min` : null,
      c.worst !== null ? `worst ${Number(c.worst.toFixed(3))}` : null,
      c.firstAt ? `from ${fmtTime(c.firstAt)}` : null,
      c.assets.length ? c.assets.map(tagOf).join(', ') : null,
    ]
      .filter(Boolean)
      .join(' · ');
    chips.push(
      <Badge
        key={`c-${c.constraint}`}
        color={c.critical === false ? 'warning' : 'critical'}
        className={styles.badge}
        title={details}
      >
        {c.label ?? c.constraint}
        {c.minutes ? ` · ${c.minutes.toFixed(0)} min` : ''}
      </Badge>
    );
  });
  v.faultsDetected.forEach((f) => {
    chips.push(
      <Badge
        key={`f-${f.rule}-${f.asset}-${f.startedAt}`}
        color="warning"
        fillVariant="outlined"
        className={styles.badge}
        title={[
          f.startedAt ? `from ${fmtTime(f.startedAt)}` : null,
          f.confirmedAt ? `confirmed ${fmtTime(f.confirmedAt)}` : null,
          f.intensity !== null ? `intensity ${f.intensity}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        FDD {f.rule}
        {f.asset ? ` · ${tagOf(f.asset)}` : ''}
      </Badge>
    );
  });
  if (v.alarmCounts && (v.alarmCounts.warning || v.alarmCounts.critical)) {
    chips.push(
      <Badge key="alarms" color="secondary" fillVariant="outlined" className={styles.badge}>
        Alarms {v.alarmCounts.warning} W / {v.alarmCounts.critical} C
      </Badge>
    );
  }
  if (v.trips) {
    chips.push(
      <Badge key="trips" color="critical" fillVariant="outlined" className={styles.badge}>
        {v.trips} trip{v.trips > 1 ? 's' : ''}
      </Badge>
    );
  }
  if (v.anomalies) {
    chips.push(
      <Badge
        key="anomalies"
        color="secondary"
        fillVariant="outlined"
        className={styles.badge}
        title={
          v.anomaliesByDetector
            ? Object.entries(v.anomaliesByDetector)
                .filter(([, n]) => n)
                .map(([d, n]) => `${d} ${n}`)
                .join(' · ')
            : undefined
        }
      >
        {v.anomalies} anomal{v.anomalies > 1 ? 'ies' : 'y'}
      </Badge>
    );
  }
  return (
    <div className={styles.findings}>
      <span className={styles.findings__name}>{name}</span>
      {chips.length ? chips : <span className={styles.caption}>No findings</span>}
      {v.notes ? <InfoTooltip title={`Analysis notes · ${name}`} content={v.notes} /> : null}
    </div>
  );
};

// ------------------------------------------------------------------ all KPIs
const AllKpis = ({
  summary,
  names,
  base,
  open,
  onClose,
}: {
  summary: SimSummary;
  names: string[];
  base: string;
  open: boolean;
  onClose: () => void;
}) => {
  const columns: Column[] = [
    { key: 'kpi', name: 'KPI', width: 220 },
    ...names.map((n) => ({ key: `v:${n}`, name: n === base ? `${n} (reference)` : n })),
  ];
  const rows = KPIS.map((row) => ({
    id: row.key,
    kpi: `${row.label}${row.unit ? ` (${row.unit})` : ''}`,
    ...Object.fromEntries(
      names.map((n) => {
        const value = summary.variants[n][row.key];
        const d = n === base ? null : deltaOf(row, value, summary.variants[base][row.key]);
        return [
          `v:${n}`,
          <span key={n} className={styles.cellDelta}>
            {num(value, row.digits)}
            {d ? (
              <small
                className={
                  d.good === true ? styles.good : d.good === false ? styles.bad : styles.caption
                }
              >
                {deltaText(row, d)}
              </small>
            ) : null}
          </span>,
        ];
      })
    ),
  }));
  return (
    <Popup
      title="All KPIs"
      icon={<TableChart width={24} height={24} />}
      open={open}
      onClose={onClose}
      width={Math.min(1080, 280 + names.length * 200)}
      background="none"
    >
      <Table columns={columns} rows={rows} />
    </Popup>
  );
};

/**
 * Results of a finished run: verdict, a KPI card per variant with its change against the
 * reference, energy and change charts, and the post-analysis findings as chips. The full KPI
 * table opens in a popup.
 */
export const JobResults = ({ job }: { job: SimJobDetail }) => {
  const { colors } = useContext(ThemeContext);
  const [allOpen, setAllOpen] = useState(false);
  const { summary } = job;
  const { names, base } = resultNames(summary, job.variants);
  const palette = variantPalette(colors);
  if (!names.length) return null;
  const baseKpis = summary.variants[base];

  return (
    <div className={styles.results}>
      <div className={styles.results__verdict}>
        <Verdict success={summary.success} />
        {summary.reason ? (
          <span className={styles.results__reason} title={summary.reason}>
            {summary.reason}
          </span>
        ) : null}
        <Button
          type="button"
          color="default-secondary"
          icon={<TableChart width={20} height={20} />}
          onClick={() => setAllOpen(true)}
        >
          All KPIs
        </Button>
      </div>

      <div className={styles.vcards}>
        {names.map((n, i) => (
          <VariantCard
            key={n}
            name={n}
            v={summary.variants[n]}
            base={baseKpis}
            isBase={n === base}
            color={palette[i % palette.length]}
          />
        ))}
      </div>

      <ComparisonCharts summary={summary} names={names} base={base} palette={palette} />

      <h3 className={styles.section__title}>
        Findings
        <InfoTooltip
          title="Findings"
          content="Constraint violations, FDD faults, alarms, trips and anomalies found by the post-analysis. Hover a chip for details."
        />
      </h3>
      <div className={styles.findings__list}>
        {names.map((n) => (
          <Findings key={n} name={n} v={summary.variants[n]} />
        ))}
      </div>

      <AllKpis
        summary={summary}
        names={names}
        base={base}
        open={allOpen}
        onClose={() => setAllOpen(false)}
      />
    </div>
  );
};
