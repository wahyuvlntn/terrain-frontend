import { format, parseISO } from 'date-fns';

import type { LotStatus, ProductionLosses, ToolType } from './api/production.api';

/** Time windows of the page (hours) */
export const WINDOWS = [
  { value: '12', label: 'Last 12 h (shift)' },
  { value: '24', label: 'Last 24 h' },
  { value: '168', label: 'Last 7 days' },
  { value: '720', label: 'Last 30 days' },
] as const;
export const DEFAULT_WINDOW = 24;

/** Days of the daily trend for a window: two weeks, or the window when longer */
export const trendDays = (hours: number) => Math.max(14, Math.ceil(hours / 24));

export const TOOL_TYPE_LABEL: Record<ToolType, string> = {
  LITHO: 'Lithography',
  ETCH: 'Etch',
  CVD: 'CVD',
  PVD: 'PVD',
  ECP: 'Cu plating',
  CMP: 'CMP',
  DIFF: 'Diffusion & RTP',
  IMP: 'Implant',
  WET: 'Wet clean',
  STRIP: 'Resist strip',
  MET: 'Metrology',
  TEST: 'Parametric test',
};

export const LOT_STATUS_LABEL: Record<LotStatus, string> = {
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  AWAY: 'Away',
  HOLD: 'On hold',
  DONE: 'Completed',
  SCRAPPED: 'Scrapped',
};

/** Badge colours of the shared `Badge` */
export type BadgeColor =
  | 'running'
  | 'idle'
  | 'unplanned-down'
  | 'planned-down'
  | 'offline'
  | 'normal'
  | 'warning'
  | 'critical'
  | 'primary'
  | 'secondary';

export const LOT_STATUS_COLOR: Record<LotStatus, BadgeColor> = {
  QUEUED: 'idle',
  PROCESSING: 'running',
  AWAY: 'secondary',
  HOLD: 'warning',
  DONE: 'normal',
  SCRAPPED: 'critical',
};

/** Equipment status (E10 time state) badge */
export const STATUS_BADGE: Record<string, BadgeColor> = {
  RUNNING: 'running',
  IDLE: 'idle',
  'UNPLANNED DOWN': 'unplanned-down',
  'PLANNED DOWN': 'planned-down',
  OFFLINE: 'offline',
};

/** SEMI E10 names of the equipment statuses */
export const E10_LABEL: Record<string, string> = {
  RUNNING: 'Productive',
  IDLE: 'Standby',
  'UNPLANNED DOWN': 'Unscheduled down',
  'PLANNED DOWN': 'Scheduled down',
  OFFLINE: 'Non-scheduled',
};

export const fmtPct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? '--' : `${v.toFixed(digits)} %`;

export const fmtInt = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? '--' : Math.round(v).toLocaleString();

export const fmtDec = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '--'
    : v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtTime = (iso: string | null | undefined, pattern = 'dd MMM HH:mm') => {
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

/** Hours as "12.5 h" (or minutes below an hour) */
export const fmtHours = (h: number | null | undefined) =>
  h === null || h === undefined || !Number.isFinite(h)
    ? '--'
    : h < 1
      ? `${Math.round(h * 60)} min`
      : `${h.toFixed(1)} h`;

/** Rating of an OEE factor: good, fair or poor (OEE: 75 / 60 %; the factors: 95 / 85 %) */
export const rating = (
  v: number | null,
  kind: 'oee' | 'factor' = 'factor'
): 'normal' | 'warning' | 'critical' | null => {
  if (v === null) return null;
  const [good, fair] = kind === 'oee' ? [75, 60] : [95, 85];
  return v >= good ? 'normal' : v >= fair ? 'warning' : 'critical';
};

export type WaterfallBar = {
  key: keyof ProductionLosses;
  label: string;
  /** hours of the bar */
  value: number;
  /** hours below the bar (invisible base of a floating bar) */
  base: number;
  kind: 'total' | 'loss' | 'good';
};

const LOSS_STEPS: { key: keyof ProductionLosses; label: string }[] = [
  { key: 'nonScheduledH', label: 'Non-scheduled' },
  { key: 'scheduledDownH', label: 'Scheduled down' },
  { key: 'unscheduledDownH', label: 'Unscheduled down' },
  { key: 'standbyH', label: 'Standby' },
  { key: 'rateLossH', label: 'Rate loss' },
  { key: 'qualityLossH', label: 'Quality loss' },
];

/**
 * OEE loss waterfall (SEMI E10 / E79): total tool time, minus each loss as a floating bar, down to
 * the good (value-adding) time. The losses are taken from the top of the remaining time.
 */
export const waterfall = (l: ProductionLosses): WaterfallBar[] => {
  const bars: WaterfallBar[] = [
    { key: 'totalH', label: 'Total time', value: l.totalH, base: 0, kind: 'total' },
  ];
  let rest = l.totalH;
  for (const s of LOSS_STEPS) {
    const v = Math.max(0, Math.min(l[s.key], rest));
    rest -= v;
    bars.push({ key: s.key, label: s.label, value: v, base: rest, kind: 'loss' });
  }
  bars.push({
    key: 'goodH',
    label: 'Good time',
    value: Math.max(0, Math.min(l.goodH, l.totalH)),
    base: 0,
    kind: 'good',
  });
  return bars;
};

/** The step code without its layer prefix (POLY-ET -> ET, M3-CMP -> CMP) */
export const stepBase = (code: string | null | undefined, layer?: string | null) => {
  const c = code ?? '';
  if (layer && c.startsWith(`${layer}-`)) return c.slice(layer.length + 1);
  return c;
};

/** Days with one decimal ("14.2 d") */
export const fmtDays = (d: number | null | undefined) =>
  d === null || d === undefined || !Number.isFinite(d) ? '--' : `${d.toFixed(1)} d`;

/** Equipment alias shown as its tag (ETCH_01 -> ETCH-01) */
export const toolTag = (alias: string | null | undefined) => (alias ?? '').replace(/_/g, '-');

/** Digital twin focused on an equipment */
export const twinLink = (alias: string) => `/digital-twin?asset=${encodeURIComponent(alias)}`;
