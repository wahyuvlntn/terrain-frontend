import { getURL, jsRequest, SESSION_ID_HEADER } from '@digital-twin/utils';
import { z } from 'zod';

/**
 * AI Insights backend contracts (docs/agentic/DESIGN.md §4.3–4.5): optimizer recommendations,
 * LBNL fault detection, sensor anomalies, the RAG document library, the FDD rules and the live
 * fault injection of the simulated plant. Rows arrive in snake_case and are mapped to camelCase;
 * JSONB columns keep their own (snake_case) keys, e.g. set point aliases.
 */

// ---------------------------------------------------------------- helpers
const nullableNumber = z.number().nullable();

/** A field that older or partial rows may omit: missing becomes null */
const opt = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().transform((v): z.output<T> | null => v ?? null);

/** A JSONB column: embedded JSON, or a JSON string from encoders that pass the text through */
const json = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }, schema);

const toNumber = (v: unknown) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};

/** `{key: number}` maps (set points, predictions, conditions); non-numeric entries are dropped */
const numberMap = json(
  z
    .record(z.unknown())
    .nullish()
    .transform((r) => {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(r ?? {})) {
        const n = toNumber(v);
        if (n !== null) out[k] = n;
      }
      return out;
    })
);

/** JSONB object with free-form keys (rule parameters and their defaults) */
const jsonObject = json(
  z
    .record(z.unknown())
    .nullish()
    .transform((r) => r ?? {})
);

/** Free-form JSONB value (evidence, details, calibration, twin validation) */
const jsonValue = json(z.unknown()).transform((v) => v ?? null);

/** A Postgres TEXT[]: a JSON array, or the `{a,b}` array literal */
const textArray = z.preprocess(
  (v) =>
    typeof v === 'string'
      ? v
          .replace(/^\{|\}$/g, '')
          .split(',')
          .map((s) => s.trim().replace(/^"|"$/g, ''))
          .filter(Boolean)
      : v,
  z
    .array(z.string())
    .nullish()
    .transform((a) => a ?? [])
);

/** Top-level snake_case keys to camelCase (nested JSONB content is left alone) */
const camel = (row: unknown): Record<string, unknown> =>
  row && typeof row === 'object'
    ? Object.fromEntries(
        Object.entries(row as Record<string, unknown>).map(([k, v]) => [
          k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()),
          v,
        ])
      )
    : {};

const rows = (data: unknown) => (Array.isArray(data) ? data.map(camel) : []);

/** Request payload without empty filters (the backend treats a missing key as "no filter") */
const payload = (data: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)
    )
  );

const csv = (values?: readonly (string | number)[]) =>
  values?.length ? values.join(',') : undefined;

export const SeverityEnum = z.enum(['WARNING', 'CRITICAL']);
export type Severity = z.infer<typeof SeverityEnum>;

export const DetectionStatusEnum = z.enum(['ACTIVE', 'CLEARED']);
export type DetectionStatus = z.infer<typeof DetectionStatusEnum>;

// ------------------------------------------------------- control requests
export const ControlStatusEnum = z.enum(['PENDING', 'APPLIED', 'REJECTED', 'TIMEOUT']);
export type ControlStatus = z.infer<typeof ControlStatusEnum>;

/**
 * A plant write (`asset.control_requests` row, as digital_twin/writeparameter returns it). The
 * results of applying a recommendation add the action's equipment alias and label; a write that
 * could not even be requested (unknown parameter, plant not reporting) comes back REJECTED with
 * no id. When a later write of an apply fails, the modes it changed are written back: those
 * writes are `restore` rows, and the mode's own result says whether it was `restored`.
 */
