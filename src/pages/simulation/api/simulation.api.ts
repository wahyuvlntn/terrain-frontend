import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

import { parseTwinTrend } from '../../digital-twin/api/digital-twin.api';

/**
 * Digital twin simulation jobs (backend `simulation/*`, DESIGN.md §4.2). Rows are mapped to
 * camelCase; the scenario `spec` is a JSON document of the simulator and keeps its snake_case keys
 * (it is sent and shown as written).
 */

/** A nullable value that older or sparse responses may also leave out */
const nul = <T extends z.ZodTypeAny>(schema: T) => schema.nullish().transform((v) => v ?? null);
const optNumber = nul(z.number());
const optString = nul(z.string());

// ------------------------------------------------------------------ jobs
export const SimJobStatusEnum = z.enum([
  'PROPOSED',
  'QUEUED',
  'RUNNING',
  'ANALYZING',
  'SUCCEEDED',
  'FAILED',
  'REJECTED',
  'CANCELLED',
]);
export type SimJobStatus = z.infer<typeof SimJobStatusEnum>;

export const SimJobOriginEnum = z.enum(['ui', 'agent', 'optimizer', 'analytics']);
export type SimJobOrigin = z.infer<typeof SimJobOriginEnum>;

export const SimJobKindEnum = z.enum(['scenario', 'doe', 'production']);
export type SimJobKind = z.infer<typeof SimJobKindEnum>;

/** Statuses in which the simulator (or the post-analysis) is still working on a job */
export const SIM_ACTIVE_STATUSES: readonly SimJobStatus[] = ['QUEUED', 'RUNNING', 'ANALYZING'];
/** Statuses whose recorded frames can be replayed (the run itself has finished) */
export const SIM_REPLAYABLE_STATUSES: readonly SimJobStatus[] = ['ANALYZING', 'SUCCEEDED'];

export const jobRowSchema = z.object({
  id: z.number(),
  kind: SimJobKindEnum,
  title: z.string(),
  origin: SimJobOriginEnum,
  status: SimJobStatusEnum,
  /** fraction done, 0..1 */
  progress: z
    .number()
    .nullish()
    .transform((v) => Math.min(Math.max(v ?? 0, 0), 1)),
  rationale: optString,
  requestedBy: optNumber,
  requestedByName: optString,
  approvedByName: optString,
  approvedAt: optString,
  createdAt: z.string(),
  startedAt: optString,
  finishedAt: optString,
  /** simulated window (UTC ISO) */
  simStart: optString,
  simEnd: optString,
  stepS: z
    .number()
    .nullish()
    .transform((v) => v ?? 60),
  recommendationId: optNumber,
  error: optString,
  variants: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
});
/** `JobRow` of the contract */
export type SimJob = z.infer<typeof jobRowSchema>;

export const jobRow = (r: Record<string, unknown>) => ({
  ...r,
  requestedBy: r.requested_by,
  requestedByName: r.requested_by_name,
  approvedByName: r.approved_by_name,
  approvedAt: r.approved_at,
  createdAt: r.created_at,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  simStart: r.sim_start,
  simEnd: r.sim_end,
  stepS: r.step_s,
  recommendationId: r.recommendation_id,
});

// ------------------------------------------------------------------ spec
export const SimActionKindEnum = z.enum([
  'control',
  'fault',
  'clear_fault',
  'trip',
  'offline',
  'maintenance',
  'release',
]);
export type SimActionKind = z.infer<typeof SimActionKindEnum>;

/** One scheduled action of a scenario (minutes after the simulated start) */
export type SimAction = {
  at_min: number;
  kind: SimActionKind;
  asset: string;
  /** control: the written parameter */
  param?: string;
  /** fault / clear_fault: fault kind of the catalog */
  fault?: string;
  /** control: the value (mode option or set point); fault: the intensity */
  value?: number;
  /** fault: cleared after; offline: length; maintenance: released after */
  duration_min?: number;
};

export type SimVariantSpec = { name: string; actions: SimAction[] };

