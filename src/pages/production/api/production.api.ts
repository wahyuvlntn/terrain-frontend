import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

/**
 * Production monitoring of FAB1, the 40 nm line (backend `production/*`, docs/production/DESIGN.md
 * §6): output, cycle time, WIP by area and mask layer, quality per characteristic and the OEE of
 * the 28 production tools. Responses are snake_case and mapped to camelCase. Factors (OEE,
 * availability, operational, rate, quality, uptime, utilization, yields) are percentages, null
 * when undefined for the window (no time or no runs).
 */

/** snake_case keys to camelCase, recursively */
export const camelize = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(camelize);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [
        k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()),
        camelize(x),
      ])
    );
  }
  return v;
};

const num = z.number();
const pct = z
  .number()
  .nullish()
  .transform((v) => v ?? null);
const optNum = z
  .number()
  .nullish()
  .transform((v) => v ?? null);
const optStr = z
  .string()
  .nullish()
  .transform((v) => v ?? null);

/** Process areas of the line, in the flow order of a mask layer */
export const TOOL_TYPES = [
  'LITHO',
  'ETCH',
  'CVD',
  'PVD',
  'ECP',
  'CMP',
  'DIFF',
  'IMP',
  'WET',
  'STRIP',
  'MET',
  'TEST',
] as const;
export const ToolTypeEnum = z.enum(TOOL_TYPES);
export type ToolType = z.infer<typeof ToolTypeEnum>;

export const LotStatusEnum = z.enum(['QUEUED', 'PROCESSING', 'AWAY', 'HOLD', 'DONE', 'SCRAPPED']);
export type LotStatus = z.infer<typeof LotStatusEnum>;

const factors = {
  oee: pct,
  availability: pct,
  operational: pct,
  rate: pct,
  quality: pct,
};

// ------------------------------------------------------------------ overview
const productKpiSchema = z.object({
  productCode: z.string(),
  name: z.string(),
  masks: num,
  plannedCycleDays: optNum,
  lotOuts: num,
  waferOuts: num,
  wipLots: num,
  cycleTimeDays: optNum,
  daysPerMask: optNum,
  xFactor: optNum,
  onTime: pct,
  lineYield: pct,
});
export type ProductKpi = z.infer<typeof productKpiSchema>;

const overviewSchema = z.object({
  window: z.object({ from: z.string(), to: z.string(), hours: num }),
  kpi: z.object({
    ...factors,
    uptime: pct,
    utilization: pct,
    waferStarts: num,
    lotStarts: num,
    waferOuts: num,
    lotOuts: num,
    moves: num,
    waferMoves: num,
    wipLots: num,
    wipWafers: num,
    cycleTimeH: optNum,
    cycleTimeDays: optNum,
    xFactor: optNum,
    onTime: pct,
    lineYield: pct,
    scrapWafers: num,
    reworkWafers: num,
    holdLots: num,
    tools: num,
    /** overhead transport: transfers, mean minutes from request to delivery, fleet busy share */
    transfers: num.default(0),
    transportMin: optNum,
    ohtUtil: pct,
    vehicles: num.default(0),
  }),
  losses: z.object({
    totalH: num,
    nonScheduledH: num,
    scheduledDownH: num,
    unscheduledDownH: num,
    standbyH: num,
    rateLossH: num,
    qualityLossH: num,
    goodH: num,
  }),
  byType: z.array(
    z.object({
      toolType: ToolTypeEnum,
      name: optStr,
      ...factors,
      utilization: pct,
      tools: num,
      wafers: num,
      moves: num,
    })
  ),
  wipByArea: z.array(
    z.object({
      area: ToolTypeEnum,
      name: optStr,
      queued: num,
      processing: num,
      hold: num,
      wafers: num,
    })
  ),
  wipByLayer: z.array(
    z.object({
      layer: z.string(),
      module: optStr,
      queued: num,
      processing: num,
      hold: num,
    })
  ),
  products: z.array(productKpiSchema),
});
export type ProductionOverview = z.infer<typeof overviewSchema>;
export type ProductionLosses = ProductionOverview['losses'];

export const getOverview = async (hours: number) =>
  overviewSchema.parse(
    camelize(await jsRequest({ url: '/production/getoverview', data: { hours } }))
  );

// ------------------------------------------------------------------ tools
const toolSchema = z.object({
  id: num,
  alias: z.string(),
  name: z.string(),
  model: optStr,
  toolType: ToolTypeEnum,
  areaName: optStr,
  status: optStr,
  statusStartTime: optStr,
  condition: optStr,
  currentLot: optStr,
  currentStep: optStr,
  lotProgress: optNum,
  chambersUp: optNum,
  chambersTotal: num,
  queueLots: optNum,
  ...factors,
  uptime: pct,
  utilization: pct,
  wafers: num,
  moves: num,
  throughputWph: optNum,
  avgWph: optNum,
  scrapped: num,
  reworked: num,
  alarms: num,
});
export type ProductionTool = z.infer<typeof toolSchema>;

