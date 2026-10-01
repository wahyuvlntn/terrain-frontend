import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { format } from 'date-fns';
import { FormEvent, memo, useEffect, useId, useMemo, useState } from 'react';

import {
  getMaintenanceInstructions,
  getTechnicians,
} from '../../maintenance-order/api/maintenance-order';
import { FormBlock } from '../ai-assistant.messages';
import { assistantStore } from '../ai-assistant.store';
import { AssistantForm, FormField } from '../api/ai-assistant.api';
import styles from './form-card.module.scss';

type Option = { value: string | number | boolean; label: string };
type Values = Record<string, unknown>;

/**
 * A form the agent asks the user to fill in (elicitation), prefilled with what the user said.
 * Native controls: the panel floats above the app's popovers, so dropdown menus would open behind
 * it. Submitting sends the values with a message; the service carries the action out as the user
 * and the card shows the outcome (a refused submission stays editable).
 */
export const FormCard = memo(({ block, disabled }: { block: FormBlock; disabled: boolean }) => {
  const { form, state, message } = block;
  const [values, setValues] = useState<Values>(() => initialValues(form));
  const [touched, setTouched] = useState(false);
  const [labels, setLabels] = useState<Record<string, Option[]>>({});
  const locked = state === 'done' || state === 'submitting';
  const visible = form.fields.filter((f) => isVisible(f, values));
  const missing = visible.filter((f) => f.required && f.type !== 'info' && isEmpty(values[f.name]));

  const change = (field: FormField, value: unknown) =>
    setValues((prev) => {
      const next = { ...prev, [field.name]: value };
      // options that depend on this field (technicians of the equipment) start over
      for (const f of form.fields) if (f.dependsOn === field.name) next[f.name] = [];
      return next;
    });

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setTouched(true);
    if (missing.length || disabled || locked) return;
    const out = collect(visible, values);
    assistantStore.submitForm(form.formId, out, summaryOf(form, visible, out, labels));
  };

  return (
    <form
      className={clsx(styles.card, form.danger && styles['card--danger'])}
      onSubmit={submit}
      aria-label={form.title}
      noValidate
    >
      <div className={styles.head}>
        <strong>{form.title}</strong>
        {state === 'done' ? (
          <span className={styles.badge}>Done</span>
        ) : state === 'submitting' ? (
          <span className={styles.badge}>Sending…</span>
        ) : null}
      </div>
      {form.description && state !== 'done' ? (
        <p className={styles.desc}>{form.description}</p>
      ) : null}
      <fieldset className={styles.fields} disabled={locked}>
        {visible.map((f) => (
          <FieldRow
            key={f.name}
            field={f}
            value={values[f.name]}
            values={values}
            context={form.context}
            invalid={touched && missing.includes(f)}
            onChange={(v) => change(f, v)}
            onOptions={(opts) =>
              setLabels((prev) => (prev[f.name] === opts ? prev : { ...prev, [f.name]: opts }))
            }
          />
        ))}
      </fieldset>
      {state === 'done' && message ? <p className={styles.result}>{message}</p> : null}
      {state === 'failed' && message ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
      {state !== 'done' ? (
        <div className={styles.actions}>
          <button
            type="submit"
            className={clsx(styles.submit, form.danger && styles['submit--danger'])}
            disabled={disabled || locked}
          >
            {state === 'submitting' ? 'Sending…' : form.submitLabel}
          </button>
          {touched && missing.length ? (
            <span className={styles.missing}>
              Fill in: {missing.map((f) => f.label).join(', ')}
            </span>
          ) : disabled && state !== 'submitting' ? (
            <span className={styles.missing}>Wait for the answer to finish</span>
          ) : null}
        </div>
      ) : null}
    </form>
  );
});
FormCard.displayName = 'FormCard';

type FieldRowProps = {
  field: FormField;
  value: unknown;
  values: Values;
  context: Record<string, unknown>;
  invalid: boolean;
  onChange: (value: unknown) => void;
  onOptions: (options: Option[]) => void;
};

