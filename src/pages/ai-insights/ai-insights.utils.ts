import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';

import type {
  ApplyOutcome,
  ControlStatus,
  DocStatus,
  DocType,
  RecommendationAction,
  RecommendationStatus,
  Severity,
} from './api/ai-insights.api';

/** Shared formatting and labels of the AI Insights page */

type BadgeColor =
  | 'primary'
  | 'secondary'
  | 'running'
  | 'idle'
  | 'normal'
  | 'warning'
  | 'critical'
  | 'offline'
  | 'abnormal';

/** Current time, refreshed every `ms` (relative times, countdowns) */
export const useNow = (ms = 30_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
};

/** A number with fixed decimals and digit grouping ("--" when missing) */
export const fmtNum = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '--'
    : v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** A value with its unit ("7.2 °C", "3 chillers" stays "3") */
export const withUnit = (text: string, unit?: string | null) =>
  unit && text !== '--' ? `${text} ${unit}` : text;

/** A timestamp in local time; a date-only value ("2026-09-01") stays that calendar day */
export const fmtTime = (iso: string | null | undefined, pattern = 'dd MMM yyyy HH:mm') => {
  if (!iso) return '--';
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? '--' : format(d, pattern);
};

/** "3d 4h", "2h 05m", "4m" */
export const fmtDuration = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${String(min).padStart(2, '0')}m`;
  return `${min}m`;
};

/** "12 s ago", "5 min ago", "3 h ago", "2 d ago" */
export const timeAgo = (iso: string | null | undefined, now: number) => {
  if (!iso) return '--';
  const s = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

/** "in 12 min", "in 2 h", "due" */
export const timeUntil = (iso: string | null | undefined, now: number) => {
  if (!iso) return '--';
  const s = Math.floor((Date.parse(iso) - now) / 1000);
  if (s <= 0) return 'due';
  if (s < 3600) return `in ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `in ${Math.round(s / 3600)} h`;
  return `in ${Math.round(s / 86400)} d`;
};