const controlRequestSchema = z.object({
  id: opt(z.number()),
  assetId: opt(z.number()),
  assetAlias: opt(z.string()),
  parameterId: opt(z.number()),
  alias: opt(z.string()),
  name: opt(z.string()),
  label: opt(z.string()),
  unit: opt(z.string()),
  scale: opt(z.number()),
  oldValue: opt(z.number()),
  value: opt(z.number()),
  status: ControlStatusEnum,
  reason: opt(z.string()),
  requestedAt: opt(z.string()),
  completedAt: opt(z.string()),
  username: opt(z.string()),
  userName: opt(z.string()),
  /** a write-back of a mode this apply had changed */
  restore: z
    .boolean()
    .nullish()
    .catch(null)
    .transform((v) => v === true),
  /** on a mode's result: whether its write-back was confirmed (null: not written back) */
  restored: opt(z.boolean()).catch(null),
});
export type ControlRequest = z.infer<typeof controlRequestSchema>;

/** Control-request rows, each read on its own: a malformed row is dropped, not the list */
const controlRequests = (data: unknown) =>
  rows(data).flatMap((row) => {
    const r = controlRequestSchema.safeParse(row);
    return r.success ? [r.data] : [];
  });

// -------------------------------------------------------- recommendations
export const RecommendationStatusEnum = z.enum([
  'PROPOSED',
  'VALIDATING',
  'VALIDATED',
  'REJECTED',
  'APPLIED',
  'EXPIRED',
  'DISMISSED',
  'FAILED',
]);
export type RecommendationStatus = z.infer<typeof RecommendationStatusEnum>;

/** Set points of an operating point and the surrogate's predictions for it */
const operatingPointSchema = json(
  z
    .object({ setpoints: numberMap, predicted: numberMap })
    .partial()
    .nullish()
    .transform((p) => ({ setpoints: p?.setpoints ?? {}, predicted: p?.predicted ?? {} }))
);
export type OperatingPoint = z.infer<typeof operatingPointSchema>;

/** One plant write of a recommendation, in apply order (modes before their set points) */
const recommendationActionSchema = z.object({
  asset: z.string(),
  param: z.string(),
  value: z.number(),
  unit: opt(z.string()),
  label: opt(z.string()),
});
export type RecommendationAction = z.infer<typeof recommendationActionSchema>;

const simJobRefSchema = z.object({ id: z.number(), status: z.string() });

/**
 * The plant conditions the optimizer ran for (15-minute means): numeric conditions (wet bulb,
 * load…), the control modes in force (`chws_reset_mode`, `staging_mode`: 0 automatic, 1 manual)
 * and the measured plant response.
 */
const conditionsSchema = json(
  z
    .record(z.unknown())
    .nullish()
    .transform((r) => ({
      values: numberMap.parse(r ?? {}),
      modes: numberMap.parse(r?.modes ?? {}),
      measured: numberMap.parse(r?.measured ?? {}),
    }))
);
export type RecommendationConditions = z.infer<typeof conditionsSchema>;

export const ApplyOutcomeEnum = z.enum(['APPLIED', 'PARTIAL', 'FAILED']);
export type ApplyOutcome = z.infer<typeof ApplyOutcomeEnum>;

/**
 * The last apply attempt (`apply_results`): writes stop at the first one the plant does not
 * confirm, so `results` can be shorter than `planned`; `restores` are the write-backs of the modes
 * it had changed (not part of `planned`).
 */
const applyRecordSchema = json(
  z
    .record(z.unknown())
    .nullish()
    .transform((r) => {
      if (!r) return null;
      const outcome = ApplyOutcomeEnum.safeParse(r.status);
      const results = z.array(controlRequestSchema).safeParse(rows(r.results));
      return {
        status: outcome.success ? outcome.data : null,
        byName: typeof r.by_name === 'string' ? r.by_name : typeof r.by === 'string' ? r.by : null,
        at: typeof r.at === 'string' ? r.at : null,
        planned: toNumber(r.planned),
        results: results.success ? results.data : [],
        restores: controlRequests(r.restores),
      };
    })
);
export type ApplyRecord = NonNullable<z.infer<typeof applyRecordSchema>>;

