import {
  actionLabel,
  actionValue,
  assetTag,
  fmtNum,
  humanize,
  isPlainObject,
  MODE_OPTIONS,
  modeText,
  num,
  ordered,
  predictedMeta,
  SETPOINT_BOUNDS,
  SETPOINT_META,
  setpointMeta,
  withUnit,
} from './ai-insights.utils';
import type {
  ControlRequest,
  Recommendation,
  RecommendationAction,
  RecommendationStatus,
} from './api/ai-insights.api';

/** Pure view models of a recommendation (set points, constraints, twin validation, lifecycle) */

// ------------------------------------------------------------- set points
export type SetpointRow = {
  key: string;
  label: string;
  unit: string;
  digits: number;
  current: number | null;
  recommended: number | null;
  /** chart range: the optimizer's decision bounds, widened to fit both values */
  lo: number;
  hi: number;
  changed: boolean;
};

/**
 * One row per set point of the recommendation (in the page's set point order). The current value
 * of a set point the optimizer holds (cw_min_temp) is reported with the conditions.
 */
export const setpointRows = (
  rec: Pick<Recommendation, 'current' | 'recommended' | 'conditions'>
): SetpointRow[] =>
  ordered(
    [...Object.keys(rec.current.setpoints), ...Object.keys(rec.recommended.setpoints)],
    SETPOINT_META
  ).map((key) => {
    const meta = setpointMeta(key);
    const current = num(rec.current.setpoints[key] ?? rec.conditions.values[key]);
    const recommended = num(rec.recommended.setpoints[key]);
    const values = [current, recommended].filter((v): v is number => v !== null);
    const [boundLo, boundHi] = SETPOINT_BOUNDS[key] ?? [
      Math.min(...values, 0),
      Math.max(...values, 1) * 1.2,
    ];
    const lo = Math.min(boundLo, ...values);
    const hi = Math.max(boundHi, ...values, lo + 1e-9);
    const changed =
      current !== null &&
      recommended !== null &&
      Math.abs(recommended - current) >= 0.5 * 10 ** -meta.digits;
    return { key, ...meta, current, recommended, lo, hi, changed };
  });

// ------------------------------------------------------------ constraints
export type ConstraintView = {
  key: string | null;
  label: string;
  op: '<=' | '>=' | null;
  limit: number | null;
  /** surrogate prediction at the current set points */
  current: number | null;
  /** surrogate prediction at the recommended set points */
  predicted: number | null;
  /** the surrogate's error back-off the optimizer kept from the limit */
  margin: number | null;
  unit: string;
  digits: number;
  ok: boolean | null;
};

const pick = (o: Record<string, unknown>, ...keys: string[]) =>
  keys.map((k) => o[k]).find((v) => v !== undefined && v !== null);

/**
 * An optimizer constraint (`{name, label, op, limit, unit, current, predicted, margin, ok}`), read
 * leniently; null when it is not an object.
 */
export const constraintView = (c: unknown): ConstraintView | null => {
  if (!isPlainObject(c)) return null;
  const key = pick(c, 'name', 'constraint', 'key', 'param');
  const meta = typeof key === 'string' ? predictedMeta(key) : null;
  const op = pick(c, 'op', 'operator');
  const ok = pick(c, 'ok', 'satisfied', 'met', 'feasible');
  return {
    key: typeof key === 'string' ? key : null,
    label:
      typeof c.label === 'string' ? c.label : meta ? meta.label : humanize(String(key ?? 'limit')),
    op: op === '<=' || op === '<' ? '<=' : op === '>=' || op === '>' ? '>=' : null,
    limit: num(pick(c, 'limit', 'bound', 'threshold')),
    current: num(c.current),
    predicted: num(pick(c, 'predicted', 'recommended', 'value')),
    margin: num(c.margin),
    unit: typeof c.unit === 'string' ? c.unit : (meta?.unit ?? ''),
    digits: meta?.digits ?? 2,
    ok: typeof ok === 'boolean' ? ok : null,
  };
};

/** Chart range of a constraint bullet: every value shown, padded on both sides */
export const bulletRange = (values: (number | null)[]) => {
  const finite = values.filter((v): v is number => v !== null);
  if (!finite.length) return { min: 0, max: 1 };
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const pad = (hi - lo || Math.abs(hi) * 0.1 || 1) * 0.35;
  return { min: lo - pad, max: hi + pad };
};