/** snake_case key as a sentence ("mau_valve_max" → "Mau valve max") */
export const humanize = (key: string) => {
  const s = key.replace(/[_.]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : key;
};

/** Equipment alias as an instrument tag (CHWS_01 → CHWS-01) */
export const assetTag = (alias: string | null | undefined) =>
  alias ? alias.replace('_', '-') : '--';

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** A finite number, else null */
export const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Signed change with a real minus sign ("+0.5", "−12", "±0") */
export const signed = (v: number, digits: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmtNum(Math.abs(v), digits)}`;

/** Keys in the order of a metadata table; unknown keys last, alphabetically */
export const ordered = (keys: Iterable<string>, order: Record<string, unknown>) => {
  const known = Object.keys(order);
  return [...new Set(keys)].sort((a, b) => {
    const ia = known.indexOf(a);
    const ib = known.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  });
};

// ----------------------------------------------------- set points & plant
type PointMeta = { label: string; unit: string; digits: number };

/**
 * Supervisory set points the optimizer moves (keys of `current/recommended.setpoints`) and the
 * CHWS_01 parameters its actions write. Unknown keys fall back to a humanised key.
 */
export const SETPOINT_META: Record<string, PointMeta> = {
  chws_sp: { label: 'CHW supply set point', unit: '°C', digits: 1 },
  approach_sp: { label: 'Tower approach set point', unit: 'K', digits: 1 },
  riser_dp_sp: { label: 'Riser DP set point', unit: 'kPa', digits: 0 },
  chillers: { label: 'Duty chillers', unit: '', digits: 0 },
  chillers_sp: { label: 'Duty chillers set point', unit: '', digits: 0 },
  twv_min_pos: { label: '3-way valve min position', unit: '%', digits: 0 },
  cw_min_temp: { label: 'Min condenser water temp', unit: '°C', digits: 1 },
  chws_reset_mode: { label: 'CHW set point mode', unit: '', digits: 0 },
  staging_mode: { label: 'Chiller staging mode', unit: '', digits: 0 },
};

/** Decision bounds of the optimizer (optimizer.py DECISIONS = the CHWS_01 control limits) */
export const SETPOINT_BOUNDS: Record<string, [number, number]> = {
  chws_sp: [5.5, 8],
  approach_sp: [2, 6],
  riser_dp_sp: [80, 160],
  chillers: [1, 3],
  twv_min_pos: [0, 30],
};

/** Option labels of the control modes a recommendation switches (value 0 = automatic) */
export const MODE_OPTIONS: Record<string, string[]> = {
  chws_reset_mode: ['Reset', 'Manual'],
  staging_mode: ['Load', 'Manual'],
};

/** Surrogate predictions and validation KPIs; `better` marks the direction of improvement */
export const PREDICTED_META: Record<string, PointMeta & { better?: 'lower' | 'higher' }> = {
  plant_kw: { label: 'Plant power', unit: 'kW', digits: 0, better: 'lower' },
  kw_per_rt: { label: 'Plant efficiency', unit: 'kW/RT', digits: 3, better: 'lower' },
  chiller_kw: { label: 'Chiller power', unit: 'kW', digits: 0, better: 'lower' },
  chwp_kw: { label: 'CHW pump power', unit: 'kW', digits: 1, better: 'lower' },
  cwp_kw: { label: 'CW pump power', unit: 'kW', digits: 1, better: 'lower' },
  tower_kw: { label: 'Tower fan power', unit: 'kW', digits: 1, better: 'lower' },
  chws_temp: { label: 'CHW supply temp', unit: '°C', digits: 2 },
  riser_dp: { label: 'Riser DP', unit: 'kPa', digits: 0 },
  mau_valve_max: { label: 'Max MAU CHW valve', unit: '%', digits: 0 },
  mau_sat_dev_max: { label: 'Max MAU supply air deviation', unit: 'K', digits: 2 },
  cw_supply_temp: { label: 'CW supply temp', unit: '°C', digits: 2 },
  fan_speed_cmd: { label: 'Tower fan command', unit: '%', digits: 0 },
  chwp_speed_cmd: { label: 'CHW pump command', unit: 'Hz', digits: 1 },
};

/** Operating conditions the optimizer ran for */
export const CONDITION_META: Record<string, PointMeta & { scale?: number }> = {
  wet_bulb: { label: 'Wet bulb', unit: '°C', digits: 1 },
  dry_bulb: { label: 'Dry bulb', unit: '°C', digits: 1 },
  load_frac: { label: 'Plant load', unit: '%', digits: 0, scale: 100 },
  cooling_load_kw: { label: 'Cooling load', unit: 'kW', digits: 0 },
  chillers_running: { label: 'Chillers running', unit: '', digits: 0 },
  cw_min_temp: { label: 'Min condenser water temp', unit: '°C', digits: 1 },
};

export const setpointMeta = (key: string): PointMeta =>
  SETPOINT_META[key] ?? { label: humanize(key), unit: '', digits: 2 };

export const predictedMeta = (key: string): PointMeta & { better?: 'lower' | 'higher' } =>
  PREDICTED_META[key] ?? { label: humanize(key), unit: '', digits: 2 };

/** A control mode value as its option label ("Manual"); unknown values stay numeric */
export const modeText = (param: string, value: number) =>
  MODE_OPTIONS[param]?.[value] ?? String(value);

/** The value an action writes, as the operator reads it ("Manual", "7.2 °C") */
export const actionValue = (a: RecommendationAction) => {
  if (MODE_OPTIONS[a.param]) return modeText(a.param, a.value);
  const meta = SETPOINT_META[a.param];
  const digits = meta ? meta.digits : Number.isInteger(a.value) ? 0 : 2;
  return withUnit(fmtNum(a.value, digits), a.unit || meta?.unit);
};

/**
 * Name of the parameter an action writes. The optimizer's own label is a whole sentence
 * ("CHW Supply Set Point: 6.5 → 7.0 °C"), so only its name part is a fallback for parameters
 * this page does not know.
 */
export const actionLabel = (a: RecommendationAction) =>
  SETPOINT_META[a.param]?.label ?? (a.label?.split(':')[0].trim() || humanize(a.param));

// --------------------------------------------------------------- statuses
export const RECOMMENDATION_STATUS: Record<
  RecommendationStatus,
  { text: string; color: BadgeColor }
> = {
  PROPOSED: { text: 'Proposed', color: 'secondary' },
  VALIDATING: { text: 'Validating on twin', color: 'primary' },
  VALIDATED: { text: 'Validated', color: 'normal' },
  REJECTED: { text: 'Rejected by twin', color: 'critical' },
  APPLIED: { text: 'Applied', color: 'running' },
  EXPIRED: { text: 'Expired', color: 'offline' },
  DISMISSED: { text: 'Dismissed', color: 'offline' },
  FAILED: { text: 'Failed', color: 'critical' },
};

/** Simulation job statuses (twin validation) */
export const jobStatusColor = (status: string): BadgeColor => {
  switch (status) {
    case 'SUCCEEDED':
      return 'normal';
    case 'FAILED':
      return 'critical';
    case 'RUNNING':
    case 'ANALYZING':
      return 'primary';
    case 'PROPOSED':
    case 'QUEUED':
      return 'secondary';
    default:
      return 'offline';
  }
};

export const DOC_STATUS: Record<DocStatus, { text: string; color: BadgeColor }> = {
  PENDING: { text: 'Queued', color: 'secondary' },
  INDEXING: { text: 'Indexing', color: 'primary' },
  READY: { text: 'Ready', color: 'normal' },
  FAILED: { text: 'Failed', color: 'critical' },
};

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  manual: 'Technical manual',
  sop: 'SOP',
  maintenance_report: 'Maintenance report',
  setpoint_log: 'Set point log',
  fdd_reference: 'FDD reference',
  other: 'Other',
};

export const SEVERITY_COLOR: Record<Severity, BadgeColor> = {
  WARNING: 'warning',
  CRITICAL: 'critical',
};

export const CONTROL_STATUS: Record<ControlStatus, { text: string; color: BadgeColor }> = {
  PENDING: { text: 'Waiting for the plant', color: 'primary' },
  APPLIED: { text: 'Applied', color: 'normal' },
  REJECTED: { text: 'Rejected', color: 'critical' },
  TIMEOUT: { text: 'Not confirmed', color: 'warning' },
};

/** Outcome of applying a recommendation (every write, some, none confirmed) */
export const APPLY_OUTCOME: Record<ApplyOutcome, { text: string; color: BadgeColor }> = {
  APPLIED: { text: 'Every write confirmed', color: 'normal' },
  PARTIAL: { text: 'Partly applied', color: 'warning' },
  FAILED: { text: 'Not applied', color: 'critical' },
};

/** Message of a failed request (HttpError, Error or string) */
export const errorText = (err: unknown, fallback = 'The request failed') => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
};

/** A request that failed with HTTP 404 (`statusCode` of the HttpError of jsRequest) */
export const isNotFound = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { statusCode?: unknown }).statusCode === 404;

/** Window choices of the time filters (hours) */
export const WINDOW_OPTIONS = [
  { value: '24', label: 'Last 24 h' },
  { value: '168', label: 'Last 7 days' },
  { value: '720', label: 'Last 30 days' },
  { value: '2160', label: 'Last 90 days' },
];

/** Start of a "last N hours" window, computed at fetch time (never in a query key) */
export const windowStart = (hours: number) =>
  new Date(Date.now() - hours * 3_600_000).toISOString();