const recommendationSchema = z.object({
  id: z.number(),
  runId: opt(z.number()),
  siteCode: opt(z.string()),
  status: RecommendationStatusEnum,
  conditions: conditionsSchema,
  current: operatingPointSchema,
  recommended: operatingPointSchema,
  actions: json(z.array(recommendationActionSchema).nullish()).transform((a) => a ?? []),
  savingsKw: opt(z.number()),
  savingsPct: opt(z.number()),
  constraints: json(z.array(z.unknown()).nullish()).transform((c) => c ?? []),
  validationJobId: opt(z.number()),
  validation: jsonValue,
  validationJob: opt(simJobRefSchema),
  modelId: opt(z.number()),
  rationale: opt(z.string()),
  createdAt: z.string(),
  validUntil: opt(z.string()),
  decidedBy: opt(z.number()),
  decidedByName: opt(z.string()),
  decidedAt: opt(z.string()),
  decisionNote: opt(z.string()),
  applyResults: applyRecordSchema,
});
export type Recommendation = z.infer<typeof recommendationSchema>;

const parseRecommendation = (r: unknown) => recommendationSchema.parse(camel(r));

export const getRecommendations = async (status?: RecommendationStatus, limit = 10) => {
  const data = await jsRequest({
    url: '/ai_insights/getrecommendations',
    data: payload({ status, limit }),
  });
  return z.array(recommendationSchema).parse(rows(data));
};

export const getRecommendation = async (id: number) => {
  const data = await jsRequest({ url: '/ai_insights/getrecommendation', data: { id } });
  return parseRecommendation(data);
};

/**
 * Writes every action of a validated recommendation to the plant (modes first, then set points),
 * each through the same path as a manual set point write. Resolves with the updated
 * recommendation (APPLIED when every write was confirmed), one control request per write and the
 * write-backs (`restores`) of the modes it changed when a later write failed.
 */
export const applyRecommendation = async (id: number) => {
  const data = await jsRequest({ url: '/ai_insights/applyrecommendation', data: { id } });
  return {
    ...z
      .object({ recommendation: recommendationSchema, results: z.array(controlRequestSchema) })
      .parse({
        recommendation: camel(data?.recommendation),
        results: rows(data?.results),
      }),
    restores: controlRequests(data?.restores),
  };
};

export const dismissRecommendation = async (id: number, note?: string) => {
  const data = await jsRequest({
    url: '/ai_insights/dismissrecommendation',
    data: payload({ id, note: note?.trim() }),
  });
  return parseRecommendation(data);
};

/**
 * Queues a manual optimizer run. When a run is already queued or running, that run comes back
 * instead (`existing`).
 */
export const runOptimizer = async () => {
  const data = await jsRequest({ url: '/ai_insights/runoptimizer', data: {} });
  return z
    .object({
      runId: z.number(),
      status: opt(z.string()),
      existing: z
        .boolean()
        .nullish()
        .transform((v) => v === true),
    })
    .parse(camel(data));
};

// --------------------------------------------------------------- overview
const countsSchema = z.object({ active: z.number(), last24h: z.number() });

const overviewSchema = z.object({
  recommendation: recommendationSchema.nullable(),
  faults: countsSchema,
  anomalies: countsSchema,
  documents: z.object({ ready: z.number(), pending: z.number(), failed: z.number() }),
  optimizer: z.object({
    lastRunAt: opt(z.string()),
    status: opt(z.string()),
    nextRunAt: opt(z.string()),
  }),
  /** Gemini spend today against the daily budget (USD) */
  budget: z.object({ todayUsd: nullableNumber, limitUsd: nullableNumber }),
});
export type AiOverview = z.infer<typeof overviewSchema>;

export const getAiOverview = async () => {
  const data = await jsRequest({ url: '/ai_insights/getoverview', data: {} });
  return overviewSchema.parse({
    ...data,
    recommendation: data?.recommendation ? camel(data.recommendation) : null,
    optimizer: camel(data?.optimizer),
    budget: {
      todayUsd: toNumber(data?.budget?.today_usd),
      limitUsd: toNumber(data?.budget?.limit_usd),
    },
  });
};

// ----------------------------------------------------------------- faults
/**
 * A document chunk retrieved for the RAG maintenance instruction, numbered `[n]` as the
 * instruction cites it; `cited` tells whether the text actually cites it.
 */
