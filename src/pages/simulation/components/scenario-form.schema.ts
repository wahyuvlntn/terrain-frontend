import { addMinutes, format } from 'date-fns';
import { z } from 'zod';

import { SimAction, SimActionKindEnum, SimFault, SimScenarioSpec } from '../api/simulation.api';
import { controlOf, controlsOf, PLANT_UNITS, SPEC_LIMITS, unitOf } from '../simulation.catalog';

/** Value of a number input (react-hook-form `setValueAs`): empty is null */
export const asNumber = (v: unknown) =>
  v === '' || v === null || v === undefined ? null : Number(v);

const numberField = (label: string) =>
  z.number({ invalid_type_error: `Enter ${label}`, required_error: `Enter ${label}` });

/** One action row of the form (every field present; only the kind's fields are sent) */
export type ActionForm = {
  at_min: number;
  kind: z.infer<typeof SimActionKindEnum>;
  asset: string;
  param: string;
  fault: string;
  value: number | null;
  duration_min: number | null;
};

export type ScenarioForm = {
  title: string;
  rationale: string;
  startMode: 'now' | 'at';
  /** datetime-local value (local time) */
  startAt: string;
  duration_min: number;
  initial: 'live' | 'nominal';
  stochastic: boolean;
  seed: number;
  dry_bulb_offset: number;
  wet_bulb_offset: number;
  load_scale: number;
  /** applied in every variant */
  actions: ActionForm[];
  /** baseline first, then up to two alternatives */
  variants: { name: string; actions: ActionForm[] }[];
};

export const BASELINE = 'baseline';

export const newAction = (at_min = 0): ActionForm => ({
  at_min,
  kind: 'control',
  asset: 'CHWS_01',
  param: 'chws_sp',
  fault: '',
  value: controlOf('CHWS_01', 'chws_sp')?.def ?? null,
  duration_min: null,
});

/** datetime-local text of a time (minute precision, local) */
export const localInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

export const defaultScenario = (): ScenarioForm => {
  const inAnHour = addMinutes(new Date(), 60);
  inAnHour.setMinutes(Math.ceil(inAnHour.getMinutes() / 5) * 5, 0, 0);
  return {
    title: '',
    rationale: '',
    startMode: 'now',
    startAt: localInput(inAnHour),
    duration_min: 240,
    initial: 'live',
    stochastic: false,
    seed: 0,
    dry_bulb_offset: 0,
    wet_bulb_offset: 0,
    load_scale: 1,
    actions: [],
    variants: [{ name: BASELINE, actions: [] }],
  };
};

const isOnStep = (v: number, min: number, step: number) => {
  const n = (v - min) / step;
  return Math.abs(n - Math.round(n)) < 1e-6;
};

/** Faults of the catalog that apply to an equipment */
export const faultsFor = (catalog: SimFault[] | undefined, asset: string) =>
  (catalog ?? []).filter((f) => f.assets.includes(asset));

