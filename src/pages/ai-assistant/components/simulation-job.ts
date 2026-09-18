/**
 * A simulation job as the assistant card needs it, read leniently from the simulation API's job
 * row (camelCase, DESIGN.md 4.2 JobRow + summary). Nested result objects come straight from the
 * job's JSON summary, so every field is looked up under its snake_case and camelCase name.
 */

export type JobStatus =
  | 'PROPOSED'
  | 'QUEUED'
  | 'RUNNING'
  | 'ANALYZING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED';

export const ACTIVE_STATUSES = new Set(['QUEUED', 'RUNNING', 'ANALYZING']);
export const FINISHED_STATUSES = new Set(['SUCCEEDED', 'FAILED']);

export const STATUS_LABEL: Record<string, string> = {
  PROPOSED: 'Awaiting approval',
  QUEUED: 'Queued',
  RUNNING: 'Running',
  ANALYZING: 'Analysing results',
  SUCCEEDED: 'Finished',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const camel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** `obj[key]` under its snake_case or camelCase name */
export const field = (obj: unknown, key: string): unknown => {
  if (!isObj(obj)) return undefined;
  const v = obj[key];
  return v !== undefined ? v : obj[camel(key)];
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export type VariantResult = {
  name: string;
  success: boolean | null;
  energyKwh: number | null;
  avgPlantKw: number | null;
  avgKwPerRt: number | null;
  maxChwsTemp: number | null;
  minRiserDp: number | null;
  warnings: number | null;
  criticals: number | null;
  trips: number | null;
  notes: string;
};

export type JobView = {
  id: number;
  title: string;
  status: string;
  /** 0..100 */
  progress: number | null;
  error: string;
  rationale: string;
  approvedByName: string;
  finishedAt: string;
  success: boolean | null;
  reason: string;
  comparison: unknown;
  variants: VariantResult[];
};

const variantResult = (name: string, v: unknown): VariantResult => {
  const alarms = field(v, 'alarm_counts');
  const notes = field(v, 'notes');
  return {
    name,
    success: typeof field(v, 'success') === 'boolean' ? (field(v, 'success') as boolean) : null,
    energyKwh: num(field(v, 'energy_kwh')),
    avgPlantKw: num(field(v, 'avg_plant_kw')),
    avgKwPerRt: num(field(v, 'avg_kw_per_rt')),
    maxChwsTemp: num(field(v, 'max_chws_temp')),
    minRiserDp: num(field(v, 'min_riser_dp')),
    warnings: num(field(alarms, 'warning')),
    criticals: num(field(alarms, 'critical')),
    trips: num(field(v, 'trips')),
    notes: Array.isArray(notes) ? notes.filter((n) => typeof n === 'string').join(' ') : str(notes),
  };
};

/** The card's view of a job row (any shape: missing fields become empty) */
export const toJobView = (row: unknown, fallbackId: number): JobView => {
  const summary = field(row, 'summary');
  const variants = field(summary, 'variants');
  const progress = num(field(row, 'progress'));
  return {
    id: num(field(row, 'id')) ?? fallbackId,
    title: str(field(row, 'title')),
    status: str(field(row, 'status')).toUpperCase(),
    progress:
      progress === null
        ? null
        : Math.max(0, Math.min(100, progress <= 1 ? progress * 100 : progress)),
    error: str(field(row, 'error')),
    rationale: str(field(row, 'rationale')),
    approvedByName: str(field(row, 'approved_by_name')),
    finishedAt: str(field(row, 'finished_at')),
    success:
      typeof field(summary, 'success') === 'boolean'
        ? (field(summary, 'success') as boolean)
        : null,
    reason: str(field(summary, 'reason')),
    comparison: field(summary, 'comparison') ?? null,
    variants: isObj(variants)
      ? Object.entries(variants).map(([name, v]) => variantResult(name, v))
      : Array.isArray(variants)
        ? variants.map((v, i) => variantResult(str(field(v, 'name')) || `variant ${i + 1}`, v))
        : [],
  };
};

const words = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

const show = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(+v.toFixed(3));
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    const items = v.map(show).filter((s): s is string => s !== null);
    return items.length ? items.join(', ') : null;
  }
  return null;
};

/**
 * Key / value lines of a loosely structured object (the proposal's spec summary, the result
 * comparison): one level of nesting is flattened ("recommended · energy saving pct"), at most
 * `limit` lines.
 */
export const describe = (value: unknown, limit = 10): { label: string; value: string }[] => {
  if (!isObj(value)) return [];
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(value)) {
    if (out.length >= limit) break;
    const shown = show(v);
    if (shown !== null) out.push({ label: words(k), value: shown });
    else if (isObj(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        if (out.length >= limit) break;
        const s2 = show(v2);
        if (s2 !== null) out.push({ label: `${words(k)} · ${words(k2)}`, value: s2 });
      }
    }
  }
  return out;
};