const instructionSourceSchema = z.record(z.unknown()).transform((s) => ({
  n: toNumber(s.n ?? s.index ?? s.ref),
  documentId: toNumber(s.document_id ?? s.documentId),
  title: typeof s.title === 'string' ? s.title : null,
  docType: typeof s.doc_type === 'string' ? s.doc_type : null,
  page: toNumber(s.page),
  heading: typeof s.heading === 'string' ? s.heading : null,
  snippet:
    typeof s.snippet === 'string' ? s.snippet : typeof s.content === 'string' ? s.content : null,
  score: toNumber(s.score),
  cited: typeof s.cited === 'boolean' ? s.cited : null,
}));
export type InstructionSource = z.infer<typeof instructionSourceSchema>;

export const InstructionStatusEnum = z.enum(['PENDING', 'READY', 'FAILED', 'SKIPPED']);

const faultSchema = z.object({
  id: z.number(),
  siteCode: opt(z.string()),
  ruleCode: z.string(),
  ruleName: opt(z.string()),
  lbnlFault: opt(z.string()),
  assetId: z.number(),
  assetAlias: opt(z.string()),
  assetName: opt(z.string()),
  severity: SeverityEnum,
  message: z.string(),
  intensityEstimate: opt(z.number()),
  evidence: jsonValue,
  startedAt: z.string(),
  lastSeenAt: z.string(),
  endedAt: opt(z.string()),
  status: DetectionStatusEnum,
  instructionStatus: opt(InstructionStatusEnum),
  instructionMd: opt(z.string()),
  instructionSources: json(z.array(instructionSourceSchema).nullish()).transform((s) => s ?? []),
  instructionModel: opt(z.string()),
  instructionAt: opt(z.string()),
});
export type Fault = z.infer<typeof faultSchema>;

export type FaultQuery = {
  status?: DetectionStatus;
  assetIds?: number[];
  ruleCodes?: string[];
  from?: string;
  to?: string;
  limit?: number;
};

export const getFaults = async ({
  status,
  assetIds,
  ruleCodes,
  from,
  to,
  limit = 50,
}: FaultQuery) => {
  const data = await jsRequest({
    url: '/ai_insights/getfaults',
    data: payload({
      status,
      asset_ids: csv(assetIds),
      rule_codes: csv(ruleCodes),
      from,
      to,
      limit,
    }),
  });
  return z.array(faultSchema).parse(rows(data));
};

/** A fault with its evidence and the RAG maintenance instruction (Markdown, cited sources) */
export const getFault = async (id: number) => {
  const data = await jsRequest({ url: '/ai_insights/getfault', data: { id } });
  return faultSchema.parse(camel(data));
};

// -------------------------------------------------------------- anomalies
export const DetectorEnum = z.enum(['range', 'flatline', 'zscore', 'ewma', 'spc']);
export type Detector = z.infer<typeof DetectorEnum>;

const anomalySchema = z.object({
  id: z.number(),
  siteCode: opt(z.string()),
  assetId: z.number(),
  assetAlias: opt(z.string()),
  assetName: opt(z.string()),
  equipmentParameterId: z.number(),
  paramAlias: z.string(),
  paramName: opt(z.string()),
  unit: opt(z.string()),
  detector: DetectorEnum,
  severity: SeverityEnum,
  score: opt(z.number()),
  value: opt(z.number()),
  expected: opt(z.number()),
  message: opt(z.string()),
  details: jsonValue,
  startedAt: z.string(),
  lastSeenAt: z.string(),
  endedAt: opt(z.string()),
  status: DetectionStatusEnum,
});
export type Anomaly = z.infer<typeof anomalySchema>;

export type AnomalyQuery = {
  status?: DetectionStatus;
  assetIds?: number[];
  detectors?: Detector[];
  from?: string;
  to?: string;
  limit?: number;
};

export const getAnomalies = async ({
  status,
  assetIds,
  detectors,
  from,
  to,
  limit = 100,
}: AnomalyQuery) => {
  const data = await jsRequest({
    url: '/ai_insights/getanomalies',
    data: payload({
      status,
      asset_ids: csv(assetIds),
      detectors: csv(detectors),
      from,
      to,
      limit,
    }),
  });
  return z.array(anomalySchema).parse(rows(data));
};

