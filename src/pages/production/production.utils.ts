import { format, parseISO } from 'date-fns';

import { TwinViewOptions, twinUrl } from '../digital-twin/digital-twin.navigation';
import type { Lot, LotFilter, LotStatus, ProductionLosses, ToolType } from './api/production.api';

/** Time windows of the page (hours) */
export const WINDOWS = [
  { value: '12', label: 'Last 12 h (shift)' },
  { value: '24', label: 'Last 24 h' },
  { value: '168', label: 'Last 7 days' },
  { value: '720', label: 'Last 30 days' },
] as const;
export const DEFAULT_WINDOW = 24;

/** Lot filters of the lots tab */
export const LOT_FILTERS: { value: LotFilter; label: string }[] = [
  { value: 'wip', label: 'In the fab' },
  { value: 'hold', label: 'On hold' },
  { value: 'done', label: 'Completed' },
  { value: 'all', label: 'All lots' },
];

/** Windows of the quality tab (hours) */
export const QUALITY_WINDOWS = [
  { value: '24', label: '24 h' },
  { value: '168', label: '7 days' },
  { value: '720', label: '30 days' },
];

/** Windows of the tool timeline (hours) */
export const TIMELINE_WINDOWS = [
  { value: '12', label: '12 h' },
  { value: '24', label: '24 h' },
  { value: '72', label: '3 days' },
  { value: '168', label: '7 days' },
];

export const oneOf = <T extends string>(
  raw: string | null,
  values: readonly T[],
  fallback: T
): T => ((values as readonly string[]).includes(raw ?? '') ? (raw as T) : fallback);

/** A text parameter, trimmed; '' when longer than `max` */
const textParam = (raw: string | null, max: number) => {
  const v = (raw ?? '').trim();
  return v.length <= max ? v : '';
};

// The tabs' filters live in the URL (assistant links, reload): `?tab=lots&lot-status=hold`

/** The lots tab's filters in the URL, else the defaults */
export const lotsFilters = (p: URLSearchParams) => ({
  filter: oneOf(
    p.get('lot-status'),
    LOT_FILTERS.map((f) => f.value),
    'wip'
  ),
  search: textParam(p.get('lot-search'), 40),
  selected: textParam(p.get('lot'), 40) || null,
});

/** The quality tab's filters in the URL, else the defaults */
export const qualityFilters = (p: URLSearchParams) => {
  const tool = p.get('quality-tool') ?? '';
  return {
    charKey: textParam(p.get('char'), 40),
    hours: oneOf(
      p.get('quality-window'),
      QUALITY_WINDOWS.map((w) => w.value),
      '168'
    ),
    toolId: /^\d+$/.test(tool) ? tool : '',
  };
};

/** The tool timeline's window in the URL, else 24 h */
export const timelineWindow = (p: URLSearchParams) =>
  oneOf(
    p.get('timeline-window'),
    TIMELINE_WINDOWS.map((w) => w.value),
    '24'
  );

/**
 * The URL params with a tab's own filters (`[key, value, default]`) written in, a default left
 * out; null when the URL has them already
 */
export const withFilters = (params: URLSearchParams, filters: [string, string, string][]) => {
  const next = new URLSearchParams(params);
  for (const [key, value, fallback] of filters) {
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
  }
  return next.toString() === params.toString() ? null : next;
};

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

/** The fab whose scope production links open in the twin (resolved by name: ids come from the database) */
export const FAB_LOCATION_NAME = 'FAB1 Wafer Fab';

/** How production opens the twin: the whole fab stays visible, plain labels on hover */
export const PRODUCTION_TWIN_VIEW: TwinViewOptions = {
  isolate: false,
  tags: false,
  hover: true,
  tint: true,
  seeThrough: false,
};

/** Digital twin: walking in the fab scope (when known, else the tool's bay) next to the equipment */
export const twinLink = (alias: string, fabLocationId?: number | null) =>
  twinUrl({ locationId: fabLocationId, asset: alias, walk: true, view: PRODUCTION_TWIN_VIEW });

/**
 * Where a lot's FOUP is in 3D: the tool of the load port it sits on (`TOOL:n`) or the batch tool it
 * is inside; in a stocker (not selectable) the lot's tool. Null for lots that left the fab.
 */
export const lotTwinAsset = (lot: Pick<Lot, 'status' | 'location' | 'equipmentAlias'>) => {
  if (lot.status === 'DONE' || lot.status === 'SCRAPPED') return null;
  const loc = lot.location;
  if (loc && !loc.startsWith('STK-')) return /^(.+):\d+$/.exec(loc)?.[1] ?? loc;
  return lot.equipmentAlias ?? null;
};
