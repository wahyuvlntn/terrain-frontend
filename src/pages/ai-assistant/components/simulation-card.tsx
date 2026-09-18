import {
  AuthCtx,
  Badge,
  Button,
  Input,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '@digital-twin/components';
import { Cube } from '@digital-twin/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ComponentProps,
  KeyboardEvent,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import {
  approveJob,
  getJob,
  rejectJob,
  SIM_QUERY,
  SimJobDetail,
} from '../../simulation/api/simulation.api';
import { simulationLink } from '../../simulation/simulation.links';
import { assistantStore, errorText } from '../ai-assistant.store';
import { SimulationProposal } from '../api/ai-assistant.api';
import styles from './simulation-card.module.scss';
import {
  ACTIVE_STATUSES,
  FINISHED_STATUSES,
  field,
  JobView,
  STATUS_LABEL,
  toJobView,
} from './simulation-job';

/** poll fast while the job runs, slowly while it waits for someone's approval */
const POLL_ACTIVE_MS = 3000;
const POLL_PROPOSED_MS = 15000;
const BASELINE = 'baseline';

type BadgeColor = NonNullable<ComponentProps<typeof Badge>['color']>;

const STATUS_BADGE: Record<string, BadgeColor> = {
  PROPOSED: 'warning',
  QUEUED: 'secondary',
  RUNNING: 'primary',
  ANALYZING: 'primary',
  SUCCEEDED: 'normal',
  FAILED: 'critical',
  REJECTED: 'offline',
  CANCELLED: 'offline',
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const fmt = (v: number | null, digits: number, unit = '') =>
  v === null
    ? '—'
    : `${v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })}${unit}`;

/** "4 h", "1 h 30 min", "45 min" */
const durationText = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const actionCount = (v: unknown) => {
  const actions = field(v, 'actions');
  return Array.isArray(actions) ? actions.length : 0;
};

/**
 * Short chips of what the run simulates, from the job's spec (once loaded) or the proposal's spec
 * summary: length, start, starting state, variants with their action counts.
 */
export const specChips = (spec: unknown): string[] => {
  if (typeof spec === 'string') {
    // the agent's summary: "120 min; from now; live initial state; …"
    return spec
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
  }
  if (!isObj(spec)) return [];
  const chips: string[] = [];
  const duration = num(field(spec, 'duration_min'));
  if (duration !== null) chips.push(durationText(duration));
  const start = field(spec, 'start');
  if (typeof start === 'string' && start) {
    const t = Date.parse(start);
    chips.push(
      Number.isFinite(t)
        ? `from ${new Date(t).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
        : `from ${start}`
    );
  } else if ('start' in spec) chips.push('from now');
  const initial = field(spec, 'initial');
  if (initial === 'live') chips.push('Live plant');
  if (initial === 'nominal') chips.push('Nominal plant');
  if (field(spec, 'stochastic') === true) chips.push('Random events');
  const common = actionCount(spec);
  if (common) chips.push(`${common} common action${common > 1 ? 's' : ''}`);
  const variants = field(spec, 'variants');
  if (Array.isArray(variants)) {
    variants.forEach((v) => {
      const name = typeof v === 'string' ? v : field(v, 'name');
      if (typeof name !== 'string') return;
      const n = actionCount(v);
      chips.push(n ? `${name} · ${n} action${n > 1 ? 's' : ''}` : name);
    });
  }
  return chips;
};

type Violation = { variant: string; label: string; minutes: number | null; critical: boolean };

/** Constraint violations of every variant, read leniently from the job's summary */
const violationsOf = (row: unknown): Violation[] => {
  const variants = field(field(row, 'summary'), 'variants');
  if (!isObj(variants)) return [];
  return Object.entries(variants).flatMap(([variant, v]) => {
    const list = field(v, 'constraint_violations');
    return Array.isArray(list)
      ? list.map((c) => ({
          variant,
          label: String(field(c, 'label') ?? field(c, 'constraint') ?? 'constraint'),
          minutes: num(field(c, 'minutes')),
          critical: field(c, 'critical') !== false,
        }))
      : [];
  });
};

type CardJob = JobView & { spec: unknown; violations: Violation[] };

/** Energy of each variant as a compact table with an inline bar, and the saving against the baseline */
const VariantBars = ({ job }: { job: CardJob }) => {
  if (!job.variants.length) return null;
  const max = Math.max(...job.variants.map((v) => v.energyKwh ?? 0), 1);
  const base = job.variants.find((v) => v.name === BASELINE) ?? job.variants[0];
  return (
    <table className={styles.bars}>
      <caption className={styles['visually-hidden']}>Results per variant</caption>
      <thead>
        <tr>
          <th scope="col">Variant</th>
          <th scope="col">Energy</th>
          <th scope="col">kW/RT</th>
        </tr>
      </thead>
      <tbody>
        {job.variants.map((v, i) => {
          const saving =
            v !== base && v.energyKwh !== null && base.energyKwh
              ? ((v.energyKwh - base.energyKwh) / base.energyKwh) * 100
              : null;
          return (
            <tr key={v.name}>
              <th scope="row" title={v.name}>
                {v.name}
                {v.success === false ? (
                  <Badge color="critical" className={styles.badge}>
                    violated
                  </Badge>
                ) : null}
              </th>
              <td>
                <span className={styles.bar}>
                  {/* the variant colours of the simulation page's charts (slot by order) */}
                  <i
                    className={styles[`bar--${i % 3}`]}
                    style={{ width: `${((v.energyKwh ?? 0) / max) * 100}%` }}
                  />
                </span>
                <span className={styles.value}>{fmt(v.energyKwh, 0, ' kWh')}</span>
                {saving !== null && Math.abs(saving) >= 0.05 ? (
                  <Badge
                    color={saving < 0 ? 'normal' : 'critical'}
                    fillVariant="outlined"
                    className={styles.badge}
                  >
                    {saving < 0 ? '−' : '+'}
                    {Math.abs(saving).toFixed(1)} %
                  </Badge>
                ) : null}
              </td>
              <td className={styles.value}>{fmt(v.avgKwPerRt, 3)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

type Confirm = { action: 'approve' | 'reject'; reason: string };

type SimulationCardProps = { simulation: SimulationProposal };

/**
 * A simulation the twin agent proposed. Agents can only propose: a person with Simulation › Create
 * approves (queues) or rejects it here, after an inline confirmation. The card follows the job
 * while it waits or runs, then shows the verdict, the energy of each variant, the constraint
 * violations and links to the full results and the replay, and the panel asks the assistant to
 * summarise it (once per job, see `assistantStore.observeJob`).
 */
export const SimulationCard = memo(({ simulation }: SimulationCardProps) => {
  const { jobId } = simulation;
  const queryClient = useQueryClient();
  const { hasPermission } = useContext(AuthCtx);
  const canRead = hasPermission(
    PermissionGroupAliasEnum.enum.simulation,
    PermissionAliasEnum.enum.read
  );
  const canApprove = hasPermission(
    PermissionGroupAliasEnum.enum.simulation,
    PermissionAliasEnum.enum.create
  );
  const canReplay = hasPermission(
    PermissionGroupAliasEnum.enum.digitaltwin,
    PermissionAliasEnum.enum.read
  );
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [actionError, setActionError] = useState('');
  const cardRef = useRef<HTMLElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const approveRef = useRef<HTMLButtonElement>(null);
  const rejectRef = useRef<HTMLButtonElement>(null);
  /** where the focus goes once the confirmation closes */
  const focusAfter = useRef<Confirm['action'] | 'card' | null>(null);

  const { data: job, isError } = useQuery({
    // the simulation page's cache of the job: a decision taken there or here shows in both at once
    queryKey: SIM_QUERY.job(jobId),
    queryFn: () => getJob(jobId),
    select: (row): CardJob => ({
      ...toJobView(row, jobId),
      spec: field(row, 'spec') ?? null,
      violations: violationsOf(row),
    }),
    enabled: canRead,
    retry: false,
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false;
      const status = query.state.data?.status ?? simulation.status;
      if (ACTIVE_STATUSES.has(status)) return POLL_ACTIVE_MS;
      return status === 'PROPOSED' ? POLL_PROPOSED_MS : false;
    },
    meta: { toastId: `aiAssistantJob${jobId}` },
  });

  const status = job?.status || simulation.status;

  useEffect(() => {
    if (job?.status) assistantStore.observeJob(jobId, job.status);
  }, [jobId, job?.status]);

  const decide = useMutation({
    mutationFn: ({ action, reason }: Confirm) =>
      action === 'approve' ? approveJob(jobId) : rejectJob(jobId, reason.trim() || undefined),
    // the outcome shows on the card; failures also raise the app's error toast
    meta: { toastId: `aiAssistantDecide${jobId}`, hideToast: true },
    onSuccess: (row) => {
      setActionError('');
      // the decided job row (no spec or results) over the cached job, until the refetch
      queryClient.setQueryData<SimJobDetail>(SIM_QUERY.job(jobId), (old) =>
        old ? { ...old, ...row } : old
      );
      assistantStore.observeJob(jobId, row.status);
    },
    onError: (e) => setActionError(errorText(e, 'The decision could not be saved.')),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SIM_QUERY.job(jobId) });
      queryClient.invalidateQueries({ queryKey: SIM_QUERY.jobs });
    },
  });

  // the confirmation takes the focus when it opens (it replaced the focused button); when it
  // closes the focus goes back to the button that asked, or to the card once a decision was sent
  const asking = confirm?.action ?? null;
  useEffect(() => {
    if (asking) {
      confirmRef.current?.focus();
      return;
    }
    const target = focusAfter.current;
    focusAfter.current = null;
    if (target === 'approve') approveRef.current?.focus();
    else if (target === 'reject') rejectRef.current?.focus();
    else if (target === 'card') cardRef.current?.focus();
  }, [asking]);

  const cancel = () => {
    focusAfter.current = confirm?.action ?? null;
    setConfirm(null);
  };

  const proposed = status === 'PROPOSED';
  const finished = FINISHED_STATUSES.has(status);
  const chips = specChips(job?.spec ?? simulation.specSummary);
  const title = job?.title || simulation.title;
  const rationale = simulation.rationale || job?.rationale || '';

  const send = () => {
    if (!confirm) return;
    decide.mutate(confirm);
    focusAfter.current = 'card';
    setConfirm(null);
  };

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      className={styles.card}
      aria-label={`Simulation #${jobId}: ${title}`}
    >
      <header className={styles.head}>
        <Cube aria-hidden="true" width={20} height={20} />
        <div className={styles.head__title}>
          <span className={styles.caption}>Simulation #{jobId}</span>
          <strong title={title}>{title}</strong>
        </div>
        <Badge color={STATUS_BADGE[status] ?? 'secondary'} className={styles.badge} role="status">
          {STATUS_LABEL[status] ?? status}
        </Badge>
      </header>

      {rationale ? (
        <p className={styles.rationale} title={rationale}>
          {rationale}
        </p>
      ) : null}

      {chips.length ? (
        <ul className={styles.chips} aria-label="Scenario">
          {chips.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}

      {ACTIVE_STATUSES.has(status) ? (
        <div className={styles.progress}>
          <div
            role="progressbar"
            aria-label={`Simulation #${jobId} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              job?.progress !== null && job?.progress !== undefined
                ? Math.round(job.progress)
                : undefined
            }
          >
            <span
              style={{ width: `${job?.progress ?? 0}%` }}
              data-indeterminate={
                job?.progress === null || job?.progress === undefined || undefined
              }
            />
          </div>
          <small>
            {status === 'QUEUED'
              ? 'Waiting for the simulator'
              : status === 'ANALYZING'
                ? 'Checking the results'
                : job?.progress !== null && job?.progress !== undefined
                  ? `${Math.round(job.progress)} %`
                  : 'Running'}
          </small>
        </div>
      ) : null}

      {finished && job ? (
        <div className={styles.result}>
          {job.success !== null ? (
            <div className={styles.verdict}>
              <Badge color={job.success ? 'normal' : 'critical'} className={styles.badge}>
                {job.success ? 'Within constraints' : 'Constraints violated'}
              </Badge>
              {job.reason ? (
                <span className={styles.caption} title={job.reason}>
                  {job.reason}
                </span>
              ) : null}
            </div>
          ) : null}
          {status === 'FAILED' && job.error ? (
            <p className={styles.error} title={job.error}>
              {job.error}
            </p>
          ) : null}
          <VariantBars job={job} />
          {job.violations.length ? (
            <div className={styles.violations}>
              {job.violations.slice(0, 4).map((v) => (
                <Badge
                  key={`${v.variant}-${v.label}`}
                  color={v.critical ? 'critical' : 'warning'}
                  className={styles.badge}
                  title={v.variant}
                >
                  {v.label}
                  {v.minutes ? ` · ${Math.round(v.minutes)} min` : ''}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {canRead || (finished && canReplay) ? (
        <div className={styles.links}>
          {canRead ? <Link to={simulationLink(jobId)}>Open results</Link> : null}
          {finished && canReplay ? (
            <Link to={`/digital-twin?replay=${jobId}`}>Replay in digital twin</Link>
          ) : null}
        </div>
      ) : null}

      {!canRead ? (
        <p className={styles.hint}>Needs Simulation › Read to follow this job</p>
      ) : isError ? (
        <p className={styles.hint}>Job status unavailable</p>
      ) : null}

      {proposed && canApprove ? (
        confirm ? (
          // a decision is never taken by the keystroke that asked for it: the confirmation itself
          // is focused, not Confirm; the user clicks Confirm (or tabs to it); Esc cancels
          <div
            ref={confirmRef}
            tabIndex={-1}
            className={styles.confirm}
            role="alertdialog"
            aria-label={confirm.action === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
            onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                // Enter in the reason must not submit or press a button of the confirmation
                e.preventDefault();
                return;
              }
              if (e.key !== 'Escape') return;
              e.stopPropagation();
              cancel();
            }}
          >
            <span>
              {confirm.action === 'approve'
                ? `Run #${jobId} on a copy of the plant model?`
                : `Reject #${jobId}? It will not run.`}
            </span>
            {confirm.action === 'reject' ? (
              <Input
                label="Reason (optional)"
                background="dark"
                value={confirm.reason}
                onChange={(e) => setConfirm({ ...confirm, reason: e.target.value })}
                inputProps={{ maxLength: 500 }}
              />
            ) : null}
            <div className={styles.buttons}>
              <Button
                type="button"
                color={confirm.action === 'approve' ? 'default-primary' : 'error'}
                onClick={send}
              >
                {confirm.action === 'approve' ? 'Confirm and run' : 'Confirm rejection'}
              </Button>
              <Button type="button" color="default-secondary" onClick={cancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.buttons}>
            <Button
              ref={approveRef}
              type="button"
              disabled={decide.isPending}
              onClick={() => setConfirm({ action: 'approve', reason: '' })}
            >
              Approve
            </Button>
            <Button
              ref={rejectRef}
              type="button"
              color="default-secondary"
              disabled={decide.isPending}
              onClick={() => setConfirm({ action: 'reject', reason: '' })}
            >
              Reject
            </Button>
            {decide.isPending ? (
              <small className={styles.caption} role="status">
                Saving…
              </small>
            ) : null}
          </div>
        )
      ) : proposed ? (
        <p className={styles.hint}>Waiting for approval by a person with Simulation › Create</p>
      ) : null}

      {actionError ? (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      ) : null}
    </article>
  );
});
SimulationCard.displayName = 'SimulationCard';