/** Rows per request of `findAnomaly` (the list's maximum) */
export const ANOMALY_PAGE = 500;

/**
 * One anomaly by id (a deep link the tab's filters may hide), null when it is not found. The API
 * has no id filter, so this pages back through the unfiltered list from the newest, for at most
 * `pages` requests. Ids grow with detection time: an id above every id of a page is not further
 * back, so an id that does not exist costs one request.
 */
export const findAnomaly = async (id: number, pages = 4): Promise<Anomaly | null> => {
  let to: string | undefined;
  for (let i = 0; i < pages; i++) {
    const list = await getAnomalies({ to, limit: ANOMALY_PAGE });
    const hit = list.find((a) => a.id === id);
    if (hit) return hit;
    if (list.length < ANOMALY_PAGE || list.every((a) => a.id < id)) return null;
    // `to` is exclusive: start again at the oldest start, which the page may have cut through
    const next = new Date(Date.parse(list[list.length - 1].startedAt) + 1).toISOString();
    if (next === to) return null;
    to = next;
  }
  return null;
};

// ------------------------------------------------------------------ rules
const ruleSchema = z.object({
  code: z.string(),
  name: z.string(),
  lbnlFault: opt(z.string()),
  description: opt(z.string()),
  assetScope: opt(z.string()),
  signals: json(
    z
      .array(z.object({ lbnl: opt(z.string()), asset: opt(z.string()), param: opt(z.string()) }))
      .nullish()
  ).transform((s) => s ?? []),
  params: jsonObject,
  defaults: jsonObject,
  calibration: jsonValue,
  calibratedAt: opt(z.string()),
  enabled: z.boolean(),
  severity: opt(SeverityEnum),
  version: opt(z.number()),
  updatedBy: opt(z.number()),
  updatedByName: opt(z.string()),
  updatedAt: opt(z.string()),
});
export type FaultRule = z.infer<typeof ruleSchema>;

export const getRules = async () => {
  const data = await jsRequest({ url: '/ai_insights/getrules', data: {} });
  return z.array(ruleSchema).parse(rows(data));
};

/** Enables / disables a rule or replaces its parameters (admins); the rule's version goes up */
export const updateRule = async (
  code: string,
  change: { enabled?: boolean; params?: Record<string, unknown> }
) => {
  const data = await jsRequest({
    url: '/ai_insights/updaterule',
    data: payload({
      code,
      enabled: change.enabled === undefined ? undefined : String(change.enabled),
      params: change.params ? JSON.stringify(change.params) : undefined,
    }),
  });
  return ruleSchema.parse(camel(data));
};

const pointMapSchema = z.object({
  lbnlName: z.string(),
  lbnlUnit: z.string(),
  assetPattern: z.string(),
  paramAlias: z.string(),
  siUnit: z.string(),
  description: z.string(),
});
export type PointMapRow = z.infer<typeof pointMapSchema>;

/** LBNL FDD point names mapped onto the plant's own tags */
export const getPointMap = async () => {
  const data = await jsRequest({ url: '/ai_insights/getpointmap', data: {} });
  return z.array(pointMapSchema).parse(rows(data));
};

// -------------------------------------------------------------- documents
export const DocTypeEnum = z.enum([
  'manual',
  'sop',
  'maintenance_report',
  'setpoint_log',
  'fdd_reference',
  'other',
]);
export type DocType = z.infer<typeof DocTypeEnum>;

export const DocStatusEnum = z.enum(['PENDING', 'INDEXING', 'READY', 'FAILED']);
export type DocStatus = z.infer<typeof DocStatusEnum>;

