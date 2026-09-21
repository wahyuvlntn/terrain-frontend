import {
  AuthCtx,
  Button,
  Checkbox,
  Container,
  DateTimePicker,
  InfoTooltip,
  Input,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  TextBox,
} from '@digital-twin/components';
import { ArrowRight, Plus, TrashDelete } from '@digital-twin/icons';
import {
  RadioButton,
  TabProduct as Tab,
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProvider,
} from '@digital-twin/reusables';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ReactNode, useContext, useMemo, useState } from 'react';
import { Controller, FieldErrors, get, useFieldArray, useForm, useWatch } from 'react-hook-form';

import { getFaultCatalog, SIM_QUERY, submitJob } from '../api/simulation.api';
import { DURATION_PRESETS, SPEC_LIMITS } from '../simulation.catalog';
import styles from '../simulation.module.scss';
import { ActionList } from './action-list';
import { durationText, errorText } from './job-bits';
import {
  ActionForm,
  defaultScenario,
  localInput,
  ScenarioForm as ScenarioFormValues,
  scenarioSchema,
  toSpec,
} from './scenario-form.schema';

const message = (errors: FieldErrors<ScenarioFormValues>, path: string) =>
  (get(errors, path) as { message?: string } | undefined)?.message;

type StepKey = 'scenario' | 'conditions' | 'actions';

/** Steps of the form and the fields each one holds (to flag a step with errors) */
const STEPS: { key: StepKey; label: string; fields: (keyof ScenarioFormValues)[] }[] = [
  { key: 'scenario', label: 'Scenario', fields: ['title', 'rationale', 'startAt', 'duration_min'] },
  {
    key: 'conditions',
    label: 'Conditions',
    fields: ['initial', 'stochastic', 'seed', 'dry_bulb_offset', 'wet_bulb_offset', 'load_scale'],
  },
  { key: 'actions', label: 'Actions & variants', fields: ['actions', 'variants'] },
];

