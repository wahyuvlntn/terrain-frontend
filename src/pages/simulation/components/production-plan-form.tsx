import {
  AuthCtx,
  Button,
  Container,
  Dropdown,
  InfoTooltip,
  Input,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '@digital-twin/components';
import { HardwareChip, Plus, TrashDelete } from '@digital-twin/icons';
import { RadioButton } from '@digital-twin/reusables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReactNode, useContext, useMemo, useState } from 'react';

import {
  getPlanning,
  PlanAction,
  PlanningOptions,
  PlanSpec,
  submitPlan,
} from '../api/production-plan.api';
import { SIM_QUERY } from '../api/simulation.api';
import styles from '../simulation.module.scss';
import { errorText } from './job-bits';

/** One plan variant as edited (shares in %) */
export type PlanVariantForm = {
  name: string;
  startsPerDay: number;
  /** % of the starts that are the first product (the rest the second) */
  share: number;
  hotPct: number;
  dispatch: 'FIFO' | 'CR';
  furnaceWaitH: number;
  furnaceMinLots: number;
  /** OHT vehicles */
  vehicles: number;
  actions: PlanAction[];
};

export type PlanForm = {
  title: string;
  rationale: string;
  horizonDays: number;
  initial: 'live' | 'nominal';
  breakdowns: boolean;
  seed: number;
  variants: PlanVariantForm[];
};

/** A variant with the plan the fab runs now */
export const currentVariant = (o: PlanningOptions, name = 'Current plan'): PlanVariantForm => ({
  name,
  startsPerDay: o.defaults.starts_per_day,
  share: Math.round(100 * (o.products[0]?.mix ?? 0.5)),
  hotPct: Math.round(100 * o.defaults.hot_share),
  dispatch: o.defaults.dispatch === 'CR' ? 'CR' : 'FIFO',
  furnaceWaitH: o.defaults.furnace_wait_h,
  furnaceMinLots: o.defaults.furnace_min_lots,
  vehicles: o.defaults.vehicles,
  actions: [],
});

/** Problems of a plan form (empty when it can be submitted) */
export const planErrors = (f: PlanForm, o: PlanningOptions): string[] => {
  const e: string[] = [];
  if (!f.title.trim()) e.push('A title is required.');
  if (!(f.horizonDays >= 1 && f.horizonDays <= o.limits.max_horizon_days))
    e.push(`The horizon must be 1 to ${o.limits.max_horizon_days} days.`);
  const names = new Set<string>();
  let actions = 0;
  f.variants.forEach((v, i) => {
    const n = v.name.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]{0,39}$/.test(n))
      e.push(`Variant ${i + 1} needs a name (letters, digits, spaces, _ . -).`);
    if (names.has(n.toLowerCase())) e.push(`Variant names must be unique (${n}).`);
    names.add(n.toLowerCase());
    if (!(v.startsPerDay >= 0 && v.startsPerDay <= 12))
      e.push(`${n}: lot starts must be 0 to 12 per day.`);
    if (!(v.share >= 0 && v.share <= 100)) e.push(`${n}: the product share must be 0 to 100 %.`);
    if (!(v.hotPct >= 0 && v.hotPct <= 50)) e.push(`${n}: hot lots must be 0 to 50 %.`);
    if (!(v.furnaceWaitH >= 0 && v.furnaceWaitH <= 48))
      e.push(`${n}: the furnace wait must be 0 to 48 h.`);
    if (!(v.furnaceMinLots >= 1 && v.furnaceMinLots <= 4))
      e.push(`${n}: a furnace batch starts with 1 to 4 lots.`);
    if (!(Number.isInteger(v.vehicles) && v.vehicles >= 1 && v.vehicles <= 30))
      e.push(`${n}: the OHT fleet must be 1 to 30 vehicles.`);
    v.actions.forEach((a, k) => {
      actions++;
      if (!a.asset) e.push(`${n}: action ${k + 1} needs a tool.`);
      if (
        a.kind === 'tool_down' &&
        !(a.at_day >= 0 && a.at_day < f.horizonDays && a.duration_h > 0)
      )
        e.push(`${n}: tool down ${k + 1} must start within the horizon and last more than 0 h.`);
      if (a.kind === 'add_tool' && !(a.count >= 1 && a.count <= 3))
        e.push(`${n}: add 1 to 3 tools.`);
    });
  });
  if (actions > o.limits.max_actions) e.push(`At most ${o.limits.max_actions} actions.`);
  return e;
};