export const getTools = async (hours: number) =>
  z
    .array(toolSchema)
    .parse(camelize(await jsRequest({ url: '/production/gettools', data: { hours } })));

// ------------------------------------------------------------------ trend
export type TrendBucket = 'day' | 'shift';

const trendSchema = z.object({
  bucket: z.enum(['day', 'shift']),
  points: z.array(
    z.object({
      ts: z.string(),
      ...factors,
      waferOuts: num,
      waferStarts: num,
      waferMoves: num,
      cycleTimeDays: optNum,
      wipLots: optNum,
    })
  ),
});
export type ProductionTrend = z.infer<typeof trendSchema>;

export const getTrend = async (params: {
  days: number;
  bucket?: TrendBucket;
  equipmentId?: number;
  toolType?: ToolType;
}) =>
  trendSchema.parse(
    camelize(
      await jsRequest({
        url: '/production/gettrend',
        data: {
          days: params.days,
          bucket: params.bucket ?? 'day',
          equipment_id: params.equipmentId,
          tool_type: params.toolType,
          timezone_offset: new Date().getTimezoneOffset(),
        },
      })
    )
  );

// ------------------------------------------------------------------ timeline
const timelineSchema = z.object({
  from: z.string(),
  to: z.string(),
  tools: z.array(
    z.object({
      id: num,
      alias: z.string(),
      name: z.string(),
      toolType: ToolTypeEnum,
      intervals: z.array(z.object({ status: z.string(), start: z.string(), end: z.string() })),
      runs: z.array(
        z.object({
          lotCode: z.string(),
          stepCode: z.string(),
          start: z.string(),
          end: optStr,
          wafers: num,
          outcome: optStr,
        })
      ),
    })
  ),
});
export type ProductionTimeline = z.infer<typeof timelineSchema>;
export type TimelineTool = ProductionTimeline['tools'][number];

export const getTimeline = async (hours: number, equipmentIds?: number[]) =>
  timelineSchema.parse(
    camelize(
      await jsRequest({
        url: '/production/gettimeline',
        data: { hours, equipment_ids: equipmentIds?.length ? equipmentIds.join(',') : undefined },
      })
    )
  );

// ------------------------------------------------------------------ lots
const lotSchema = z.object({
  lotCode: z.string(),
  productCode: z.string(),
  priority: num,
  wafersStart: num,
  wafers: num,
  status: LotStatusEnum,
  stepCode: optStr,
  stepName: optStr,
  equipmentAlias: optStr,
  layer: optStr,
  area: optStr,
  seq: num,
  steps: num,
  progressPct: num,
  releasedAt: z.string(),
  completedAt: optStr,
  dueAt: optStr,
  cycleTimeH: num,
  cycleTimeDays: num,
  holdReason: optStr,
  reworkCount: num,
  /** where its FOUP is: a load port (TOOL:n), a stocker (STK-0n) or a batch tool it is inside */
  location: optStr,
  late: z
    .boolean()
    .nullish()
    .transform((v) => v ?? null),
});
export type Lot = z.infer<typeof lotSchema>;

export type LotFilter = 'wip' | 'hold' | 'done' | 'all';

const lotPageSchema = z.object({ count: num, data: z.array(lotSchema) });

export const getLots = async (params: {
  status: LotFilter;
  search?: string;
  productCode?: string;
  area?: ToolType;
  page: number;
  limit: number;
}) =>
  lotPageSchema.parse(
    camelize(
      await jsRequest({
        url: '/production/getlots',
        data: {
          status: params.status,
          search: params.search || undefined,
          product_code: params.productCode || undefined,
          area: params.area || undefined,
          page: params.page,
          limit: params.limit,
        },
      })
    )
  );