const Field = ({
  label,
  info,
  children,
  className,
}: {
  label: string;
  info?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <div className={clsx(styles.field, className)}>
    <span className={styles.field__label}>
      {label}
      {info ? <InfoTooltip title={label} content={info} /> : null}
    </span>
    {children}
  </div>
);

type ScenarioFormProps = {
  /** a job was submitted */
  onCreated: (jobId: number) => void;
  onCancel: () => void;
};

/**
 * New what-if scenario on the digital twin, in three steps: what and when (title, start, length),
 * the starting state and conditions, then the actions common to every variant and those of a
 * baseline and up to two alternatives. Submitting queues the job at once (simulation.create).
 */
export const ScenarioForm = ({ onCreated, onCancel }: ScenarioFormProps) => {
  const queryClient = useQueryClient();
  const { hasPermission } = useContext(AuthCtx);
  const canCreate = hasPermission(
    PermissionGroupAliasEnum.enum.simulation,
    PermissionAliasEnum.enum.create
  );
  const catalogQuery = useQuery({
    queryKey: SIM_QUERY.faultCatalog,
    queryFn: getFaultCatalog,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    meta: { toastId: 'simulationFaultCatalog' },
  });
  const catalog = catalogQuery.data;
  const resolver = useMemo(() => zodResolver(scenarioSchema(catalog)), [catalog]);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<ScenarioFormValues>({ resolver, defaultValues: defaultScenario() });
  const variants = useFieldArray({ control, name: 'variants' });
  const [startMode, durationMin, common, variantValues] = useWatch({
    control,
    name: ['startMode', 'duration_min', 'actions', 'variants'],
  });
  const total =
    (common?.length ?? 0) + (variantValues ?? []).reduce((n, v) => n + (v.actions?.length ?? 0), 0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState<StepKey>('scenario');
  /** the action list shown in the last step: -1 = common to every variant, else a variant */
  const [list, setList] = useState(-1);

  const submit = useMutation({
    mutationFn: (values: ScenarioFormValues) =>
      submitJob({
        title: values.title.trim(),
        spec: toSpec(values),
        rationale: values.rationale.trim(),
      }),
    meta: { toastId: 'simulationSubmit', hideToast: true },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: SIM_QUERY.jobs });
      onCreated(job.id);
    },
    onError: (err) => setSubmitError(errorText(err)),
  });

  const stepHasErrors = (key: StepKey) =>
    STEPS.find((s) => s.key === key)?.fields.some((f) => !!errors[f]) ?? false;

  const onSubmit = handleSubmit(
    (values) => {
      setSubmitError(null);
      submit.mutate(values);
    },
    // show the first step with a problem
    (invalid) => {
      const first = STEPS.find((s) => s.fields.some((f) => !!invalid[f]));
      if (first) setStep(first.key);
      // in the actions step, open the list (all variants / one variant) holding the first error
      if (invalid.actions) setList(-1);
      else if (Array.isArray(invalid.variants)) {
        const i = invalid.variants.findIndex(Boolean);
        if (i >= 0) setList(i);
      }
    }
  );

  const now = new Date();
  const latestStart = new Date(now.getTime() + SPEC_LIMITS.startAheadDays * 86_400_000);
  const duration = Number.isFinite(durationMin) ? (durationMin as number) : 0;
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const shownList = list < variants.fields.length ? list : -1;
  const listError =
    shownList === -1
      ? (errors.actions?.root?.message ?? errors.actions?.message)
      : message(errors, `variants.${shownList}.name`);

  return (
    <Container
      title="New scenario"
      icon={<Plus width={24} height={24} />}
      background="none"
      className={styles.main}
      titleSuffixIcon={
        <InfoTooltip
          title="New scenario"
          content="Runs on a copy of the CUB chiller plant model; the live plant is not touched. Compare a baseline with up to two alternatives, then replay them in the digital twin."
        />
      }
      contentWrapperProps={{ style: { overflow: 'hidden', gap: 16 } }}
    >
      <form
        className={styles.form}
        onSubmit={onSubmit}
        noValidate
        aria-label="New scenario"
        // Enter in a field must not queue the simulation: only the Submit button does
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT')
            e.preventDefault();
        }}
      >
        <TabProvider
          value={step}
          onChange={(v) => setStep(v as StepKey)}
          type="1"
          className={styles.tabs}
        >
          <TabList className={styles.tabs__list}>
            {STEPS.map((s, i) => (
              <Tab key={s.key} value={s.key} className={styles.tabs__tab}>
                <span className={styles.step}>
                  <i>{i + 1}</i>
                  {s.label}
                  {isSubmitted && stepHasErrors(s.key) ? (
                    <b className={styles.step__error} aria-label="has errors" />
                  ) : null}
                </span>
              </Tab>
            ))}
          </TabList>

          <TabPanel value="scenario" className={styles.tabs__panel}>
            <div className={styles.formgrid}>
              <Input
                label="Title"
                registered="title"
                control={control}
                background="dark"
                placeholder="e.g. Raise the CHW supply set point to 7.5 °C"
                inputProps={{ maxLength: 200 }}
                wrapperProps={{ className: styles['formgrid__wide'] }}
              />
              <TextBox
                label="Notes (optional)"
                registered="rationale"
                control={control}
                background="dark"
                rows={2}
                maxLength={2000}
                placeholder="Why this scenario, what to look at"
                wrapperClassName={styles['formgrid__wide']}
              />
              <Field
                label="Start"
                info={`Now: from the plant as it is when the job runs. Later: simulates that time window (its weather and load) from the plant as it is now, up to ${SPEC_LIMITS.startAheadDays} days ahead.`}
              >
                <Controller
                  control={control}
                  name="startMode"
                  render={({ field }) => (
                    <div className={styles.radios} role="radiogroup" aria-label="Start">
                      <RadioButton
                        label="Now"
                        name="startMode"
                        checked={field.value === 'now'}
                        onChange={() => field.onChange('now')}
                      />
                      <RadioButton
                        label="Later"
                        name="startMode"
                        checked={field.value === 'at'}
                        onChange={() => field.onChange('at')}
                      />
                    </div>
                  )}
                />
                {startMode === 'at' ? (
                  <DateTimePicker
                    type="datetime-local"
                    registered="startAt"
                    control={control}
                    hideSecond
                    background="dark"
                    aria-label="Start time"
                    min={localInput(now)}
                    max={localInput(latestStart)}
                  />
                ) : null}
              </Field>
              <Field label="Length">
                <div className={styles.presets}>
                  {DURATION_PRESETS.map((p) => (
                    <Button
                      type="button"
                      key={p.minutes}
                      color={durationMin === p.minutes ? 'default-primary' : 'default-secondary'}
                      aria-pressed={durationMin === p.minutes}
                      onClick={() =>
                        setValue('duration_min', p.minutes, { shouldValidate: isSubmitted })
                      }
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  registered="duration_min"
                  control={control}
                  background="dark"
                  suffix={`min · ${durationText(duration)}`}
                  inputProps={{
                    min: SPEC_LIMITS.durationMin,
                    max: SPEC_LIMITS.durationMax,
                    step: 10,
                    'aria-label': 'Length in minutes',
                  }}
                />
              </Field>
            </div>
          </TabPanel>

          <TabPanel value="conditions" className={styles.tabs__panel}>
            <div className={styles.formgrid}>
              <Field
                label="Starting state"
                info="Live: the plant's current controls, faults and trips. Nominal: default controls, no faults."
              >
                <Controller
                  control={control}
                  name="initial"
                  render={({ field }) => (
                    <div className={styles.radios} role="radiogroup" aria-label="Starting state">
                      <RadioButton
                        label="Live plant"
                        name="initial"
                        checked={field.value === 'live'}
                        onChange={() => field.onChange('live')}
                      />
                      <RadioButton
                        label="Nominal"
                        name="initial"
                        checked={field.value === 'nominal'}
                        onChange={() => field.onChange('nominal')}
                      />
                    </div>
                  )}
                />
              </Field>
              <Field
                label="Random events"
                info="Random faults, trips and communication loss during the run. The seed makes a run repeatable (0 = from the job id)."
              >
                <Checkbox
                  label="Random faults and trips"
                  registered="stochastic"
                  control={control}
                />
                <Input
                  label="Seed"
                  labelPosition="left"
                  type="number"
                  registered="seed"
                  control={control}
                  background="dark"
                  inputProps={{ min: 0, step: 1 }}
                />
              </Field>
              <Field
                label="Weather"
                info="Offset added to the recorded dry bulb and wet bulb temperatures"
              >
                <Input
                  label="Dry bulb"
                  type="number"
                  registered="dry_bulb_offset"
                  control={control}
                  background="dark"
                  suffix="°C"
                  inputProps={{
                    step: 0.1,
                    min: SPEC_LIMITS.weatherOffset[0],
                    max: SPEC_LIMITS.weatherOffset[1],
                  }}
                />
                <Input
                  label="Wet bulb"
                  type="number"
                  registered="wet_bulb_offset"
                  control={control}
                  background="dark"
                  suffix="°C"
                  inputProps={{
                    step: 0.1,
                    min: SPEC_LIMITS.weatherOffset[0],
                    max: SPEC_LIMITS.weatherOffset[1],
                  }}
                />
              </Field>
              <Field
                label="Cooling load"
                info={`Plant cooling load × this factor (${SPEC_LIMITS.loadScale[0]} to ${SPEC_LIMITS.loadScale[1]})`}
              >
                <Input
                  type="number"
                  registered="load_scale"
                  control={control}
                  background="dark"
                  suffix="× load"
                  inputProps={{
                    step: 0.05,
                    min: SPEC_LIMITS.loadScale[0],
                    max: SPEC_LIMITS.loadScale[1],
                    'aria-label': 'Cooling load factor',
                  }}
                />
              </Field>
            </div>
          </TabPanel>

          <TabPanel value="actions" className={styles.tabs__panel}>
            <div className={styles.lists}>
              <div className={styles.lists__bar}>
                <TabProvider
                  value={String(shownList)}
                  onChange={(v) => setList(Number(v))}
                  type="2"
                  className={styles.lists__tabs}
                >
                  <TabList className={styles.subtabs}>
                    {[
                      <Tab key="common" value="-1" className={styles.subtabs__tab}>
                        <span className={styles.step}>
                          {`All variants (${common?.length ?? 0})`}
                          {isSubmitted && errors.actions ? (
                            <b className={styles.step__error} aria-label="has errors" />
                          ) : null}
                        </span>
                      </Tab>,
                      ...variants.fields.map((v, i) => (
                        <Tab key={v.id} value={String(i)} className={styles.subtabs__tab}>
                          <span className={styles.step}>
                            {`${variantValues?.[i]?.name || `variant ${i + 1}`} (${
                              variantValues?.[i]?.actions?.length ?? 0
                            })`}
                            {isSubmitted && errors.variants?.[i] ? (
                              <b className={styles.step__error} aria-label="has errors" />
                            ) : null}
                          </span>
                        </Tab>
                      )),
                    ]}
                  </TabList>
                </TabProvider>
                {variants.fields.length < SPEC_LIMITS.maxVariants ? (
                  <Button
                    type="button"
                    color="default-secondary"
                    icon={<Plus width={20} height={20} />}
                    onClick={() => {
                      variants.append({
                        name: `alternative-${variants.fields.length}`,
                        actions: [],
                      });
                      setList(variants.fields.length);
                    }}
                  >
                    Add alternative
                  </Button>
                ) : null}
                <InfoTooltip
                  title="Variants"
                  content="Every variant runs the same scenario from the same state and seed. The baseline is the reference; actions under All variants apply to each of them."
                />
              </div>

              {shownList >= 0 ? (
                <div className={styles.lists__variant}>
                  <Input
                    key={variants.fields[shownList].id}
                    label={shownList === 0 ? 'Baseline name' : 'Alternative name'}
                    labelPosition="left"
                    registered={`variants.${shownList}.name`}
                    control={control}
                    background="dark"
                    readOnly={shownList === 0}
                  />
                  {shownList > 0 ? (
                    <Button
                      type="button"
                      color="default-secondary"
                      icon={<TrashDelete width={20} height={20} />}
                      onClick={() => {
                        variants.remove(shownList);
                        setList(-1);
                      }}
                    >
                      Remove variant
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {catalogQuery.isError ? (
                <p className={styles['text--error']}>
                  Fault catalog unavailable: no fault injections
                </p>
              ) : null}

              {shownList === -1 ? (
                <ActionList
                  key="common"
                  control={control}
                  setValue={setValue}
                  name="actions"
                  catalog={catalog}
                  durationMin={duration}
                  total={total}
                  empty="No common actions"
                />
              ) : (
                <ActionList
                  key={variants.fields[shownList].id}
                  control={control}
                  setValue={setValue}
                  name={`variants.${shownList}.actions`}
                  catalog={catalog}
                  inherited={(common ?? []) as ActionForm[]}
                  durationMin={duration}
                  total={total}
                  empty={shownList === 0 ? 'No changes: the plant as it is' : 'No changes yet'}
                />
              )}
              {listError ? (
                <p className={styles['text--error']} role="alert">
                  {listError}
                </p>
              ) : null}
            </div>
          </TabPanel>
        </TabProvider>

        <footer className={styles.form__footer}>
          <span className={styles.caption}>
            {variants.fields.length} variant{variants.fields.length > 1 ? 's' : ''} · {total} action
            {total === 1 ? '' : 's'} · {durationText(duration)} each
          </span>
          {submitError ? (
            <span className={styles['text--error']} role="alert">
              {submitError}
            </span>
          ) : isSubmitted && Object.keys(errors).length ? (
            <span className={styles['text--error']} role="alert">
              Check the marked steps
            </span>
          ) : null}
          <div className={styles.form__buttons}>
            <Button type="button" color="default-secondary" onClick={onCancel}>
              Cancel
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button
                type="button"
                color="default-secondary"
                suffixIcon={<ArrowRight width={20} height={20} />}
                onClick={() => setStep(STEPS[stepIndex + 1].key)}
              >
                Next
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={!canCreate || submit.isPending}
              isLoading={submit.isPending}
              title={canCreate ? undefined : 'Needs the Simulation › Create permission'}
            >
              Submit simulation
            </Button>
          </div>
        </footer>
      </form>
    </Container>
  );
};
