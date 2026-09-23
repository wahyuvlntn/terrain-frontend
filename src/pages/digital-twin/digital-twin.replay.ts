/**
 * Replay of a simulation job in the digital twin: the job's recorded frames (one sample per
 * simulated step) turned into the same shapes the live twin API returns, at the playhead. Pure
 * functions; the replay source (digital-twin.source.tsx) calls them with the step to show.
 */
import { ConditionEnum, StatusEnum } from '@digital-twin/components';

import type { SimEvent, SimFrames, SimFramesAsset } from '../simulation/api/simulation.api';
import type {
  TwinAsset,
  TwinAssetSummary,
  TwinLiveAsset,
  TwinLiveParameter,
  TwinParameter,
} from './api/digital-twin.api';

/** A status or condition interval in epoch ms (end null = until the end of the run) */
export type ReplayInterval = { value: string; start: number; end: number | null };

/** Frames of one job variant, indexed for lookups at a playhead */
export type ReplayIndex = {
  jobId: number;
  variant: string;
  /** time of sample 0 and the step between samples (epoch ms / ms) */
  t0: number;
  stepMs: number;
  steps: number;
  /** time of the last sample: the playhead runs from t0 to end */
  end: number;
  assets: SimFramesAsset[];
  byAlias: Map<string, SimFramesAsset>;
  byId: Map<number, SimFramesAsset>;
  series: SimFrames['series'];
  status: Map<string, ReplayInterval[]>;
  condition: Map<string, ReplayInterval[]>;
  /** every recorded event, oldest first */
  events: (SimEvent & { at: number })[];
};

const iso = (ms: number) => new Date(ms).toISOString();

/** Engine status ids (sim.states may hold the id instead of the name) */
const STATUS_OF_ID: Record<string, StatusEnum> = {
  '1': StatusEnum.enum.RUNNING,
  '2': StatusEnum.enum.IDLE,
  '3': StatusEnum.enum['UNPLANNED DOWN'],
  '4': StatusEnum.enum.OFFLINE,
  '5': StatusEnum.enum['PLANNED DOWN'],
};

const stateValue = (kind: 'status' | 'condition', value: string) => {
  const v = value.trim().toUpperCase();
  return kind === 'status' ? (STATUS_OF_ID[v] ?? v) : v;
};

export const buildReplayIndex = (frames: SimFrames): ReplayIndex => {
  const parsed = frames.t0 ? Date.parse(frames.t0) : Number.NaN;
  // no start time: nothing was recorded
  const recorded = Number.isFinite(parsed);
  const t0 = recorded ? parsed : 0;
  const stepMs = frames.stepS * 1000;
  const steps = recorded ? Math.max(frames.steps, 0) : 0;
  const status = new Map<string, ReplayInterval[]>();
  const condition = new Map<string, ReplayInterval[]>();
  frames.states.forEach((s) => {
    const into = s.kind === 'status' ? status : condition;
    const list = into.get(s.alias) ?? [];
    list.push({
      value: stateValue(s.kind, s.value),
      start: Date.parse(s.start),
      end: s.end ? Date.parse(s.end) : null,
    });
    into.set(s.alias, list);
  });
  [status, condition].forEach((m) => m.forEach((list) => list.sort((a, b) => a.start - b.start)));
  return {
    jobId: frames.jobId,
    variant: frames.variant,
    t0,
    stepMs,
    steps,
    end: t0 + Math.max(steps - 1, 0) * stepMs,
    assets: frames.assets,
    byAlias: new Map(frames.assets.map((a) => [a.alias, a])),
    byId: new Map(frames.assets.map((a) => [a.id, a])),
    series: frames.series,
    status,
    condition,
    events: frames.events
      .map((e) => ({ ...e, at: Date.parse(e.ts) }))
      .sort((a, b) => a.at - b.at || a.id - b.id),
  };
};

/** Sample index shown at playhead `t` (the last sample at or before it) */
export const stepAt = (ix: ReplayIndex, t: number) =>
  Math.min(Math.max(Math.floor((t - ix.t0) / ix.stepMs + 1e-9), 0), Math.max(ix.steps - 1, 0));

/** Time of a sample (epoch ms) */
export const stepTime = (ix: ReplayIndex, step: number) => ix.t0 + step * ix.stepMs;

/** Interval covering `t` (the latest one that started at or before it) */
const intervalAt = (list: ReplayInterval[] | undefined, t: number) => {
  if (!list) return undefined;
  for (let i = list.length - 1; i >= 0; i--) {
    const iv = list[i];
    if (iv.start <= t) return iv.end === null || t < iv.end ? iv : undefined;
  }
  return undefined;
};