const FieldRow = ({
  field,
  value,
  values,
  context,
  invalid,
  onChange,
  onOptions,
}: FieldRowProps) => {
  const id = useId();
  const dynamic = useFieldOptions(field, values, context);
  const options: Option[] = field.optionsSource ? dynamic.options : field.options;
  // the labels of loaded options, for the summary message
  useEffect(() => onOptions(options), [options, onOptions]);

  if (field.type === 'info') {
    return (
      <div className={styles.info}>
        {field.label ? <span>{field.label}</span> : null}
        <span>{String(field.value ?? '')}</span>
      </div>
    );
  }
  if (field.type === 'checkbox') {
    return (
      <label className={styles.check} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }
  const label = (
    <label className={styles.label} htmlFor={id}>
      {field.label}
      {field.required ? <span aria-hidden="true"> *</span> : null}
      {field.unit ? <span className={styles.unit}> ({field.unit})</span> : null}
    </label>
  );
  const common = {
    id,
    'aria-invalid': invalid || undefined,
    'aria-required': field.required || undefined,
    className: clsx(styles.input, invalid && styles['input--invalid']),
  };
  let control;
  if (field.type === 'textarea') {
    control = (
      <textarea
        {...common}
        rows={3}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else if (field.type === 'number') {
    control = (
      <input
        {...common}
        type="number"
        inputMode="decimal"
        min={field.min ?? undefined}
        max={field.max ?? undefined}
        step={field.step ?? 'any'}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else if (field.type === 'datetime') {
    control = (
      <input
        {...common}
        type="datetime-local"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else if (field.type === 'select') {
    control = (
      <select
        {...common}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) =>
          onChange(options.find((o) => String(o.value) === e.target.value)?.value ?? null)
        }
      >
        <option value="">{options.length ? 'Choose…' : 'No options'}</option>
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'multiselect') {
    const chosen = Array.isArray(value) ? value : [];
    control = (
      <div
        className={clsx(styles.multi, invalid && styles['input--invalid'])}
        id={id}
        role="group"
        aria-label={field.label}
      >
        {dynamic.waiting ? (
          <span className={styles.hint}>{dynamic.waiting}</span>
        ) : options.length ? (
          options.map((o) => {
            const on = chosen.some((c) => String(c) === String(o.value));
            return (
              <label key={String(o.value)} className={styles.check}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    onChange(
                      on
                        ? chosen.filter((c) => String(c) !== String(o.value))
                        : [...chosen, o.value]
                    )
                  }
                />
                <span>{o.label}</span>
              </label>
            );
          })
        ) : (
          <span className={styles.hint}>None available</span>
        )}
      </div>
    );
  } else {
    control = (
      <input
        {...common}
        type="text"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <div className={styles.row}>
      {label}
      {control}
      {field.help ? <span className={styles.hint}>{field.help}</span> : null}
    </div>
  );
};

/** Options loaded from the Maintenance Order page's lists for the chosen equipment */
const useFieldOptions = (field: FormField, values: Values, context: Record<string, unknown>) => {
  const source = field.optionsSource;
  const dep = field.dependsOn ?? '';
  const assetId = Number(values[dep] ?? context[dep]) || null;
  const maintenanceId = Number(context.maintenance_id) || 0;
  const query = useQuery({
    queryKey: ['AI_ASSISTANT', 'FORM_OPTIONS', source, assetId, maintenanceId],
    queryFn: async (): Promise<Option[]> => {
      if (source === 'technicians') {
        const rows = await getTechnicians({
          building_id: null,
          equipment_id: assetId as number,
          planned_start: null,
          planned_end: null,
          maintenance_id: maintenanceId,
        });
        return rows.map((r) => ({ value: r.value, label: r.label }));
      }
      const rows = await getMaintenanceInstructions({ asset_id: assetId as number });
      return rows.map((r) => ({ value: r.value, label: r.label }));
    },
    enabled: !!source && assetId !== null,
    staleTime: 60_000,
  });
  const options = useMemo(() => query.data ?? [], [query.data]);
  const waiting = !source
    ? null
    : assetId === null
      ? 'Choose the equipment first'
      : query.isLoading
        ? 'Loading…'
        : query.isError
          ? 'Could not load the list'
          : null;
  return { options, waiting };
};

const isVisible = (f: FormField, values: Values) =>
  !f.visibleIf ||
  f.visibleIf.in.some((v) => String(v) === String(values[f.visibleIf!.field] ?? ''));

const isEmpty = (v: unknown) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

const initialValues = (form: AssistantForm): Values => {
  const out: Values = {};
  for (const f of form.fields) {
    if (f.type === 'info') continue;
    if (f.type === 'multiselect') out[f.name] = Array.isArray(f.value) ? f.value : [];
    else if (f.type === 'checkbox') out[f.name] = f.value === true;
    else out[f.name] = f.value ?? null;
  }
  return out;
};

/** The values of the shown fields, typed (numbers as numbers, empty as null) */
const collect = (fields: FormField[], values: Values): Values => {
  const out: Values = {};
  for (const f of fields) {
    if (f.type === 'info') continue;
    const v = values[f.name];
    if (f.type === 'number')
      out[f.name] = v === '' || v === null || v === undefined ? null : Number(v);
    else if (f.type === 'text' || f.type === 'textarea')
      out[f.name] = String(v ?? '').trim() || null;
    else out[f.name] = v ?? null;
  }
  return out;
};

const display = (f: FormField, v: unknown, options: Option[]) => {
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return null;
  const opts = f.optionsSource ? options : f.options;
  const label = (x: unknown) => opts.find((o) => String(o.value) === String(x))?.label ?? String(x);
  if (f.type === 'checkbox') return v ? 'yes' : 'no';
  if (f.type === 'multiselect') return (v as unknown[]).map(label).join(', ');
  if (f.type === 'select') return label(v);
  if (f.type === 'datetime') {
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? String(v) : format(d, 'd MMM yyyy HH:mm');
  }
  return `${String(v)}${f.unit ? ` ${f.unit}` : ''}`;
};

/** The user's message for a submitted form: its title and the values filled in */
const summaryOf = (
  form: AssistantForm,
  fields: FormField[],
  values: Values,
  labels: Record<string, Option[]>
) => {
  const parts = fields
    .filter((f) => f.type !== 'info')
    .map((f) => {
      const shown = display(f, values[f.name], labels[f.name] ?? []);
      return shown ? `${f.label}: ${shown}` : null;
    })
    .filter(Boolean)
    .slice(0, 10);
  const text = `Submitted "${form.title}"${parts.length ? ` - ${parts.join('; ')}` : ''}`;
  return text.length > 1500 ? `${text.slice(0, 1499)}…` : text;
};