/** Position of a value in a range, in % (clamped) */
export const pctOf = (v: number, range: { min: number; max: number }) =>
  Math.min(100, Math.max(0, ((v - range.min) / (range.max - range.min || 1)) * 100));

// -------------------------------------------------------- twin validation
/** Physical KPIs of the two variants of the validation run (simulator job summary) */
export const TWIN_KPIS: {
  key: string;
  label: string;
  unit: string;
  digits: number;
  better?: 'lower' | 'higher';
}[] = [
  { key: 'avg_plant_kw', label: 'Plant power', unit: 'kW', digits: 0, better: 'lower' },
  { key: 'avg_kw_per_rt', label: 'Efficiency', unit: 'kW/RT', digits: 3, better: 'lower' },
  { key: 'energy_kwh', label: 'Energy (2 h)', unit: 'kWh', digits: 0, better: 'lower' },
  { key: 'max_chws_temp', label: 'Max CHW supply temp', unit: '°C', digits: 2 },
  { key: 'min_riser_dp', label: 'Min riser DP', unit: 'kPa', digits: 0 },
  { key: 'max_mau_valve', label: 'Max MAU CHW valve', unit: '%', digits: 0 },
];

export type TwinCompare = {
  baseline: Record<string, number | null>;
  recommended: Record<string, number | null>;
  savingKw: number | null;
  savingKwh: number | null;
  savingPct: number | null;
};

/** Baseline vs recommended KPIs of the validation run; null when the run has none */
export const twinCompare = (value: unknown): TwinCompare | null => {
  if (!isPlainObject(value)) return null;
  const base = isPlainObject(value.baseline) ? value.baseline : {};
  const recd = isPlainObject(value.recommended) ? value.recommended : {};
  const baseline: Record<string, number | null> = {};
  const recommended: Record<string, number | null> = {};
  for (const k of TWIN_KPIS) {
    baseline[k.key] = num(base[k.key]);
    recommended[k.key] = num(recd[k.key]);
  }
  const any = TWIN_KPIS.some((k) => baseline[k.key] !== null || recommended[k.key] !== null);
  const savingKw = num(value.saving_kw);
  if (!any && savingKw === null) return null;
  return {
    baseline,
    recommended,
    savingKw,
    savingKwh: num(value.saving_kwh),
    savingPct: num(value.saving_pct),
  };
};

export type Tone = 'normal' | 'warning' | 'critical' | 'secondary';

const violationLabels = (list: unknown[]) =>
  list
    .map((v) =>
      isPlainObject(v)
        ? typeof v.label === 'string'
          ? v.label
          : typeof v.constraint === 'string'
            ? predictedMeta(v.constraint).label
            : 'constraint'
        : String(v)
    )
    .join(', ');

/**
 * Constraint verdict of the twin run. The recommendation is judged against the baseline run of the
 * same plant state: violations the baseline has too (`baseline_violations`, e.g. a MAU valve
 * saturated on a hot afternoon) do not reject it, but they are not "all met" either.
 */
export const validationVerdict = (
  value: unknown
): { text: string; tone: Tone; detail: string | null } | null => {
  if (!isPlainObject(value) || typeof value.success !== 'boolean') return null;
  const caused = Array.isArray(value.violations) ? value.violations : [];
  const existing = Array.isArray(value.baseline_violations) ? value.baseline_violations : [];
  if (!value.success || caused.length) {
    return {
      text: 'Violated',
      tone: 'critical',
      detail: caused.length ? `Caused by the recommendation: ${violationLabels(caused)}` : null,
    };
  }
  if (existing.length) {
    return {
      text: 'Same as baseline',
      tone: 'warning',
      detail: `${violationLabels(existing)}: also in the baseline run, not made worse`,
    };
  }
  return { text: 'All met', tone: 'normal', detail: null };
};

// -------------------------------------------------------------- lifecycle
export type StepState = 'done' | 'active' | 'todo' | 'error' | 'stopped';
export type Step = { label: string; state: StepState };

/**
 * The lifecycle as 4 steps (Proposed → Validating → Validated → Applied); a recommendation that
 * stops early shows where it stopped (Rejected / Failed at validation, Expired / Dismissed at
 * apply).
 */
