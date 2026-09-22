import { Button, Dropdown, InfoTooltip, Input } from '@digital-twin/components';
import { Plus, TrashDelete, Warning } from '@digital-twin/icons';
import {
  Control,
  FieldPath,
  get,
  UseFormSetValue,
  useFieldArray,
  useFormState,
  useWatch,
} from 'react-hook-form';

import { SimFault } from '../api/simulation.api';
import {
  ACTION_KINDS,
  CONTROL_UNITS,
  controlOf,
  controlsOf,
  PLANT_UNITS,
  SPEC_LIMITS,
} from '../simulation.catalog';
import styles from '../simulation.module.scss';
import { Empty } from './job-bits';
import {
  ActionForm,
  asNumber,
  faultsFor,
  gatingHint,
  newAction,
  ScenarioForm,
} from './scenario-form.schema';

/** Field arrays of actions: the common list, or one variant's */
export type ActionListName = 'actions' | `variants.${number}.actions`;

type Path = FieldPath<ScenarioForm>;

/** Default fields of a row switched to `kind` (the equipment and its first option) */
const forKind = (kind: ActionForm['kind'], row: ActionForm, catalog: SimFault[] | undefined) => {
  const base = { ...row, kind, param: '', fault: '', value: null, duration_min: null };
  if (kind === 'control') {
    const asset = controlsOf(row.asset).length ? row.asset : CONTROL_UNITS[0].alias;
    const control = controlsOf(asset)[0];
    return { ...base, asset, param: control?.param ?? '', value: control?.def ?? null };
  }
  if (kind === 'fault' || kind === 'clear_fault') {
    const fault = faultsFor(catalog, row.asset)[0] ?? catalog?.[0];
    const asset = fault
      ? fault.assets.includes(row.asset)
        ? row.asset
        : fault.assets[0]
      : row.asset;
    return {
      ...base,
      asset,
      fault: fault?.kind ?? '',
      value: kind === 'fault' ? (fault?.intensities[0] ?? null) : null,
    };
  }
  const asset = PLANT_UNITS.some((u) => u.alias === row.asset) ? row.asset : PLANT_UNITS[0].alias;
  return { ...base, asset, duration_min: kind === 'offline' ? 15 : null };
};

/** The optional length of an action, by kind (control: reverted to the value before it) */
const DURATION_FIELD: Partial<
  Record<ActionForm['kind'], { label: string; placeholder: string; title: string }>
> = {
  control: {
    label: 'Revert after',
    placeholder: 'never',
    title: 'Optional: the control returns to its previous value after this many minutes',
  },
  fault: {
    label: 'Clear after',
    placeholder: 'never',
    title: 'Optional: the fault clears after this many minutes',
  },
  trip: {
    label: 'Lasts',
    placeholder: '25–45',
    title: 'Optional: how long the unit stays tripped (default 25 to 45 min)',
  },
  offline: {
    label: 'For',
    placeholder: '',
    title: 'How long the unit stops reporting',
  },
  maintenance: {
    label: 'Release after',
    placeholder: 'never',
    title: 'Optional: the unit returns from maintenance after this many minutes',
  },
};

/** Equipment offered for a kind: controllable units, units with faults, or the plant units */
const assetsFor = (kind: ActionForm['kind'], catalog: SimFault[] | undefined) => {
  if (kind === 'control') return CONTROL_UNITS;
  if (kind === 'fault' || kind === 'clear_fault') {
    const withFaults = new Set((catalog ?? []).flatMap((f) => f.assets));
    return [
      ...CONTROL_UNITS.filter((u) => withFaults.has(u.alias)),
      // equipment of the catalog beyond the chiller plant units
      ...[...withFaults]
        .filter((a) => !CONTROL_UNITS.some((u) => u.alias === a))
        .sort()
        .map((alias) => ({ alias, tag: alias.replace('_', '-'), kind: '', group: 'Other' })),
    ];
  }
  return PLANT_UNITS;
};

/** Text of a number field (empty for no value) */
const numText = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v) ? '' : String(v);

type RowProps = {
  control: Control<ScenarioForm>;
  setValue: UseFormSetValue<ScenarioForm>;
  name: ActionListName;
  index: number;
  catalog: SimFault[] | undefined;
  /** actions in effect for this row (common + its variant), for the control-mode hint */
  scheduled: ActionForm[];
  durationMin: number;
  onRemove: () => void;
  onAddModeSwitch: (action: ActionForm) => void;
};