const lotDetailSchema = z.object({
  lot: lotSchema,
  steps: z.array(
    z.object({
      id: num,
      seq: num,
      stepCode: z.string(),
      operation: z.string(),
      equipmentAlias: optStr,
      chambers: optStr,
      recipe: z.string(),
      status: z.string(),
      queuedAt: z.string(),
      startedAt: optStr,
      endedAt: optStr,
      wafersIn: num,
      wafersOut: optNum,
      scrapped: num,
      reworked: num,
      theoreticalS: optNum,
      actualS: optNum,
      outcome: optStr,
      batchId: optStr,
      isRework: z.boolean(),
      queueMin: optNum,
    })
  ),
  metrology: z.array(
    z.object({
      measuredAt: z.string(),
      param: z.string(),
      charKey: optStr,
      unit: optStr,
      wafer: num,
      value: num,
      wiwRange: optNum,
      target: optNum,
      lsl: optNum,
      usl: optNum,
      pass: z.boolean(),
      metrologyAlias: optStr,
      sourceAlias: optStr,
      sourceChamber: optStr,
      sourceStepCode: optStr,
    })
  ),
  scrap: z.array(
    z.object({
      at: z.string(),
      wafers: num,
      reason: z.string(),
      stepCode: optStr,
      equipmentAlias: optStr,
      chamber: optStr,
    })
  ),
  /** the FOUP's overhead transfers, newest first */
  transfers: z
    .array(
      z.object({
        kind: z.string(),
        from: z.string(),
        to: z.string(),
        vehicle: z.string(),
        requestedAt: z.string(),
        pickedAt: z.string(),
        deliveredAt: z.string(),
        minutes: num,
        distanceM: optNum,
      })
    )
    .catch([]),
  route: z.array(
    z.object({
      seq: num,
      stepCode: z.string(),
      operation: z.string(),
      toolType: z.string(),
      layer: z.string(),
      area: optStr,
      module: optStr,
      mask: optStr,
      measKey: optStr,
      qtimeH: optNum,
    })
  ),
});
export type LotDetail = z.infer<typeof lotDetailSchema>;
export type RouteStep = LotDetail['route'][number];

export const getLot = async (lotCode: string) =>
  lotDetailSchema.parse(
    camelize(await jsRequest({ url: '/production/getlot', data: { lot_code: lotCode } }))
  );

// ------------------------------------------------------------------ quality
const qualityKeySchema = z.object({
  charKey: z.string(),
  param: z.string(),
  name: optStr,
  unit: optStr,
  target: optNum,
  lsl: optNum,
  usl: optNum,
  n: num,
  fails: num,
  mean: optNum,
  cpk: optNum,
  steps: optStr,
});
export type QualityKey = z.infer<typeof qualityKeySchema>;

export const getQualityKeys = async (hours: number) =>
  z
    .array(qualityKeySchema)
    .parse(camelize(await jsRequest({ url: '/production/getqualitykeys', data: { hours } })));

const qualitySchema = z.object({
  charKey: z.string(),
  name: optStr,
  param: optStr,
  unit: optStr,
  target: optNum,
  lsl: optNum,
  usl: optNum,
  points: z.array(
    z.object({
      ts: z.string(),
      lotCode: z.string(),
      wafer: num,
      value: num,
      sourceAlias: optStr,
      sourceChamber: optStr,
      pass: z.boolean(),
      metrologyAlias: optStr,
    })
  ),
  spc: z
    .object({ cl: num, ucl: num, lcl: num, sigma: num, n: num, cpk: optNum })
    .nullish()
    .transform((v) => v ?? null),
  byChamber: z.array(
    z.object({
      sourceAlias: optStr,
      chamber: optStr,
      n: num,
      mean: num,
      sd: optNum,
      cpk: optNum,
      fails: num,
    })
  ),
  scrapPareto: z.array(z.object({ reason: z.string(), wafers: num })),
  reworkWafers: num,
  firstPassYield: pct,
});
export type ProductionQuality = z.infer<typeof qualitySchema>;

export const getQuality = async (params: {
  charKey: string;
  hours: number;
  equipmentId?: number;
}) =>
  qualitySchema.parse(
    camelize(
      await jsRequest({
        url: '/production/getquality',
        data: {
          char_key: params.charKey || undefined,
          hours: params.hours,
          equipment_id: params.equipmentId,
        },
      })
    )
  );

// ------------------------------------------------------------------ queries
export const PRODUCTION_QUERY = {
  overview: (hours: number) => ['PRODUCTION', 'overview', hours] as const,
  tools: (hours: number) => ['PRODUCTION', 'tools', hours] as const,
  trend: (p: object) => ['PRODUCTION', 'trend', p] as const,
  timeline: (hours: number) => ['PRODUCTION', 'timeline', hours] as const,
  lots: (p: object) => ['PRODUCTION', 'lots', p] as const,
  lot: (code: string) => ['PRODUCTION', 'lot', code] as const,
  qualityKeys: (hours: number) => ['PRODUCTION', 'qualityKeys', hours] as const,
  quality: (p: object) => ['PRODUCTION', 'quality', p] as const,
  planning: ['PRODUCTION', 'planning'] as const,
};

/** Polling (DESIGN.md §7): overview / tools 15 s, lots 20 s, trend and quality 60 s */
export const PRODUCTION_POLL = {
  overview: 15_000,
  tools: 15_000,
  timeline: 30_000,
  lots: 20_000,
  trend: 60_000,
  quality: 60_000,
};