/** Scenario spec as submitted (`kind` of the job: scenario) */
export type SimScenarioSpec = {
  /** UTC ISO, null = now */
  start: string | null;
  duration_min: number;
  initial: 'live' | 'nominal';
  stochastic: boolean;
  /** 0 = derived from the job id */
  seed: number;
  weather: { dry_bulb_offset: number; wet_bulb_offset: number };
  /** × plant cooling load (0.5..1.3) */
  load_scale: number;
  /** common to every variant */
  actions: SimAction[];
  variants: SimVariantSpec[];
};

const actionViewSchema = z
  .object({
    at_min: z.number().catch(0),
    kind: z.string(),
    asset: z.string().catch(''),
    param: z.string().nullish(),
    fault: z.string().nullish(),
    value: z.number().nullish(),
    duration_min: z.number().nullish(),
  })
  .passthrough();
export type SimActionView = z.infer<typeof actionViewSchema>;

/** A stored spec, read leniently for display (scenario or DOE) */
const specViewSchema = z
  .object({
    start: z.string().nullish(),
    duration_min: z.number().nullish(),
    initial: z.string().nullish(),
    stochastic: z.boolean().nullish(),
    seed: z.number().nullish(),
    weather: z
      .object({ dry_bulb_offset: z.number().nullish(), wet_bulb_offset: z.number().nullish() })
      .nullish(),
    load_scale: z.number().nullish(),
    actions: z.array(actionViewSchema).nullish(),
    variants: z
      .array(z.object({ name: z.string(), actions: z.array(actionViewSchema).nullish() }))
      .nullish(),
    samples: z.number().nullish(),
  })
  .passthrough();
export type SimSpecView = z.infer<typeof specViewSchema>;

// --------------------------------------------------------------- summary
const variantSummarySchema = z.object({
  energyKwh: optNumber,
  avgPlantKw: optNumber,
  avgKwPerRt: optNumber,
  peakLoadKw: optNumber,
  avgChwsTemp: optNumber,
  maxChwsTemp: optNumber,
  minRiserDp: optNumber,
  maxMauValve: optNumber,
  alarmCounts: nul(z.object({ warning: z.number().catch(0), critical: z.number().catch(0) })),
  statusChanges: optNumber,
  trips: optNumber,
  /** anomalies found by the post-analysis (a count, or the list) */
  anomalies: nul(z.union([z.number(), z.array(z.unknown())])).transform((v) =>
    Array.isArray(v) ? v.length : v
  ),
  /** anomaly count per detector of the post-analysis (range, flatline, zscore, ewma, spc) */
  anomaliesByDetector: nul(z.record(z.number().catch(0))),
  faultsDetected: z
    .array(
      z.object({
        rule: z.string(),
        asset: optString,
        startedAt: optString,
        confirmedAt: optString,
        intensity: optNumber,
      })
    )
    .nullish()
    .transform((v) => v ?? []),
  constraintViolations: z
    .array(
      z.object({
        constraint: z.string(),
        label: optString,
        /** minutes in violation, and the longest stretch */
        minutes: optNumber,
        longestMin: optNumber,
        /** minutes a violation may last before it fails the run */
        limitMin: optNumber,
        /** start of the first violation (UTC ISO) */
        firstAt: optString,
        worst: optNumber,
        /** equipment involved (duty chiller trips) */
        assets: z
          .array(z.string())
          .nullish()
          .transform((v) => v ?? []),
        /** long enough to fail the run */
        critical: nul(z.boolean()),
      })
    )
    .nullish()
    .transform((v) => v ?? []),
  success: nul(z.boolean()),
  notes: nul(z.union([z.string(), z.array(z.string())])).transform((v) =>
    Array.isArray(v) ? v.join(' ') : v
  ),
});
export type SimVariantSummary = z.infer<typeof variantSummarySchema>;

