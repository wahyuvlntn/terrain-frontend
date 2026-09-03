import { ConditionEnum, StatusEnum } from '@digital-twin/components';
import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const nullableNumber = z.number().nullable();
const limitsSchema = z.object({ lower: nullableNumber, upper: nullableNumber });

// ---------------------------------------------------------------- assets
const twinAssetSchema = z.object({
  id: z.number(),
  alias: z.string(),
  name: z.string(),
  typeName: z.string(),
  modelName: z.string(),
  locationId: z.number(),
  status: StatusEnum.nullable(),
  condition: ConditionEnum.nullable(),
  statusStartTime: z.string().nullable(),
  conditionStartTime: z.string().nullable(),
});
export type TwinAsset = z.infer<typeof twinAssetSchema>;

export const getTwinAssets = async () => {
  const data = await jsRequest({ url: '/digital_twin/getassets', data: {} });
  return z.array(twinAssetSchema).parse(
    (data as Record<string, unknown>[]).map((a) => ({
      ...a,
      typeName: a.type_name,
      modelName: a.model_name,
      locationId: a.location_id,
      statusStartTime: a.status_start_time,
      conditionStartTime: a.condition_start_time,
    }))
  );
};

// ------------------------------------------------------------ parameters
/**
 * Control definition of a writable parameter: a set point (min / max / step) or a control mode
 * (options; value 0 is automatic).
 */
const twinControlSchema = z.object({
  min: nullableNumber,
  max: nullableNumber,
  step: nullableNumber,
  options: z.array(z.object({ value: z.number(), label: z.string() })).nullable(),
  /** mode parameter that must be out of automatic before this set point can be written */
  mode: z.string().nullable(),
  /** measured parameter the control drives */
  target: z.string().nullable(),
});
export type TwinControl = z.infer<typeof twinControlSchema>;

const twinParameterSchema = z.object({
  id: z.number(),
  alias: z.string(),
  name: z.string(),
  unit: z.string(),
  dataType: z.string(),
  /** display decimals of the parameter */
  scale: nullableNumber.optional(),
  value: z.union([z.number(), z.string()]).nullable(),
  timestamp: z.string().nullable(),
  condition: ConditionEnum,
  warning: limitsSchema,
  critical: limitsSchema,
  spc: z.object({
    ucl: nullableNumber,
    lcl: nullableNumber,
    centerLine: nullableNumber,
    sigma: nullableNumber,
    usl: nullableNumber,
    lsl: nullableNumber,
  }),
  /** set by writable parameters (set points and control modes); older backends omit it */
  control: twinControlSchema.nullish().transform((c) => c ?? null),
});
export type TwinParameter = z.infer<typeof twinParameterSchema>;

export const getTwinAssetParameters = async (assetId: number) => {
  const data = await jsRequest({
    url: '/digital_twin/getassetparameters',
    data: { asset_id: assetId },
  });
  return z.array(twinParameterSchema).parse(
    (data as Record<string, Record<string, unknown>>[]).map((p) => ({
      ...p,
      dataType: p.data_type,
      spc: { ...p.spc, centerLine: p.spc.center_line },
    }))
  );
};

// --------------------------------------------------------------- control
export const ControlStatusEnum = z.enum(['PENDING', 'APPLIED', 'REJECTED', 'TIMEOUT']);
export type ControlStatus = z.infer<typeof ControlStatusEnum>;

const twinControlRequestSchema = z.object({
  id: z.number(),
  assetId: z.number(),
  parameterId: z.number(),
  alias: z.string(),
  name: z.string(),
  unit: z.string(),
  scale: nullableNumber,
  oldValue: nullableNumber,
  value: z.number(),
  status: ControlStatusEnum,
  reason: z.string().nullable(),
  requestedAt: z.string(),
  completedAt: z.string().nullable(),
  username: z.string().nullable(),
  userName: z.string().nullable(),
});
export type TwinControlRequest = z.infer<typeof twinControlRequestSchema>;

const controlRequest = (r: Record<string, unknown>) => ({
  ...r,
  assetId: r.asset_id,
  parameterId: r.parameter_id,
  oldValue: r.old_value,
  requestedAt: r.requested_at,
  completedAt: r.completed_at,
  userName: r.user_name,
});

/**
 * Writes a set point or control mode to the plant. Resolves once the plant has confirmed the new
 * value (APPLIED), refused it (REJECTED, with a reason) or not confirmed it in time (TIMEOUT).
 */
export const writeTwinParameter = async (parameterId: number, value: number) => {
  const data = await jsRequest({
    url: '/digital_twin/writeparameter',
    data: { parameter_id: parameterId, value },
  });
  return twinControlRequestSchema.parse(controlRequest(data));
};

/** Latest write requests of an equipment, newest first */
export const getTwinControlRequests = async (assetId: number, limit = 10) => {
  const data = await jsRequest({
    url: '/digital_twin/getcontrolrequests',
    data: { asset_id: assetId, limit },
  });
  return z
    .array(twinControlRequestSchema)
    .parse((data as Record<string, unknown>[]).map(controlRequest));
};