const asStatus = (v?: string) => {
  const parsed = StatusEnum.safeParse(v);
  return parsed.success ? parsed.data : null;
};

const asCondition = (v?: string) => {
  const parsed = ConditionEnum.safeParse(v);
  return parsed.success ? parsed.data : null;
};

/** Value of a recorded series at a sample (null when not recorded) */
export const seriesValue = (ix: ReplayIndex, alias: string, param: string, step: number) => {
  const v = ix.series[alias]?.[param]?.[step];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

/** Unit status and condition (with their start) at sample time `t` */
const unitState = (ix: ReplayIndex, alias: string, t: number) => {
  const st = intervalAt(ix.status.get(alias), t);
  const cd = intervalAt(ix.condition.get(alias), t);
  return {
    status: asStatus(st?.value),
    statusStartTime: st ? iso(st.start) : null,
    condition: asCondition(cd?.value),
    conditionStartTime: cd ? iso(cd.start) : null,
  };
};

type Limits = { lower: number | null; upper: number | null };
const beyond = (v: number, l: Limits) =>
  (l.upper !== null && v > l.upper) || (l.lower !== null && v < l.lower);

/**
 * Condition of a replayed value from the parameter's alarm limits (the live API returns the
 * engine's evaluation; the frames only hold values). No value, or an offline unit, is OFFLINE.
 */
const conditionOf = (
  value: number | null,
  limits: { warning: Limits; critical: Limits } | undefined,
  offline: boolean
): ConditionEnum => {
  if (offline || value === null) return ConditionEnum.enum.OFFLINE;
  if (limits && beyond(value, limits.critical)) return ConditionEnum.enum.CRITICAL;
  if (limits && beyond(value, limits.warning)) return ConditionEnum.enum.WARNING;
  return ConditionEnum.enum.NORMAL;
};

/** Every replayed equipment with its status and condition at a sample */
export const replayAssets = (ix: ReplayIndex, step: number): TwinAsset[] => {
  const t = stepTime(ix, step);
  return ix.assets.map((a) => ({
    id: a.id,
    alias: a.alias,
    name: a.name,
    typeName: a.typeName,
    modelName: a.modelName,
    // not part of the frames, and not used by the twin
    locationId: 0,
    ...unitState(ix, a.alias, t),
  }));
};

const NO_LIMITS = { lower: null, upper: null };
const NO_SPC = { ucl: null, lcl: null, centerLine: null, sigma: null, usl: null, lsl: null };

/**
 * Displayed parameters of an equipment at a sample. Metadata (names, units, decimals, limits,
 * controls) comes from the live parameter list (`template`); without one (it failed to load) the
 * recorded series are listed by alias.
 */
export const replayParameters = (
  ix: ReplayIndex,
  assetId: number,
  step: number,
  template: TwinParameter[] | undefined
): TwinParameter[] => {
  const alias = ix.byId.get(assetId)?.alias;
  const t = stepTime(ix, step);
  const timestamp = iso(t);
  const offline = alias ? unitState(ix, alias, t).status === StatusEnum.enum.OFFLINE : true;
  const value = (param: string) => (alias ? seriesValue(ix, alias, param, step) : null);
  if (template) {
    return template.map((p) => {
      const v = value(p.alias);
      return { ...p, value: v, timestamp, condition: conditionOf(v, p, offline) };
    });
  }
  return Object.keys((alias && ix.series[alias]) || {}).map((param, i) => {
    const v = value(param);
    return {
      // negative ids never collide with stored parameters
      id: -(i + 1),
      alias: param,
      name: param,
      unit: '',
      dataType: 'number',
      scale: null,
      value: v,
      timestamp,
      condition: conditionOf(v, undefined, offline),
      warning: NO_LIMITS,
      critical: NO_LIMITS,
      spc: NO_SPC,
      control: null,
    };
  });
};

/**
 * Batched state and values of several equipment at a sample (shape of the live overview), in the
 * requested order; aliases missing from the frames are left out, as the live call does.
 */
export const replayOverview = (
  ix: ReplayIndex,
  aliases: readonly string[],
  step: number,
  templates: Map<string, TwinParameter[] | undefined>
): TwinLiveAsset[] => {
  const t = stepTime(ix, step);
  const timestamp = iso(t);
  return aliases.flatMap((alias) => {
    const a = ix.byAlias.get(alias);
    if (!a) return [];
    const state = unitState(ix, alias, t);
    const offline = state.status === StatusEnum.enum.OFFLINE;
    const template = templates.get(alias);
    const params: Record<string, TwinLiveParameter> = {};
    if (template) {
      template.forEach((p) => {
        const v = seriesValue(ix, alias, p.alias, step);
        params[p.alias] = {
          value: v,
          unit: p.unit,
          scale: p.scale,
          condition: conditionOf(v, p, offline),
          timestamp,
        };
      });
    } else {
      // metadata still loading: values only (default decimals, no limits)
      Object.keys(ix.series[alias] ?? {}).forEach((param) => {
        const v = seriesValue(ix, alias, param, step);
        params[param] = {
          value: v,
          unit: '',
          scale: null,
          condition: conditionOf(v, undefined, offline),
          timestamp,
        };
      });
    }
    return [{ id: a.id, alias, name: a.name, typeName: a.typeName, ...state, params }];
  });
};

/** Intervals overlapping [from, to], clipped to it */
const clip = (list: ReplayInterval[] | undefined, from: number, to: number) =>
  (list ?? []).flatMap((iv) => {
    const start = Math.max(iv.start, from);
    const end = Math.min(iv.end ?? to, to);
    return end > start ? [{ value: iv.value, start, end }] : [];
  });

const runningMs = (list: ReplayInterval[] | undefined, from: number, to: number) =>
  clip(list, from, to)
    .filter((iv) => iv.value === StatusEnum.enum.RUNNING)
    .reduce((sum, iv) => sum + iv.end - iv.start, 0);

const ALARM_KINDS = new Set(['alarm', 'abnormal']);

/**
 * Equipment summary at a sample (shape of the live summary): status and condition history of the
 * run up to the playhead (at most `hours`), uptime, the run's alarms. `uptime7d` and
 * `runningHours` cover the whole run so far. Header fields the frames don't carry (location,
 * image) come from the live summary (`template`). Simulations create no maintenance orders.
 */
export const replaySummary = (
  ix: ReplayIndex,
  assetId: number,
  step: number,
  hours: number,
  template?: Pick<TwinAssetSummary, 'location' | 'image'>
): TwinAssetSummary | undefined => {
  const a = ix.byId.get(assetId);
  if (!a) return undefined;
  const to = stepTime(ix, step);
  const from = Math.max(ix.t0, to - hours * 3600e3);
  const statusList = ix.status.get(a.alias);
  const uptime = (start: number) => {
    const total = Math.max(to - start, 0);
    const run = runningMs(statusList, start, to);
    return {
      uptime: total > 0 ? (run / total) * 100 : 0,
      runningHours: run / 3600e3,
      totalHours: total / 3600e3,
    };
  };
  const toIntervals = (list: ReplayInterval[] | undefined) =>
    clip(list, from, to).map((iv) => ({ value: iv.value, start: iso(iv.start), end: iso(iv.end) }));
  const alarms = ix.events.filter(
    (e) => e.assetAlias === a.alias && ALARM_KINDS.has(e.kind) && e.at <= to
  );
  const inWindow = alarms.filter((e) => e.at >= from);
  const severity = (e: SimEvent) => (e.severity ?? '').toUpperCase();
  const whole = uptime(ix.t0);
  return {
    id: a.id,
    alias: a.alias,
    name: a.name,
    typeName: a.typeName,
    modelName: a.modelName,
    location: template?.location ?? '',
    image: template?.image ?? null,
    ...unitState(ix, a.alias, to),
    hours,
    from: iso(from),
    to: iso(to),
    statuses: toIntervals(statusList),
    conditions: toIntervals(ix.condition.get(a.alias)),
    uptimeWindow: uptime(from),
    uptime7d: whole,
    runningHours: whole.runningHours,
    warningCounts: inWindow.filter((e) => severity(e) !== 'CRITICAL').length,
    criticalCounts: inWindow.filter((e) => severity(e) === 'CRITICAL').length,
    alarms: alarms
      .slice(-10)
      .reverse()
      .map((e) => {
        const end = e.endTs ? Date.parse(e.endTs) : null;
        return {
          name: e.code ?? (e.kind === 'abnormal' ? 'Abnormal' : 'Alarm'),
          severity: severity(e) || 'WARNING',
          message: e.message,
          type: e.kind === 'abnormal' ? 'ABNORMAL' : 'ALARM',
          start: e.ts,
          end: end !== null && end <= to ? iso(end) : null,
          active: end === null || end > to,
        };
      }),
    maintenances: [],
  };
};

/** Recorded events of kinds `kinds` of one equipment up to a sample, newest first */
export const replayEventsOf = (
  ix: ReplayIndex,
  alias: string,
  kinds: readonly SimEvent['kind'][],
  step: number,
  limit: number
) => {
  const to = stepTime(ix, step);
  const out: ReplayIndex['events'] = [];
  for (let i = ix.events.length - 1; i >= 0 && out.length < limit; i--) {
    const e = ix.events[i];
    if (e.at <= to && e.assetAlias === alias && kinds.includes(e.kind)) out.push(e);
  }
  return out;
};