/** The spec the backend takes (docs/production/DESIGN.md §6) */
export const toPlanSpec = (f: PlanForm, o: PlanningOptions): PlanSpec => {
  const [a, b] = o.products;
  return {
    kind: 'production',
    horizon_days: f.horizonDays,
    initial: f.initial,
    seed: f.seed,
    breakdowns: f.breakdowns,
    plan: {},
    actions: [],
    variants: f.variants.map((v) => ({
      name: v.name.trim(),
      plan: {
        starts_per_day: v.startsPerDay,
        mix: b ? { [a.code]: v.share / 100, [b.code]: 1 - v.share / 100 } : { [a.code]: 1 },
        hot_share: v.hotPct / 100,
        dispatch: v.dispatch,
        furnace_wait_h: v.furnaceWaitH,
        furnace_min_lots: v.furnaceMinLots,
        vehicles: v.vehicles,
      },
      actions: v.actions.map((x) =>
        x.kind === 'tool_down'
          ? {
              kind: 'tool_down',
              asset: x.asset,
              at_day: x.at_day,
              duration_h: x.duration_h,
              reason: x.reason || undefined,
            }
          : { kind: 'add_tool', asset: x.asset, count: x.count }
      ),
    })),
  };
};

const Field = ({
  label,
  info,
  children,
  wide,
}: {
  label: string;
  info?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) => (
  <div className={wide ? `${styles.field} ${styles.formgrid__wide}` : styles.field}>
    <span className={styles.field__label}>
      {label}
      {info ? <InfoTooltip title={label} content={info} /> : null}
    </span>
    {children}
  </div>
);

const num = (e: { target: { value: string } }) =>
  e.target.value === '' ? Number.NaN : Number(e.target.value);

/** One variant: the plan values and its planned tool downs / additional tools */
const VariantEditor = ({
  v,
  o,
  horizon,
  onChange,
  onRemove,
}: {
  v: PlanVariantForm;
  o: PlanningOptions;
  horizon: number;
  onChange: (v: PlanVariantForm) => void;
  onRemove?: () => void;
}) => {
  const set = (patch: Partial<PlanVariantForm>) => onChange({ ...v, ...patch });
  const tools = o.tools.map((t) => ({
    value: t.alias,
    label: `${t.alias.replace(/_/g, '-')} · ${t.area_name || t.area}`,
  }));
  const setAction = (i: number, a: PlanAction) =>
    set({ actions: v.actions.map((x, k) => (k === i ? a : x)) });
  const [p1, p2] = o.products;
  return (
    <div className={styles.vcard}>
      <div className={styles.vcard__head}>
        <Input
          value={v.name}
          onChange={(e) => set({ name: e.target.value })}
          background="dark"
          inputProps={{ maxLength: 40, 'aria-label': 'Variant name' }}
        />
        {onRemove ? (
          <Button
            type="button"
            color="default-secondary"
            icon={<TrashDelete width={18} height={18} />}
            onClick={onRemove}
          >
            Remove
          </Button>
        ) : null}
      </div>
      <div className={styles.formgrid}>
        <Field
          label="Lot starts per day"
          info="Lots of 25 wafers released into the fab per day (the release times vary)."
        >
          <Input
            type="number"
            value={Number.isNaN(v.startsPerDay) ? '' : v.startsPerDay}
            onChange={(e) => set({ startsPerDay: num(e) })}
            background="dark"
            suffix={`lots · ${Number.isFinite(v.startsPerDay) ? Math.round(v.startsPerDay * 25 * 30).toLocaleString() : '--'} wafers / month`}
            inputProps={{ min: 0, max: 12, step: 0.1 }}
          />
        </Field>
        <Field
          label={`Product mix (${p1?.code ?? ''})`}
          info={`Share of the starts that are ${p1?.code} (${p1?.name}); the rest are ${p2?.code ?? '-'} (${p2?.name ?? ''}).`}
        >
          <Input
            type="number"
            value={Number.isNaN(v.share) ? '' : v.share}
            onChange={(e) => set({ share: num(e) })}
            background="dark"
            suffix={`% · ${p2 ? `${p2.code} ${Number.isFinite(v.share) ? 100 - v.share : '--'} %` : ''}`}
            inputProps={{ min: 0, max: 100, step: 5 }}
          />
        </Field>
        <Field
          label="Hot lots"
          info="Share of the starts released as hot lots: dispatched first and due in 60 % of the planned cycle time."
        >
          <Input
            type="number"
            value={Number.isNaN(v.hotPct) ? '' : v.hotPct}
            onChange={(e) => set({ hotPct: num(e) })}
            background="dark"
            suffix="%"
            inputProps={{ min: 0, max: 50, step: 1 }}
          />
        </Field>
        <Field
          label="Dispatch rule"
          info="FIFO: the lot that waited longest first. CR (critical ratio): the lot with the least time to its due date for its remaining work first. Hot lots and lots near a queue-time limit always go first."
        >
          <Dropdown
            value={v.dispatch}
            options={[
              { value: 'FIFO', label: 'FIFO (first in, first out)' },
              { value: 'CR', label: 'Critical ratio (due date)' },
            ]}
            onChange={(x) => set({ dispatch: x as 'FIFO' | 'CR' })}
            background="dark"
          />
        </Field>
        <Field
          label="Furnace batching"
          info="A furnace runs up to 4 lots of one recipe. It starts once this many lots wait, or when the first lot has waited the maximum time (fuller batches: less furnace time, longer waits)."
        >
          <div className={styles.radios}>
            <Input
              type="number"
              value={Number.isNaN(v.furnaceMinLots) ? '' : v.furnaceMinLots}
              onChange={(e) => set({ furnaceMinLots: num(e) })}
              background="dark"
              suffix="lots"
              inputProps={{
                min: 1,
                max: 4,
                step: 1,
                'aria-label': 'Minimum lots per furnace batch',
              }}
            />
            <Input
              type="number"
              value={Number.isNaN(v.furnaceWaitH) ? '' : v.furnaceWaitH}
              onChange={(e) => set({ furnaceWaitH: num(e) })}
              background="dark"
              suffix="h max wait"
              inputProps={{ min: 0, max: 48, step: 1, 'aria-label': 'Maximum furnace wait' }}
            />
          </div>
        </Field>
        <Field
          label="OHT vehicles"
          info="Overhead hoist vehicles that carry the FOUPs between load ports and stockers. Fewer vehicles: longer waits for a delivery, so tools wait for their next lot."
        >
          <Input
            type="number"
            value={Number.isNaN(v.vehicles) ? '' : v.vehicles}
            onChange={(e) => set({ vehicles: num(e) })}
            background="dark"
            suffix="vehicles"
            inputProps={{ min: 1, max: 30, step: 1, 'aria-label': 'OHT vehicles' }}
          />
        </Field>
      </div>
      <div className={styles.lists__bar}>
        <strong>Tool changes</strong>
        <Button
          type="button"
          color="default-secondary"
          icon={<Plus width={18} height={18} />}
          onClick={() =>
            set({
              actions: [
                ...v.actions,
                {
                  kind: 'tool_down',
                  asset: o.tools[0]?.alias ?? '',
                  at_day: 1,
                  duration_h: 24,
                  reason: '',
                },
              ],
            })
          }
        >
          Tool down
        </Button>
        <Button
          type="button"
          color="default-secondary"
          icon={<Plus width={18} height={18} />}
          onClick={() =>
            set({
              actions: [
                ...v.actions,
                { kind: 'add_tool', asset: o.tools[0]?.alias ?? '', count: 1 },
              ],
            })
          }
        >
          Additional tool
        </Button>
      </div>
      {v.actions.length ? (
        <table className={styles.planActions}>
          <thead>
            <tr>
              <th>Change</th>
              <th>Tool</th>
              <th>Details</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {v.actions.map((a, i) => (
              <tr key={i}>
                <td>{a.kind === 'tool_down' ? 'Planned down' : 'Additional tool'}</td>
                <td>
                  <Dropdown
                    value={a.asset}
                    options={tools}
                    onChange={(x) => setAction(i, { ...a, asset: x })}
                    background="dark"
                  />
                </td>
                <td>
                  {a.kind === 'tool_down' ? (
                    <div className={styles.radios}>
                      <Input
                        type="number"
                        value={a.at_day}
                        onChange={(e) => setAction(i, { ...a, at_day: num(e) })}
                        background="dark"
                        prefix="day"
                        inputProps={{ min: 0, max: horizon, step: 0.5, 'aria-label': 'Start day' }}
                      />
                      <Input
                        type="number"
                        value={a.duration_h}
                        onChange={(e) => setAction(i, { ...a, duration_h: num(e) })}
                        background="dark"
                        suffix="h"
                        inputProps={{ min: 1, step: 1, 'aria-label': 'Duration' }}
                      />
                      <Input
                        value={a.reason ?? ''}
                        onChange={(e) => setAction(i, { ...a, reason: e.target.value })}
                        background="dark"
                        placeholder="Reason (e.g. laser chamber exchange)"
                        inputProps={{ maxLength: 200 }}
                      />
                    </div>
                  ) : (
                    <Input
                      type="number"
                      value={a.count}
                      onChange={(e) => setAction(i, { ...a, count: num(e) })}
                      background="dark"
                      suffix="more like it (always available)"
                      inputProps={{ min: 1, max: 3, step: 1, 'aria-label': 'Count' }}
                    />
                  )}
                </td>
                <td>
                  <Button
                    type="button"
                    color="default-secondary"
                    icon={<TrashDelete width={18} height={18} />}
                    aria-label="Remove the change"
                    onClick={() => set({ actions: v.actions.filter((_, k) => k !== i) })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <span className={styles.caption}>
          No tool changes: the tools as they are, with their usual breakdowns and PMs.
        </span>
      )}
    </div>
  );
};

type ProductionPlanFormProps = {
  onCreated: (jobId: number) => void;
  onCancel: () => void;
};

/**
 * New production planning simulation: the fab's production model run ahead for up to 90 days
 * under up to three plans. Submitting queues the job at once (simulation.create).
 */
export const ProductionPlanForm = ({ onCreated, onCancel }: ProductionPlanFormProps) => {
  const queryClient = useQueryClient();
  const { hasPermission } = useContext(AuthCtx);
  const canCreate = hasPermission(
    PermissionGroupAliasEnum.enum.simulation,
    PermissionAliasEnum.enum.create
  );
  const options = useQuery({
    queryKey: ['PRODUCTION', 'planning'],
    queryFn: getPlanning,
    staleTime: 5 * 60_000,
    meta: { toastId: 'productionPlanning' },
  });
  const [form, setForm] = useState<PlanForm | null>(null);
  const o = options.data;
  const f = useMemo<PlanForm | null>(() => {
    if (form) return form;
    if (!o) return null;
    return {
      title: '',
      rationale: '',
      horizonDays: 30,
      initial: 'live',
      breakdowns: true,
      seed: 0,
      variants: [currentVariant(o)],
    };
  }, [form, o]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const submit = useMutation({
    mutationFn: (x: PlanForm) =>
      submitPlan({
        title: x.title.trim(),
        spec: toPlanSpec(x, o as PlanningOptions),
        rationale: x.rationale.trim(),
      }),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: SIM_QUERY.jobs });
      onCreated(job.id);
    },
    onError: (err) => setSubmitError(errorText(err)),
    meta: { hideToast: true },
  });
  if (!o || !f) {
    return (
      <Container title="New production plan" background="none" className={styles.main}>
        <span className={styles.caption}>
          {options.isError ? 'The production model is not available.' : 'Loading…'}
        </span>
      </Container>
    );
  }
  const set = (patch: Partial<PlanForm>) => setForm({ ...f, ...patch });
  const errors = planErrors(f, o);
  return (
    <Container
      title="New fab production plan"
      icon={<HardwareChip width={24} height={24} />}
      background="none"
      className={styles.main}
      titleSuffixIcon={
        <InfoTooltip
          title="Production planning"
          content="Runs the production model of the fab - its lots, tools, routes, breakdowns and PMs - ahead in simulated time and compares up to three plans: outs, cycle time per product, WIP, on-time delivery, tool utilization and the bottleneck. The live fab is not touched."
        />
      }
      contentWrapperProps={{ style: { overflow: 'auto', gap: 20 } }}
    >
      <div className={styles.formgrid}>
        <Field label="Title" wide>
          <Input
            value={f.title}
            onChange={(e) => set({ title: e.target.value })}
            background="dark"
            placeholder="e.g. Raise starts to 5 lots a day with a second KrF scanner"
            inputProps={{ maxLength: 200 }}
          />
        </Field>
        <Field label="Notes (optional)" wide>
          <Input
            value={f.rationale}
            onChange={(e) => set({ rationale: e.target.value })}
            background="dark"
            placeholder="What to decide with it"
            inputProps={{ maxLength: 2000 }}
          />
        </Field>
        <Field
          label="Horizon"
          info="Simulated days ahead (a lot takes about two to three weeks through the fab)."
        >
          <Input
            type="number"
            value={Number.isNaN(f.horizonDays) ? '' : f.horizonDays}
            onChange={(e) => set({ horizonDays: num(e) })}
            background="dark"
            suffix="days"
            inputProps={{ min: 1, max: o.limits.max_horizon_days, step: 1 }}
          />
        </Field>
        <Field
          label="Start from"
          info="Live: the fab as it is now (its lots in progress, tool states). Nominal: a warmed-up fab at the standard plan."
        >
          <div className={styles.radios}>
            <RadioButton
              label="The fab now"
              name="planInitial"
              checked={f.initial === 'live'}
              onChange={() => set({ initial: 'live' })}
            />
            <RadioButton
              label="Nominal"
              name="planInitial"
              checked={f.initial === 'nominal'}
              onChange={() => set({ initial: 'nominal' })}
            />
          </div>
        </Field>
        <Field
          label="Breakdowns"
          info="Tool breakdowns about every two weeks per tool (2 - 8 h to repair) and monthly PMs, at the same times in every variant."
        >
          <div className={styles.radios}>
            <RadioButton
              label="Usual rate"
              name="planBreakdowns"
              checked={f.breakdowns}
              onChange={() => set({ breakdowns: true })}
            />
            <RadioButton
              label="None"
              name="planBreakdowns"
              checked={!f.breakdowns}
              onChange={() => set({ breakdowns: false })}
            />
          </div>
        </Field>
        <Field
          label="Seed"
          info="0: derived from the job. The same seed gives the same breakdowns and release times."
        >
          <Input
            type="number"
            value={f.seed}
            onChange={(e) => set({ seed: Math.max(0, Math.round(num(e) || 0)) })}
            background="dark"
            inputProps={{ min: 0, step: 1 }}
          />
        </Field>
      </div>
      <div className={styles.lists__bar}>
        <strong>Plans compared</strong>
        <span className={styles.caption}>The first plan is the baseline of the comparison.</span>
        <Button
          type="button"
          color="default-secondary"
          icon={<Plus width={18} height={18} />}
          disabled={f.variants.length >= o.limits.max_variants}
          onClick={() =>
            set({
              variants: [...f.variants, { ...currentVariant(o, `Plan ${f.variants.length + 1}`) }],
            })
          }
        >
          Add a plan
        </Button>
      </div>
      <div className={styles.vcards}>
        {f.variants.map((v, i) => (
          <VariantEditor
            key={i}
            v={v}
            o={o}
            horizon={f.horizonDays}
            onChange={(nv) => set({ variants: f.variants.map((x, k) => (k === i ? nv : x)) })}
            onRemove={
              f.variants.length > 1
                ? () => set({ variants: f.variants.filter((_, k) => k !== i) })
                : undefined
            }
          />
        ))}
      </div>
      {tried && errors.length ? (
        <ul className={styles['text--error']} role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {submitError ? (
        <p className={styles['text--error']} role="alert">
          {submitError}
        </p>
      ) : null}
      <div className={styles.lists__bar}>
        <Button
          type="button"
          disabled={!canCreate || submit.isPending}
          title={canCreate ? undefined : 'Needs the Simulation › Create permission'}
          onClick={() => {
            setTried(true);
            setSubmitError(null);
            if (!errors.length) submit.mutate(f);
          }}
        >
          {submit.isPending ? 'Submitting…' : 'Run the plan'}
        </Button>
        <Button type="button" color="default-secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Container>
  );
};