// --------------------------------------------------------- live overview
const twinLiveParameterSchema = z.object({
  value: z.union([z.number(), z.string()]).nullable(),
  unit: z.string(),
  /** display decimals of the parameter */
  scale: nullableNumber.optional(),
  condition: ConditionEnum,
  timestamp: z.string().nullable(),
});
export type TwinLiveParameter = z.infer<typeof twinLiveParameterSchema>;

const twinLiveAssetSchema = z.object({
  id: z.number(),
  alias: z.string(),
  name: z.string(),
  typeName: z.string(),
  status: StatusEnum.nullable(),
  statusStartTime: z.string().nullable(),
  condition: ConditionEnum.nullable(),
  conditionStartTime: z.string().nullable(),
  /** every displayed parameter, keyed by model-parameter alias */
  params: z.record(twinLiveParameterSchema),
});
export type TwinLiveAsset = z.infer<typeof twinLiveAssetSchema>;

/**
 * Live state and displayed parameter values of several equipment in one call (BMS plant
 * overview). Unknown aliases and equipment outside the user's scope are left out.
 */
export const getTwinLiveOverview = async (aliases: readonly string[]) => {
  const data = await jsRequest({
    url: '/digital_twin/getliveoverview',
    data: { aliases: aliases.join(',') },
  });
  return z.array(twinLiveAssetSchema).parse(
    (data as Record<string, unknown>[]).map((a) => ({
      ...a,
      typeName: a.type_name,
      statusStartTime: a.status_start_time,
      conditionStartTime: a.condition_start_time,
    }))
  );
};

// ----------------------------------------------------------- live events
export const TwinEventKindEnum = z.enum(['alarm', 'fault', 'anomaly', 'trip']);
export type TwinEventKind = z.infer<typeof TwinEventKindEnum>;

const twinLiveEventSchema = z.object({
  /** "<kind>:<row id>", unique across kinds */
  id: z.string(),
  kind: TwinEventKindEnum,
  /** anything but CRITICAL is shown as a warning */
  severity: z
    .string()
    .transform((s): 'WARNING' | 'CRITICAL' =>
      s.toUpperCase() === 'CRITICAL' ? 'CRITICAL' : 'WARNING'
    ),
  asset: z.object({ id: z.number(), alias: z.string(), name: z.string() }),
  title: z.string(),
  detail: z.string().nullable(),
  startedAt: z.string(),
  /** still going on (alarm not cleared, fault / anomaly ACTIVE, trip interval open) */
  active: z.boolean(),
});
export type TwinLiveEvent = z.infer<typeof twinLiveEventSchema>;

/**
 * Alarms, FDD faults, anomalies and trips of the visible equipment that became known after
 * `since` (default and floor: an hour ago), newest first. Poll with `since` = the previous
 * answer's `now`. An event of an unknown kind or shape is left out rather than failing the feed.
 */
export const getTwinLiveEvents = async ({ since, limit }: { since?: string; limit?: number }) => {
  const data = await jsRequest({
    url: '/digital_twin/getliveevents',
    data: { ...(since ? { since } : {}), ...(limit ? { limit } : {}) },
  });
  const res = z
    .object({ now: z.string(), events: z.array(z.record(z.unknown())).nullable() })
    .parse(data);
  const events = (res.events ?? []).flatMap((e) => {
    const parsed = twinLiveEventSchema.safeParse({ ...e, startedAt: e.started_at });
    return parsed.success ? [parsed.data] : [];
  });
  return { now: res.now, events };
};

// ------------------------------------------------------ overhead transport
const time = z.string().transform((s) => Date.parse(s));
const amhsAnchorSchema = z.object({ t: time, s: z.number() });
const amhsSegSchema = z.object({
  t0: time,
  t1: time,
  track: z.string(),
  s0: z.number(),
  s1: z.number(),
  hoist: z.enum(['pick', 'drop']).optional(),
  port: z.string().optional(),
  lot: z.string().optional(),
});
const listOf = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((v) => v ?? []);
const amhsStateSchema = z.object({
  now: time,
  speed: z.number(),
  hoist_s: z.number(),
  vehicles: listOf(
    z.object({
      id: z.string(),
      before: amhsAnchorSchema,
      after: amhsAnchorSchema,
      segs: listOf(amhsSegSchema),
    })
  ),
  ports: listOf(
    z.object({
      port: z.string(),
      lot: z.string(),
      product: z.string().optional(),
      hot: z.boolean().optional(),
      from: time.optional(),
      until: time.optional(),
    })
  ),
  stockers: z
    .record(z.number())
    .nullish()
    .transform((v) => v ?? {}),
  moving: z.number(),
});

/**
 * The simulated overhead transport of FAB1 (vehicles' plans, FOUPs on the load ports, stocker
 * counts; times in epoch ms), when it was saved, the server time and when the answer arrived (for
 * the clock offset). `state` is null when there is none (or no process tool is visible).
 */
