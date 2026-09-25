import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

import { jobRow, jobRowSchema } from './simulation.api';

/**
 * Production planning simulations (backend `production/getplanning`, `production/submitplan`;
 * docs/production/DESIGN.md §6): the production model of a copy of the fab run ahead for up to
 * 90 days under up to three plans (lot starts, product mix, hot lots, dispatching, furnace
 * batching, planned tool downs, additional tools). Jobs are sim.jobs of kind `production`; the
 * simulator completes them itself with the KPIs in the job summary.
 */

const num = z.number();
const optNum = z
  .number()
  .nullish()
  .transform((v) => v ?? null);

const planningSchema = z.object({
  defaults: z.object({
    starts_per_day: num,
    hot_share: num,
    dispatch: z.string(),
    furnace_wait_h: num,
    furnace_min_lots: num,
    /** OHT fleet (older backends: none) */
    vehicles: num.catch(10),
  }),
  products: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      technology: z.string().catch(''),
      mix: num,
      masks: num,
      metals: optNum,
      cycle_days: optNum,
      ideal_h: optNum,
    })
  ),
  tools: z.array(
    z.object({
      alias: z.string(),
      name: z.string(),
      area: z.string(),
      area_name: z.string().catch(''),
    })
  ),
  limits: z.object({ max_horizon_days: num, max_variants: num, max_actions: num }),
});
export type PlanningOptions = z.infer<typeof planningSchema>;

export const getPlanning = async () =>
  planningSchema.parse(await jsRequest({ url: '/production/getplanning', data: {} }));

export type PlanAction =
  | { kind: 'tool_down'; asset: string; at_day: number; duration_h: number; reason?: string }
  | { kind: 'add_tool'; asset: string; count: number };

export type PlanSpec = {
  kind: 'production';
  horizon_days: number;
  initial: 'live' | 'nominal';
  seed: number;
  breakdowns: boolean;
  plan: Record<string, never>;
  actions: PlanAction[];
  variants: {
    name: string;
    plan: {
      starts_per_day: number;
      mix: Record<string, number>;
      hot_share: number;
      dispatch: 'FIFO' | 'CR';
      furnace_wait_h: number;
      furnace_min_lots: number;
      vehicles: number;
    };
    actions: PlanAction[];
  }[];
};

/** Submits a production plan from the UI (status QUEUED; needs simulation.create) */
export const submitPlan = async ({
  title,
  spec,
  rationale,
}: {
  title: string;
  spec: PlanSpec;
  rationale?: string;
}) => {
  const data = await jsRequest({
    url: '/production/submitplan',
    data: { title, spec: JSON.stringify(spec), rationale: rationale || undefined },
  });
  return jobRowSchema.parse(jobRow(data));
};

// ------------------------------------------------------------------ results
const kpiSchema = z.object({
  days: num,
  starts: num,
  outs: num,
  wafers_in: num,
  wafers_out: num,
  scrapped_lots: num,
  line_yield: num,
  on_time: num,
  ct_days: z.record(num).catch({}),
  ct_per_mask: z.record(num).catch({}),
  x_factor: z.record(num).catch({}),
  outs_by_product: z.record(num).catch({}),
  wip_end: num,
  util: z.record(num).catch({}),
  area_util: z.record(num).catch({}),
  queue_h: z.record(num).catch({}),
  moves_by_area: z.record(num).catch({}),
  reworks_by_area: z.record(num).catch({}),
  litho_rework: num.catch(0),
  scrap_wafers: z.record(num).catch({}),
  wat_mean: num.catch(0),
  wat_fail: num.catch(0),
  bottleneck: z.string().catch(''),
  /** overhead transport: transfers, mean minutes from request to delivery, fleet busy % */
  transfers: num.catch(0),
  transport_min: num.catch(0),
  oht_util: num.catch(0),
  vehicles: num.catch(0),
});
export type PlanKpi = z.infer<typeof kpiSchema>;

const variantSchema = z.object({
  label: z.string().catch(''),
  plan: z
    .object({
      starts_per_day: num,
      mix: z.record(num).nullish(),
      hot_share: num,
      dispatch: z.string(),
      furnace_min_lots: num,
      furnace_wait_h: num,
      vehicles: num,
    })
    .partial()
    .catch({}),
  kpi: kpiSchema,
  wip_start: num.catch(0),
  daily: z
    .array(
      z.object({
        day: z.string(),
        starts: num,
        outs: num,
        wafers_out: num,
        wip: num,
        ct_days: num,
        hold: num.catch(0),
      })
    )
    .catch([]),
  events: z
    .array(
      z.object({
        tool: z.string(),
        kind: z.string(),
        from: z.string(),
        to: z.string().catch(''),
        note: z.string().nullish(),
      })
    )
    .catch([]),
  tools: z
    .array(
      z.object({
        alias: z.string(),
        area: z.string(),
        util: num,
        planned: z.boolean().catch(false),
      })
    )
    .catch([]),
});
export type PlanVariant = z.infer<typeof variantSchema>;

const summarySchema = z.object({
  kind: z.literal('production'),
  horizon_days: num,
  initial: z.string().catch('live'),
  order: z.array(z.string()),
  variants: z.record(variantSchema),
  reason: z.string().nullish(),
  runtime_ms: num.nullish(),
});
export type PlanSummary = z.infer<typeof summarySchema>;

/** Reads the summary of a production plan job (null while it has none) */
export const parsePlanSummary = (raw: unknown): PlanSummary | null => {
  const r = summarySchema.safeParse(raw);
  if (!r.success) {
    if (raw && typeof raw === 'object' && 'variants' in raw)
      console.warn('production plan summary not readable', r.error);
    return null;
  }
  return r.data;
};