const actionSchema = (catalog: SimFault[] | undefined) =>
  z
    .object({
      at_min: numberField('a time').int('Whole minutes').min(0, 'Not before the start'),
      kind: SimActionKindEnum,
      asset: z.string().min(1, 'Pick the equipment'),
      param: z.string(),
      fault: z.string(),
      value: z.number().nullable(),
      duration_min: z.number().nullable(),
    })
    .superRefine((a, ctx) => {
      const issue = (path: keyof ActionForm, message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
      if (
        a.duration_min !== null &&
        (!Number.isInteger(a.duration_min) ||
          a.duration_min < 1 ||
          a.duration_min > SPEC_LIMITS.durationMax)
      ) {
        issue('duration_min', `Whole minutes, 1 to ${SPEC_LIMITS.durationMax}`);
      }
      switch (a.kind) {
        case 'control': {
          if (!unitOf(a.asset) || !controlsOf(a.asset).length) {
            issue('asset', 'No controls on this equipment');
            return;
          }
          const control = controlOf(a.asset, a.param);
          if (!control) {
            issue('param', 'Pick a control');
            return;
          }
          if (a.value === null || !Number.isFinite(a.value)) {
            issue('value', 'Enter a value');
          } else if (control.options) {
            if (!control.options.some((o) => o.value === a.value)) issue('value', 'Pick an option');
          } else if (control.min !== undefined && a.value < control.min) {
            issue('value', `Minimum ${control.min}`);
          } else if (control.max !== undefined && a.value > control.max) {
            issue('value', `Maximum ${control.max}`);
          } else if (control.step && !isOnStep(a.value, control.min ?? 0, control.step)) {
            issue('value', `Steps of ${control.step}`);
          }
          return;
        }
        case 'fault':
        case 'clear_fault': {
          if (!catalog) {
            issue('fault', 'The fault catalog is not available');
            return;
          }
          const fault = faultsFor(catalog, a.asset).find((f) => f.kind === a.fault);
          if (!fault) {
            issue('fault', 'Pick a fault of this equipment');
            return;
          }
          if (a.kind === 'clear_fault') return;
          if (a.value === null || !Number.isFinite(a.value)) issue('value', 'Pick an intensity');
          else if (fault.intensities.length && !fault.intensities.includes(a.value)) {
            issue('value', 'Pick a documented intensity');
          }
          return;
        }
        case 'offline':
          if (a.duration_min === null) issue('duration_min', 'How long (minutes)');
          break;
        default:
          break;
      }
      if (!PLANT_UNITS.some((u) => u.alias === a.asset)) issue('asset', 'Pick a plant unit');
    });

const [loadMin, loadMax] = SPEC_LIMITS.loadScale;
const [wxMin, wxMax] = SPEC_LIMITS.weatherOffset;
const offset = (label: string) =>
  numberField(label).min(wxMin, `At least ${wxMin} °C`).max(wxMax, `At most ${wxMax} °C`);

/** Form schema; fault actions are checked against the backend fault catalog */
export const scenarioSchema = (catalog: SimFault[] | undefined) => {
  const action = actionSchema(catalog);
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, 'Give the scenario a title')
        .max(200, 'At most 200 characters'),
      rationale: z.string().max(2000, 'At most 2000 characters'),
      startMode: z.enum(['now', 'at']),
      startAt: z.string(),
      duration_min: numberField('a duration')
        .int('Whole minutes')
        .min(SPEC_LIMITS.durationMin, `At least ${SPEC_LIMITS.durationMin} min`)
        .max(SPEC_LIMITS.durationMax, `At most ${SPEC_LIMITS.durationMax} min (48 h)`),
      initial: z.enum(['live', 'nominal']),
      stochastic: z.boolean(),
      seed: numberField('a seed')
        .int('A whole number')
        .min(0, 'Not negative')
        .max(2 ** 31 - 1),
      dry_bulb_offset: offset('an offset'),
      wet_bulb_offset: offset('an offset'),
      load_scale: numberField('a load scale')
        .min(loadMin, `At least ${loadMin}`)
        .max(loadMax, `At most ${loadMax}`),
      actions: z.array(action),
      variants: z
        .array(
          z.object({
            name: z
              .string()
              .trim()
              .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/, 'Letters, digits, - and _ (max 32)'),
            actions: z.array(action),
          })
        )
        .min(1)
        .max(SPEC_LIMITS.maxVariants, `At most ${SPEC_LIMITS.maxVariants} variants`),
    })
    .superRefine((f, ctx) => {
      if (f.startMode === 'at') {
        const t = Date.parse(f.startAt);
        const now = Date.now();
        if (!Number.isFinite(t)) {
          ctx.addIssue({ code: 'custom', path: ['startAt'], message: 'Pick a start time' });
        } else if (t < now - 5 * 60_000) {
          ctx.addIssue({
            code: 'custom',
            path: ['startAt'],
            message: 'The start lies in the past',
          });
        } else if (t > now + SPEC_LIMITS.startAheadDays * 86_400_000) {
          ctx.addIssue({
            code: 'custom',
            path: ['startAt'],
            message: `At most ${SPEC_LIMITS.startAheadDays} days ahead`,
          });
        }
      }
      // actions must fall inside the run
      const late = (actions: ActionForm[], path: (string | number)[]) =>
        actions.forEach((a, i) => {
          if (Number.isFinite(a.at_min) && a.at_min >= f.duration_min) {
            ctx.addIssue({
              code: 'custom',
              path: [...path, i, 'at_min'],
              message: `Before the end (${f.duration_min} min)`,
            });
          }
        });
      late(f.actions, ['actions']);
      f.variants.forEach((v, i) => late(v.actions, ['variants', i, 'actions']));
      const seen = new Set<string>();
      f.variants.forEach((v, i) => {
        const name = v.name.trim().toLowerCase();
        if (seen.has(name)) {
          ctx.addIssue({
            code: 'custom',
            path: ['variants', i, 'name'],
            message: 'Names must differ',
          });
        }
        seen.add(name);
      });
      const total = f.actions.length + f.variants.reduce((n, v) => n + v.actions.length, 0);
      if (total > SPEC_LIMITS.maxActions) {
        ctx.addIssue({
          code: 'custom',
          path: ['actions'],
          message: `At most ${SPEC_LIMITS.maxActions} actions in all (now ${total})`,
        });
      }
    });
};