const ActionRow = ({
  control,
  setValue,
  name,
  index,
  catalog,
  scheduled,
  durationMin,
  onRemove,
  onAddModeSwitch,
}: RowProps) => {
  const prefix = `${name}.${index}` as const;
  const row = useWatch({ control, name: prefix as `actions.${number}` }) as ActionForm | undefined;
  const { errors, isSubmitted } = useFormState({ control, name: prefix as Path });
  if (!row) return null;
  const error = (field: keyof ActionForm) =>
    (get(errors, `${prefix}.${field}`) as { message?: string } | undefined)?.message;
  /** replace the row (dependent fields follow a change of kind / equipment / control / fault) */
  const replace = (next: ActionForm) =>
    setValue(prefix as `actions.${number}`, next, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });
  const set = <K extends keyof ActionForm>(field: K, value: ActionForm[K]) =>
    replace({ ...row, [field]: value });

  const ctl = row.kind === 'control' ? controlOf(row.asset, row.param) : undefined;
  const faults = faultsFor(catalog, row.asset);
  const fault = faults.find((f) => f.kind === row.fault);
  const hint = gatingHint(row, scheduled);
  const duration = DURATION_FIELD[row.kind];
  const kind = ACTION_KINDS.find((k) => k.value === row.kind);
  const assets = assetsFor(row.kind, catalog);
  const about = [
    kind?.hint,
    ctl
      ? ctl.options
        ? ctl.options.map((o) => o.label).join(' / ')
        : `${ctl.min} to ${ctl.max}${ctl.unit ? ` ${ctl.unit}` : ''}, steps of ${ctl.step}`
      : null,
    ctl?.hint,
    row.kind === 'fault' && fault
      ? `${fault.label}${fault.code ? ` raises ${fault.code}` : ''}${
          fault.intensities.length
            ? `; documented intensities ${fault.intensities.join(', ')}${fault.unit ? ` ${fault.unit}` : ''}`
            : ''
        }`
      : null,
    duration?.title,
  ].filter(Boolean);

  return (
    <li className={styles.action}>
      <div className={styles.action__fields}>
        <Input
          label="At"
          type="number"
          suffix="min"
          background="dark"
          value={numText(row.at_min)}
          onChange={(e) => set('at_min', asNumber(e.target.value) as number)}
          isError={!!error('at_min')}
          detail={error('at_min')}
          inputProps={{ min: 0, max: Math.max(durationMin - 1, 0), step: 1 }}
          wrapperProps={{ className: styles['action__at'] }}
        />
        <Dropdown
          label="Action"
          options={ACTION_KINDS.filter(
            (k) => (k.value !== 'fault' && k.value !== 'clear_fault') || !!catalog?.length
          ).map((k) => ({ value: k.value, label: k.label }))}
          value={row.kind}
          onChange={(v) => replace(forKind(v as ActionForm['kind'], row, catalog))}
          background="dark"
          wrapperClassName={styles['action__kind']}
        />
        <Dropdown
          label="Equipment"
          options={assets.map((u) => ({ value: u.alias, label: u.tag }))}
          value={row.asset}
          searchable
          error={error('asset')}
          background="dark"
          wrapperClassName={styles['action__asset']}
          onChange={(asset) => {
            if (row.kind === 'control') {
              const keep = controlOf(asset, row.param);
              const next = keep ?? controlsOf(asset)[0];
              replace({
                ...row,
                asset,
                param: next?.param ?? '',
                value: keep ? row.value : (next?.def ?? null),
              });
            } else if (row.kind === 'fault' || row.kind === 'clear_fault') {
              const options = faultsFor(catalog, asset);
              const keep = options.find((f) => f.kind === row.fault);
              const next = keep ?? options[0];
              replace({
                ...row,
                asset,
                fault: next?.kind ?? '',
                value:
                  row.kind === 'fault' ? (keep ? row.value : (next?.intensities[0] ?? null)) : null,
              });
            } else replace({ ...row, asset });
          }}
        />

        {row.kind === 'control' ? (
          <>
            <Dropdown
              label="Control"
              options={controlsOf(row.asset).map((c) => ({ value: c.param, label: c.label }))}
              value={row.param}
              error={error('param')}
              background="dark"
              wrapperClassName={styles['action__wide']}
              onChange={(param) => {
                const next = controlOf(row.asset, param);
                replace({ ...row, param, value: next?.def ?? null });
              }}
            />
            {ctl?.options ? (
              <Dropdown
                label="Mode"
                options={ctl.options.map((o) => ({ value: String(o.value), label: o.label }))}
                value={numText(row.value)}
                error={error('value')}
                background="dark"
                wrapperClassName={styles['action__value']}
                onChange={(v) => set('value', asNumber(v))}
              />
            ) : (
              <Input
                label="Value"
                type="number"
                suffix={ctl?.unit || undefined}
                background="dark"
                value={numText(row.value)}
                onChange={(e) => set('value', asNumber(e.target.value))}
                isError={!!error('value')}
                detail={error('value')}
                inputProps={{ min: ctl?.min, max: ctl?.max, step: ctl?.step ?? 'any' }}
                wrapperProps={{ className: styles['action__value'] }}
              />
            )}
          </>
        ) : null}

        {row.kind === 'fault' || row.kind === 'clear_fault' ? (
          <Dropdown
            label="Fault"
            options={faults.map((f) => ({
              value: f.kind,
              label: `${f.label}${f.code ? ` (${f.code})` : ''}`,
            }))}
            value={row.fault}
            error={error('fault')}
            background="dark"
            wrapperClassName={styles['action__wide']}
            onChange={(v) => {
              const next = faults.find((f) => f.kind === v);
              replace({
                ...row,
                fault: v,
                value: row.kind === 'fault' ? (next?.intensities[0] ?? null) : null,
              });
            }}
          />
        ) : null}

        {row.kind === 'fault' ? (
          fault?.intensities.length ? (
            <Dropdown
              label="Intensity"
              options={fault.intensities.map((v) => ({
                value: String(v),
                // signed when the documented values go both ways (sensor biases)
                label: `${v > 0 && fault.intensities.some((x) => x < 0) ? `+${v}` : v}${
                  fault.unit ? ` ${fault.unit}` : ''
                }`,
              }))}
              value={numText(row.value)}
              error={error('value')}
              background="dark"
              wrapperClassName={styles['action__value']}
              onChange={(v) => set('value', asNumber(v))}
            />
          ) : (
            <Input
              label="Intensity"
              type="number"
              suffix={fault?.unit || undefined}
              background="dark"
              value={numText(row.value)}
              onChange={(e) => set('value', asNumber(e.target.value))}
              isError={!!error('value')}
              detail={error('value')}
              inputProps={{ step: 'any' }}
              wrapperProps={{ className: styles['action__value'] }}
            />
          )
        ) : null}

        {duration ? (
          <Input
            label={duration.label}
            type="number"
            suffix="min"
            placeholder={duration.placeholder}
            background="dark"
            value={numText(row.duration_min)}
            onChange={(e) => set('duration_min', asNumber(e.target.value))}
            isError={!!error('duration_min')}
            detail={error('duration_min')}
            inputProps={{ min: 1, step: 1 }}
            wrapperProps={{ className: styles['action__duration'] }}
          />
        ) : null}

        <div className={styles.action__tools}>
          {about.length ? (
            <InfoTooltip
              title={kind?.label ?? 'Action'}
              content={about.join('. ')}
              contentStyle={{ maxWidth: 360 }}
            />
          ) : null}
          <Button
            type="button"
            color="default-secondary"
            icon={<TrashDelete width={20} height={20} />}
            aria-label={`Remove action ${index + 1}`}
            title="Remove"
            onClick={onRemove}
          />
        </div>
      </div>

      {hint ? (
        <div className={styles.action__hint}>
          <Warning width={20} height={20} aria-hidden="true" />
          <span>
            Needs {hint.label} in {hint.manual} by this minute
          </span>
          <Button
            type="button"
            color="default-secondary"
            onClick={() =>
              onAddModeSwitch({
                ...newAction(row.at_min),
                asset: row.asset,
                param: hint.mode,
                value:
                  controlOf(row.asset, hint.mode)?.options?.find((o) => o.value !== 0)?.value ?? 1,
              })
            }
          >
            Add switch to {hint.manual}
          </Button>
        </div>
      ) : null}
    </li>
  );
};