const variantSummary = (v: Record<string, unknown>) => ({
  energyKwh: v.energy_kwh,
  avgPlantKw: v.avg_plant_kw,
  avgKwPerRt: v.avg_kw_per_rt,
  peakLoadKw: v.peak_load_kw,
  avgChwsTemp: v.avg_chws_temp,
  maxChwsTemp: v.max_chws_temp,
  minRiserDp: v.min_riser_dp,
  maxMauValve: v.max_mau_valve,
  alarmCounts: v.alarm_counts,
  statusChanges: v.status_changes,
  trips: v.trips,
  anomalies: v.anomalies,
  anomaliesByDetector: v.anomalies_by_detector,
  faultsDetected: Array.isArray(v.faults_detected)
    ? (v.faults_detected as Record<string, unknown>[]).map((f) => ({
        ...f,
        startedAt: f.started_at,
        confirmedAt: f.confirmed_at,
      }))
    : v.faults_detected,
  constraintViolations: Array.isArray(v.constraint_violations)
    ? (v.constraint_violations as Record<string, unknown>[]).map((c) => ({
        ...c,
        longestMin: c.longest_min,
        limitMin: c.limit_min,
        firstAt: c.first_at,
      }))
    : v.constraint_violations,
  success: v.success,
  notes: v.notes,
});

export type SimSummary = {
  /** KPIs per variant name (only the variants whose summary could be read) */
  variants: Record<string, SimVariantSummary>;
  /** overall verdict of the post-analysis */
  success: boolean | null;
  reason: string | null;
  /** post-analysis comparison of the non-baseline variants against `baseline` (free form) */
  comparison: Record<string, unknown> | null;
};

const parseSummary = (raw: unknown): SimSummary => {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const variants: Record<string, SimVariantSummary> = {};
  if (s.variants && typeof s.variants === 'object') {
    Object.entries(s.variants as Record<string, unknown>).forEach(([name, v]) => {
      if (!v || typeof v !== 'object') return;
      const parsed = variantSummarySchema.safeParse(variantSummary(v as Record<string, unknown>));
      if (parsed.success) variants[name] = parsed.data;
      else console.warn(`simulation summary of variant ${name} not readable`, parsed.error);
    });
  }
  return {
    variants,
    success: typeof s.success === 'boolean' ? s.success : null,
    reason: typeof s.reason === 'string' ? s.reason : null,
    comparison:
      s.comparison && typeof s.comparison === 'object'
        ? (s.comparison as Record<string, unknown>)
        : null,
  };
};

export type SimJobDetail = SimJob & {
  spec: SimSpecView | null;
  summary: SimSummary;
  /** the summary as stored (production plans: see production-plan.api) */
  rawSummary: unknown;
  /** the spec as stored */
  rawSpec: unknown;
  /** reason given when the job was rejected or cancelled */
  decisionNote: string | null;
};

// ------------------------------------------------------------------ calls
export const SIM_QUERY = {
  jobs: ['SIMULATION_JOBS'] as const,
  job: (jobId: number) => ['SIMULATION_JOB', jobId] as const,
  events: (jobId: number) => ['SIMULATION_EVENTS', jobId] as const,
  frames: (jobId: number, variant: string) => ['SIMULATION_FRAMES', jobId, variant] as const,
  faultCatalog: ['SIMULATION_FAULT_CATALOG'] as const,
};

export type ListJobsParams = {
  status?: readonly SimJobStatus[];
  origin?: SimJobOrigin;
  /** job kinds (empty = all) */
  kind?: readonly SimJobKind[];
  /** ≤ 100 (backend default 20) */
  limit?: number;
  offset?: number;
};

export const listJobs = async ({
  status,
  origin,
  kind,
  limit = 20,
  offset = 0,
}: ListJobsParams = {}) => {
  const data = await jsRequest({
    url: '/simulation/listjobs',
    data: {
      status: status?.length ? status.join(',') : undefined,
      origin,
      kind: kind?.length ? kind.join(',') : undefined,
      limit,
      offset,
    },
  });
  return z
    .object({ total: z.number(), jobs: z.array(jobRowSchema) })
    .parse({ total: data.total, jobs: (data.jobs as Record<string, unknown>[]).map(jobRow) });
};

export const getJob = async (jobId: number): Promise<SimJobDetail> => {
  const data = await jsRequest({ url: '/simulation/getjob', data: { job_id: jobId } });
  const rawSpec = typeof data.spec === 'string' ? JSON.parse(data.spec) : data.spec;
  const rawSummary = typeof data.summary === 'string' ? JSON.parse(data.summary) : data.summary;
  const spec = specViewSchema.safeParse(rawSpec);
  const row = jobRowSchema.parse(jobRow(data));
  return {
    ...row,
    spec: spec.success ? spec.data : null,
    summary:
      row.kind === 'production'
        ? { variants: {}, success: null, reason: null, comparison: null }
        : parseSummary(rawSummary),
    rawSummary,
    rawSpec,
    decisionNote:
      typeof data.decision_note === 'string' && data.decision_note.trim()
        ? data.decision_note
        : null,
  };
};