/** The action as sent: only the fields its kind uses */
export const toAction = (a: ActionForm): SimAction => {
  const base = { at_min: a.at_min, kind: a.kind, asset: a.asset };
  const duration = a.duration_min !== null ? { duration_min: a.duration_min } : {};
  switch (a.kind) {
    case 'control':
      return { ...base, param: a.param, value: a.value ?? undefined, ...duration };
    case 'fault':
      return { ...base, fault: a.fault, value: a.value ?? undefined, ...duration };
    case 'clear_fault':
      return { ...base, fault: a.fault };
    case 'trip':
    case 'offline':
    case 'maintenance':
      return { ...base, ...duration };
    default:
      return base;
  }
};

/** A control mode write sorts ahead of the set points it unlocks at the same minute */
const rank = (a: SimAction) =>
  a.kind === 'control' && controlOf(a.asset, a.param)?.options ? 0 : 1;

/** Actions in time order (stable otherwise) */
const byTime = (actions: ActionForm[]) =>
  actions.map(toAction).sort((x, y) => x.at_min - y.at_min || rank(x) - rank(y));

/** Scenario spec of a valid form (DESIGN.md §5.1) */
export const toSpec = (f: ScenarioForm): SimScenarioSpec => ({
  start: f.startMode === 'now' ? null : new Date(f.startAt).toISOString(),
  duration_min: f.duration_min,
  initial: f.initial,
  stochastic: f.stochastic,
  seed: f.seed,
  weather: { dry_bulb_offset: f.dry_bulb_offset, wet_bulb_offset: f.wet_bulb_offset },
  load_scale: f.load_scale,
  actions: byTime(f.actions),
  variants: f.variants.map((v) => ({ name: v.name.trim(), actions: byTime(v.actions) })),
});

/**
 * Why a set point action may not act: its control mode must be out of automatic by then (in the
 * same variant or the common actions, at or before its time). Only a hint: the live plant may
 * already run that mode by hand.
 */
export const gatingHint = (a: ActionForm, scheduled: ActionForm[]) => {
  if (a.kind !== 'control') return null;
  const control = controlOf(a.asset, a.param);
  if (!control?.mode) return null;
  const modeDef = controlOf(a.asset, control.mode);
  const switched = scheduled.some(
    (m) =>
      m.kind === 'control' &&
      m.asset === a.asset &&
      m.param === control.mode &&
      m.value !== null &&
      m.value !== 0 &&
      m.at_min <= a.at_min
  );
  if (switched) return null;
  const manual = modeDef?.options?.find((o) => o.value !== 0)?.label ?? 'Manual';
  return { mode: control.mode, label: modeDef?.label ?? control.mode, manual };
};