const documentSchema = z.object({
  id: z.number(),
  title: z.string(),
  docType: DocTypeEnum,
  source: opt(z.enum(['upload', 'generated'])),
  fileName: opt(z.string()),
  sizeBytes: opt(z.number()),
  siteCode: opt(z.string()),
  unit: opt(z.string()),
  assetType: opt(z.string()),
  alarmCodes: textArray,
  docDate: opt(z.string()),
  status: DocStatusEnum,
  error: opt(z.string()),
  pages: opt(z.number()),
  chunks: opt(z.number()),
  uploadedByName: opt(z.string()),
  createdAt: opt(z.string()),
  updatedAt: opt(z.string()),
  indexedAt: opt(z.string()),
});
export type AiDocument = z.infer<typeof documentSchema>;

export type DocumentQuery = {
  docType?: DocType;
  status?: DocStatus;
  assetType?: string;
  unit?: string;
  search?: string;
  limit: number;
  offset: number;
};

export const listDocuments = async ({
  docType,
  status,
  assetType,
  unit,
  search,
  limit,
  offset,
}: DocumentQuery) => {
  const data = await jsRequest({
    url: '/ai_documents/list',
    data: payload({
      doc_type: docType,
      status,
      asset_type: assetType,
      unit,
      search: search?.trim(),
      limit,
      offset,
    }),
  });
  return z
    .object({ total: z.number(), documents: z.array(documentSchema) })
    .parse({ total: data?.total, documents: rows(data?.documents) });
};

export type DocumentUpload = {
  file: File;
  title: string;
  docType: DocType;
  assetType?: string;
  unit?: string;
  /** yyyy-MM-dd */
  docDate?: string;
};

/** Uploads a PDF into the library; it is indexed in the background (status PENDING) */
export const uploadDocument = async ({
  file,
  title,
  docType,
  assetType,
  unit,
  docDate,
}: DocumentUpload) => {
  const data = await jsRequest({
    url: '/ai_documents/upload',
    data: payload({
      file,
      title: title.trim(),
      doc_type: docType,
      asset_type: assetType,
      unit,
      doc_date: docDate,
    }),
  });
  return documentSchema.parse(camel(data));
};

export const deleteDocument = async (id: number) => {
  await jsRequest({ url: '/ai_documents/delete', data: { id } });
  return id;
};

/** Queues the document for indexing again (status PENDING) */
export const reindexDocument = async (id: number) => {
  await jsRequest({ url: '/ai_documents/reindex', data: { id } });
  return id;
};

/**
 * The original PDF from the private document store. A plain fetch with the session header (the
 * file route is not a script, so it has no JSON envelope); the caller turns the blob into an
 * object URL and revokes it.
 */
export const fetchDocumentFile = async (id: number, signal?: AbortSignal) => {
  const session = window.localStorage.getItem(SESSION_ID_HEADER);
  const res = await fetch(`${getURL()}/api/ai/documents/${id}/file`, {
    headers: session ? { [SESSION_ID_HEADER]: session } : {},
    signal,
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Your session has expired: sign in again.');
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message || body?.error || message;
    } catch {
      message = `${message} (HTTP ${res.status})`;
    }
    throw new Error(message);
  }
  return res.blob();
};

// -------------------------------------------------------- fault injection
const faultCatalogSchema = z.object({
  kind: z.string(),
  assetKind: opt(z.string()),
  assets: z.array(z.string()),
  intensities: z.array(z.number()),
  unit: opt(z.string()),
  label: z.string(),
  code: opt(z.string()),
});
export type FaultCatalogEntry = z.infer<typeof faultCatalogSchema>;

/** Injectable LBNL faults with their documented intensities */
export const getFaultCatalog = async () => {
  const data = await jsRequest({ url: '/simulation/getfaultcatalog', data: {} });
  return z.array(faultCatalogSchema).parse(rows(data));
};

const activeFaultSchema = z.object({
  alias: z.string(),
  assetId: opt(z.number()),
  kind: z.string(),
  value: opt(z.number()),
  /** progression of a ramping fault (0..1) */
  sev: opt(z.number()),
  start: opt(z.string()),
  /** catalog label and FDD rule code (injectable LBNL faults only) */
  label: opt(z.string()),
  code: opt(z.string()),
});
export type ActivePlantFault = z.infer<typeof activeFaultSchema>;