type ActionListProps = {
  control: Control<ScenarioForm>;
  setValue: UseFormSetValue<ScenarioForm>;
  name: ActionListName;
  catalog: SimFault[] | undefined;
  /** actions that also apply to this list's variant (the common list, for a variant) */
  inherited?: ActionForm[];
  durationMin: number;
  /** actions in the whole scenario, for the 200-action cap */
  total: number;
  empty: string;
};

/** Editable list of scheduled actions (set points / modes, faults, trips, comm loss, maintenance) */
export const ActionList = ({
  control,
  setValue,
  name,
  catalog,
  inherited = [],
  durationMin,
  total,
  empty,
}: ActionListProps) => {
  const { fields, append, insert, remove } = useFieldArray({
    control,
    name: name as 'actions',
  });
  const rows = (useWatch({ control, name: name as 'actions' }) ?? []) as ActionForm[];
  const scheduled = [...inherited, ...rows];
  const full = total >= SPEC_LIMITS.maxActions;

  return (
    <div className={styles['action-list']}>
      {fields.length ? (
        <ol className={styles['action-list__rows']}>
          {fields.map((f, i) => (
            <ActionRow
              key={f.id}
              control={control}
              setValue={setValue}
              name={name}
              index={i}
              catalog={catalog}
              scheduled={scheduled}
              durationMin={durationMin}
              onRemove={() => remove(i)}
              // the mode switch goes ahead of the set point it unlocks
              onAddModeSwitch={(action) => insert(i, action)}
            />
          ))}
        </ol>
      ) : (
        <Empty>{empty}</Empty>
      )}
      <div>
        <Button
          type="button"
          color="default-secondary"
          icon={<Plus width={20} height={20} />}
          disabled={full}
          title={full ? `At most ${SPEC_LIMITS.maxActions} actions` : undefined}
          onClick={() => append(newAction(rows.length ? rows[rows.length - 1].at_min : 0))}
        >
          Add action
        </Button>
      </div>
    </div>
  );
};