/** Submits a scenario from the UI (status QUEUED; needs simulation.create) */
export const submitJob = async ({
  title,
  spec,
  rationale,
}: {
  title: string;
  spec: SimScenarioSpec;
  rationale?: string;
}) => {
  const data = await jsRequest({
    url: '/simulation/submit',
    // the spec travels as a JSON string: nested form fields would lose its number / boolean types
    data: { title, spec: JSON.stringify(spec), rationale: rationale || undefined },
  });
  return jobRowSchema.parse(jobRow(data));
};

/** Approves a PROPOSED job, which queues it (a person only: refused for agent-origin calls) */
export const approveJob = async (jobId: number) => {
  const data = await jsRequest({ url: '/simulation/approve', data: { job_id: jobId } });
  return jobRowSchema.parse(jobRow(data));
};

/** Rejects a PROPOSED job (a person only) */
export const rejectJob = async (jobId: number, reason?: string) => {
  const data = await jsRequest({
    url: '/simulation/reject',
    data: { job_id: jobId, reason: reason?.trim() || undefined },
  });
  return jobRowSchema.parse(jobRow(data));
};

/** Cancels a PROPOSED or QUEUED job */
export const cancelJob = async (jobId: number) => {
  const data = await jsRequest({ url: '/simulation/cancel', data: { job_id: jobId } });
  return jobRowSchema.parse(jobRow(data));
};

// ---------------------------------------------------------------- events
export const SimEventKindEnum = z.enum([
  'status',
  'condition',
  'alarm',
  'abnormal',
  'diagnosis',
  'anomaly',
  'fault',
  'control',
  'fault_injected',
  'fault_cleared',
  'trip',
  'note',
]);
export type SimEventKind = z.infer<typeof SimEventKindEnum>;

export const SIM_EVENT_KIND_LABEL: Record<SimEventKind, string> = {
  status: 'Status',
  condition: 'Condition',
  alarm: 'Alarm',
  abnormal: 'Abnormal',
  diagnosis: 'Diagnosis',
  anomaly: 'Anomaly',
  fault: 'FDD fault',
  control: 'Control',
  fault_injected: 'Fault injected',
  fault_cleared: 'Fault cleared',
  trip: 'Trip',
  note: 'Note',
};

const simEventSchema = z.object({
  id: z.number(),
  variant: z.string(),
  ts: z.string(),
  endTs: optString,
  assetAlias: optString,
  kind: SimEventKindEnum,
  code: optString,
  severity: optString,
  message: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  value: optNumber,
  details: z
    .record(z.unknown())
    .nullish()
    .transform((v) => v ?? {}),
});
export type SimEvent = z.infer<typeof simEventSchema>;

const simEvent = (e: Record<string, unknown>) => ({
  ...e,
  endTs: e.end_ts,
  assetAlias: e.asset_alias,
});

export type GetEventsParams = {
  jobId: number;
  variant?: string;
  kinds?: readonly SimEventKind[];
  asset?: string;
  /** ≤ 1000 (backend default 200) */
  limit?: number;
  offset?: number;
};

export const getEvents = async ({
  jobId,
  variant,
  kinds,
  asset,
  limit = 200,
  offset = 0,
}: GetEventsParams) => {
  const data = await jsRequest({
    url: '/simulation/getevents',
    data: {
      job_id: jobId,
      variant: variant || undefined,
      kinds: kinds?.length ? kinds.join(',') : undefined,
      asset: asset || undefined,
      limit,
      offset,
    },
  });
  return z
    .object({ total: z.number(), events: z.array(simEventSchema) })
    .parse({ total: data.total, events: (data.events as Record<string, unknown>[]).map(simEvent) });
};

// ---------------------------------------------------------------- frames
const isSeries = (v: unknown): v is (number | null)[] => {
  if (!Array.isArray(v)) return false;
  for (const x of v) if (x !== null && typeof x !== 'number') return false;
  return true;
};