export const getTwinAmhs = async () => {
  const data = await jsRequest({ url: '/digital_twin/getamhs' });
  const receivedAt = Date.now();
  const res = z
    .object({ served_at: time, updated_at: time.optional(), state: amhsStateSchema.nullable() })
    .parse(data);
  const state = res.state ? { ...res.state, hoistS: res.state.hoist_s } : null;
  return { servedAt: res.served_at, updatedAt: res.updated_at ?? null, receivedAt, state };
};
export type TwinAmhs = Awaited<ReturnType<typeof getTwinAmhs>>;

// ----------------------------------------------------------------- trend
const trendPointSchema = z.object({
  timestamp: z.string(),
  value: z.number().nullable(),
  /**
   * The sample lies inside a RUNNING interval of the equipment (SPC uses running samples only).
   * Older backends omit it: a missing flag counts as running.
   */
  running: z
    .boolean()
    .nullish()
    .transform((v) => v !== false),
});

const twinTrendSchema = z.object({
  id: z.number(),
  name: z.string(),
  unit: z.string(),
  minutes: z.number(),
  data: z.array(trendPointSchema),
  warning: limitsSchema,
  critical: limitsSchema,
  spc: z.object({
    centerLine: nullableNumber,
    sigma: nullableNumber,
    ucl: nullableNumber,
    lcl: nullableNumber,
    usl: nullableNumber,
    lsl: nullableNumber,
    computed: z.boolean(),
  }),
  stats: z.object({
    count: z.number(),
    mean: nullableNumber,
    stdDev: nullableNumber,
    min: nullableNumber,
    max: nullableNumber,
    cp: nullableNumber,
    cpk: nullableNumber,
    /** non-null samples left out of SPC because the unit was not running (older backends: 0) */
    excluded: z
      .number()
      .nullish()
      .transform((v) => v ?? 0),
  }),
  violations: z.array(
    z.object({ timestamp: z.string(), value: z.number(), rules: z.array(z.string()) })
  ),
});
export type TwinTrend = z.infer<typeof twinTrendSchema>;

/** Parses a trend response (live parameter trend, or the trend of a simulated series) */
export const parseTwinTrend = (data: Record<string, Record<string, unknown>>) =>
  twinTrendSchema.parse({
    ...data,
    spc: { ...data.spc, centerLine: data.spc.center_line },
    stats: { ...data.stats, stdDev: data.stats.std_dev },
  });

export const getTwinParameterTrend = async (parameterId: number, minutes: number) => {
  const data = await jsRequest({
    url: '/digital_twin/getparametertrend',
    data: { parameter_id: parameterId, minutes },
  });
  return parseTwinTrend(data);
};

// --------------------------------------------------------------- summary
const intervalSchema = z.object({ value: z.string(), start: z.string(), end: z.string() });
const uptimeSchema = z.object({
  uptime: z.number(),
  runningHours: z.number(),
  totalHours: z.number(),
});

const twinSummarySchema = z.object({
  id: z.number(),
  alias: z.string(),
  name: z.string(),
  typeName: z.string(),
  modelName: z.string(),
  location: z.string(),
  image: z.string().nullable(),
  status: StatusEnum.nullable(),
  statusStartTime: z.string().nullable(),
  condition: ConditionEnum.nullable(),
  conditionStartTime: z.string().nullable(),
  hours: z.number(),
  from: z.string(),
  to: z.string(),
  statuses: z.array(intervalSchema),
  conditions: z.array(intervalSchema),
  uptimeWindow: uptimeSchema,
  uptime7d: uptimeSchema,
  runningHours: z.number(),
  warningCounts: z.number(),
  criticalCounts: z.number(),
  alarms: z.array(
    z.object({
      name: z.string(),
      severity: z.string(),
      message: z.string(),
      type: z.string(),
      start: z.string(),
      end: z.string().nullable(),
      active: z.boolean(),
    })
  ),
  maintenances: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      type: z.string(),
      status: z.string(),
      issue: z.string().nullable(),
      plannedStart: z.string(),
      updatedAt: z.string(),
    })
  ),
});
export type TwinAssetSummary = z.infer<typeof twinSummarySchema>;

const uptime = (u: Record<string, unknown>) => ({
  uptime: u.uptime,
  runningHours: u.running_hours,
  totalHours: u.total_hours,
});

export const getTwinAssetSummary = async (assetId: number, hours = 24) => {
  const data = await jsRequest({
    url: '/digital_twin/getassetsummary',
    data: { asset_id: assetId, hours },
  });
  return twinSummarySchema.parse({
    ...data,
    typeName: data.type_name,
    modelName: data.model_name,
    statusStartTime: data.status_start_time,
    conditionStartTime: data.condition_start_time,
    uptimeWindow: uptime(data.uptime_window),
    uptime7d: uptime(data.uptime_7d),
    runningHours: data.running_hours,
    warningCounts: data.warning_counts,
    criticalCounts: data.critical_counts,
    maintenances: (data.maintenances as Record<string, unknown>[]).map((m) => ({
      ...m,
      plannedStart: m.planned_start,
      updatedAt: m.updated_at,
    })),
  });
};