/** Faults active in the live simulated plant (injected and random ones) */
export const getActivePlantFaults = async () => {
  const data = await jsRequest({ url: '/digital_twin/getactivefaults', data: {} });
  return z.array(activeFaultSchema).parse(rows(data));
};

/** Injects or clears a fault in the live simulated plant (admins with Digital Twin › Update) */
export const injectFault = async (
  assetId: number,
  fault: string,
  value: number | null,
  action: 'inject' | 'clear'
) => {
  const data = await jsRequest({
    url: '/digital_twin/injectfault',
    data: payload({ asset_id: assetId, fault, value: value ?? undefined, action }),
  });
  return z.object({ status: z.string() }).parse(data);
};

// -------------------------------------------------- plant (digital twin)
const assetSchema = z.object({
  id: z.number(),
  alias: z.string(),
  name: z.string(),
  typeName: z.string(),
});
export type InsightAsset = z.infer<typeof assetSchema>;

/** The equipment the user can see (asset filters, upload metadata, fault injection targets) */
export const getInsightAssets = async () => {
  const data = await jsRequest({ url: '/digital_twin/getassets', data: {} });
  return z.array(assetSchema).parse(rows(data));
};

const limitsSchema = z.object({ lower: nullableNumber, upper: nullableNumber });

const trendSchema = z.object({
  id: z.number(),
  name: z.string(),
  unit: z.string(),
  minutes: z.number(),
  data: z.array(
    z.object({
      timestamp: z.string(),
      value: nullableNumber,
      running: z
        .boolean()
        .nullish()
        .transform((v) => v !== false),
    })
  ),
  warning: limitsSchema,
  critical: limitsSchema,
});
export type ParameterTrend = z.infer<typeof trendSchema>;

/** Logged values of an equipment parameter over the last `minutes` (5..10080) */
export const getParameterTrend = async (parameterId: number, minutes: number) => {
  const data = await jsRequest({
    url: '/digital_twin/getparametertrend',
    data: { parameter_id: parameterId, minutes },
  });
  return trendSchema.parse(data);
};

// ---------------------------------------------------------------- queries
/** react-query keys; everything starts with AI_INSIGHTS, so one prefix refreshes the page */
export const AI_INSIGHTS_QUERY = {
  all: ['AI_INSIGHTS'] as const,
  overview: ['AI_INSIGHTS', 'OVERVIEW'] as const,
  recommendations: (status: string, limit: number) =>
    ['AI_INSIGHTS', 'RECOMMENDATIONS', status, limit] as const,
  recommendation: (id: number) => ['AI_INSIGHTS', 'RECOMMENDATION', id] as const,
  faults: (filter: object) => ['AI_INSIGHTS', 'FAULTS', filter] as const,
  fault: (id: number) => ['AI_INSIGHTS', 'FAULT', id] as const,
  anomalies: (filter: object) => ['AI_INSIGHTS', 'ANOMALIES', filter] as const,
  anomaly: (id: number) => ['AI_INSIGHTS', 'ANOMALY', id] as const,
  rules: ['AI_INSIGHTS', 'RULES'] as const,
  pointMap: ['AI_INSIGHTS', 'POINT_MAP'] as const,
  documents: (filter: object) => ['AI_INSIGHTS', 'DOCUMENTS', filter] as const,
  faultCatalog: ['AI_INSIGHTS', 'FAULT_CATALOG'] as const,
  activeFaults: ['AI_INSIGHTS', 'ACTIVE_PLANT_FAULTS'] as const,
  assets: ['AI_INSIGHTS', 'ASSETS'] as const,
  trend: (parameterId: number, minutes: number) =>
    ['AI_INSIGHTS', 'TREND', parameterId, minutes] as const,
};

/** Poll intervals (ms) */
export const AI_INSIGHTS_POLL = {
  overview: 15_000,
  recommendations: 15_000,
  /** while a recommendation is being validated on the twin */
  validating: 5_000,
  faults: 30_000,
  anomalies: 30_000,
  documents: 30_000,
  /** while a document is waiting for or being indexed */
  indexing: 5_000,
  activeFaults: 5_000,
  trend: 30_000,
};