const framesSchema = z.object({
  jobId: z.number(),
  variant: z.string(),
  /** time of sample 0 (UTC ISO); sample i is at t0 + i × stepS. Null when nothing was recorded */
  t0: optString,
  stepS: z.number().positive(),
  steps: z.number(),
  /**
   * equipment of the series; a recorded alias the plant no longer has (no id) keeps its series
   * but is left out here, as it can't be bound to the twin
   */
  assets: z
    .array(
      z.object({
        alias: z.string(),
        id: optNumber,
        name: optString,
        typeName: optString,
        modelName: optString,
      })
    )
    .transform((list) =>
      list.flatMap(({ id, ...a }) =>
        id === null
          ? []
          : [
              {
                ...a,
                id,
                name: a.name ?? a.alias,
                typeName: a.typeName ?? '',
                modelName: a.modelName ?? '',
              },
            ]
      )
    ),
  /** measured values: series[asset alias][parameter alias][step] (a plain loop check: frames are big) */
  series: z.record(z.record(z.custom<(number | null)[]>(isSeries, 'not a number series'))),
  states: z.array(
    z.object({
      alias: z.string(),
      kind: z.enum(['status', 'condition']),
      value: z.string(),
      start: z.string(),
      end: optString,
    })
  ),
  events: z.array(simEventSchema),
});
export type SimFrames = z.infer<typeof framesSchema>;
export type SimFramesAsset = SimFrames['assets'][number];

export type GetFramesParams = {
  jobId: number;
  /** default: the job's first variant */
  variant?: string;
  /** only these equipment (default all) */
  aliases?: readonly string[];
};

export const getFrames = async ({ jobId, variant, aliases }: GetFramesParams) => {
  const data = await jsRequest({
    url: '/simulation/getframes',
    data: {
      job_id: jobId,
      variant: variant || undefined,
      aliases: aliases?.length ? aliases.join(',') : undefined,
    },
  });
  return framesSchema.parse({
    ...data,
    jobId: data.job_id,
    stepS: data.step_s,
    assets: (data.assets as Record<string, unknown>[]).map((a) => ({
      ...a,
      typeName: a.type_name,
      modelName: a.model_name,
    })),
    events: ((data.events ?? []) as Record<string, unknown>[]).map(simEvent),
  });
};

// ----------------------------------------------------------------- trend
export type GetTrendParams = {
  jobId: number;
  variant: string;
  assetAlias: string;
  paramAlias: string;
  /** end of the window (UTC ISO; default the end of the run) */
  at?: string;
  /** 5..1440 (default 60) */
  minutes?: number;
};

/** Trend and SPC of a simulated parameter over the window ending at `at` (shape of the live trend) */
export const getTrend = async ({
  jobId,
  variant,
  assetAlias,
  paramAlias,
  at,
  minutes = 60,
}: GetTrendParams) => {
  const data = await jsRequest({
    url: '/simulation/gettrend',
    data: {
      job_id: jobId,
      variant,
      asset_alias: assetAlias,
      param_alias: paramAlias,
      at: at || undefined,
      minutes,
    },
  });
  // a simulated series is not a stored equipment parameter: it may come without an id
  return parseTwinTrend({ ...data, id: typeof data.id === 'number' ? data.id : 0 });
};

// ---------------------------------------------------------- fault catalog
const faultCatalogSchema = z.array(
  z.object({
    kind: z.string(),
    /** asset scope of the FDD rule that detects it (chiller, tower or plant) */
    assetKind: z.string(),
    assets: z.array(z.string()),
    /** documented intensities (LBNL); empty = any value */
    intensities: z
      .array(z.number())
      .nullish()
      .transform((v) => v ?? []),
    unit: z
      .string()
      .nullish()
      .transform((v) => v ?? ''),
    label: z.string(),
    /** alarm / FDD rule code it raises */
    code: optString,
  })
);
export type SimFault = z.infer<typeof faultCatalogSchema>[number];

export const getFaultCatalog = async () => {
  const data = await jsRequest({ url: '/simulation/getfaultcatalog', data: {} });
  return faultCatalogSchema.parse(
    (data as Record<string, unknown>[]).map((f) => ({ ...f, assetKind: f.asset_kind }))
  );
};