export const recommendationSteps = (status: RecommendationStatus, validation: unknown): Step[] => {
  const s = (label: string, state: StepState): Step => ({ label, state });
  const validated = isPlainObject(validation) && validation.success === true;
  switch (status) {
    case 'PROPOSED':
      return [
        s('Proposed', 'active'),
        s('Validating', 'todo'),
        s('Validated', 'todo'),
        s('Applied', 'todo'),
      ];
    case 'VALIDATING':
      return [
        s('Proposed', 'done'),
        s('Validating', 'active'),
        s('Validated', 'todo'),
        s('Applied', 'todo'),
      ];
    case 'VALIDATED':
      return [
        s('Proposed', 'done'),
        s('Validating', 'done'),
        s('Validated', 'done'),
        s('Applied', 'todo'),
      ];
    case 'APPLIED':
      return [
        s('Proposed', 'done'),
        s('Validating', 'done'),
        s('Validated', 'done'),
        s('Applied', 'done'),
      ];
    case 'REJECTED':
      return [
        s('Proposed', 'done'),
        s('Validating', 'done'),
        s('Rejected', 'error'),
        s('Applied', 'stopped'),
      ];
    case 'FAILED':
      return [
        s('Proposed', 'done'),
        s('Validating', 'done'),
        s('Failed', 'error'),
        s('Applied', 'stopped'),
      ];
    default: {
      const end = status === 'EXPIRED' ? 'Expired' : 'Dismissed';
      return validated
        ? [
            s('Proposed', 'done'),
            s('Validating', 'done'),
            s('Validated', 'done'),
            s(end, 'stopped'),
          ]
        : [
            s('Proposed', 'done'),
            s('Validating', 'stopped'),
            s('Validated', 'stopped'),
            s(end, 'stopped'),
          ];
    }
  }
};

// ----------------------------------------------------------- plant writes
/** Set point key of `current/recommended.setpoints` written by an action's parameter */
const SETPOINT_OF_PARAM: Record<string, string> = { chillers_sp: 'chillers' };

type WriteContext = Pick<Recommendation, 'current' | 'conditions'>;

/** The value in force when the optimizer ran (mode label or set point), null when unknown */
export const currentOf = (rec: WriteContext, a: RecommendationAction) => {
  if (MODE_OPTIONS[a.param]) {
    const mode = rec.conditions.modes[a.param];
    return mode === undefined ? null : modeText(a.param, mode);
  }
  const key = SETPOINT_OF_PARAM[a.param] ?? a.param;
  const v = rec.current.setpoints[key] ?? rec.conditions.values[key];
  return v === undefined ? null : fmtNum(v, setpointMeta(a.param).digits);
};

/** "CHWS-01 · CHW supply set point: 6.5 → 7.0 °C" */
export const writeText = (rec: WriteContext, a: RecommendationAction) => {
  const from = currentOf(rec, a);
  const target = `${assetTag(a.asset)} · ${actionLabel(a)}`;
  return from !== null ? `${target}: ${from} → ${actionValue(a)}` : `${target} → ${actionValue(a)}`;
};

/** Same equipment (a result without an alias matches any) */
const sameAsset = (resultAlias: string | null, actionAlias: string) =>
  !resultAlias || resultAlias.toLowerCase() === actionAlias.toLowerCase();

/** Result of an action's write in the last apply (same equipment and parameter) */
export const resultOf = (
  rec: Pick<Recommendation, 'applyResults'>,
  a: RecommendationAction
): ControlRequest | null =>
  rec.applyResults?.results.find(
    (r) => !r.restore && r.alias === a.param && sameAsset(r.assetAlias, a.asset)
  ) ?? null;

/** Confirmed and planned writes of the last apply (mode write-backs are not planned writes) */
export const applyCount = (rec: Pick<Recommendation, 'applyResults'>) => {
  const record = rec.applyResults;
  if (!record) return { confirmed: 0, planned: 0 };
  return {
    confirmed: record.results.filter((r) => r.status === 'APPLIED' && !r.restore).length,
    planned: record.planned ?? record.results.filter((r) => !r.restore).length,
  };
};

/** "CHWS-01 · CHW set point mode restored to Reset": a mode written back after a failed apply */
export const restoreText = (r: ControlRequest) => {
  const name = r.alias
    ? setpointMeta(r.alias).label
    : r.label?.split(':')[0].trim() || r.name || 'Mode';
  const value =
    r.value === null
      ? ''
      : r.alias && MODE_OPTIONS[r.alias]
        ? modeText(r.alias, r.value)
        : withUnit(fmtNum(r.value, Number.isInteger(r.value) ? 0 : 2), r.unit ?? undefined);
  const target = r.assetAlias ? `${assetTag(r.assetAlias)} · ${name}` : name;
  return value ? `${target} restored to ${value}` : `${target} restored`;
};
