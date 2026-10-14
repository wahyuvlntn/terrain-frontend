import { Button, Container, Dropdown, InfoTooltip, Loading } from '@digital-twin/components';
import { Check, Close, Cube } from '@digital-twin/icons';
import {
  TabProduct as Tab,
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProvider,
} from '@digital-twin/reusables';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getJob,
  SIM_ACTIVE_STATUSES,
  SIM_QUERY,
  SIM_REPLAYABLE_STATUSES,
  SimJob,
  SimJobStatus,
} from '../api/simulation.api';
import { DomainBanner, DOMAINS, domainOf, SimDomain } from '../simulation.domain';
import { replayLink } from '../simulation.links';
import styles from '../simulation.module.scss';
import { EventLog } from './event-log';
import { Empty, errorText, fmtTime, OriginBadge, Progress, StatusBadge } from './job-bits';
import { JobDecision } from './job-decision';
import { JobResults } from './job-results';
import { JobScenario } from './job-scenario';
import { ProductionResults } from './production-results';
import { VariantCharts } from './variant-charts';

/** Job refresh: every 3 s while it is worked on, every 10 s while it waits for approval */
const ACTIVE_MS = 3_000;
const PROPOSED_MS = 10_000;
/** Events exist once the run has started */
const HAS_EVENTS: readonly SimJobStatus[] = ['RUNNING', 'ANALYZING', 'SUCCEEDED', 'FAILED'];

type StepState = 'done' | 'current' | 'pending' | 'failed' | 'skipped';
type Step = {
  key: string;
  label: string;
  time?: string | null;
  by?: string | null;
  state: StepState;
};

/** Life cycle of a job as steps: proposal / approval (agent jobs), queue, run, analysis, result */
export const stepsOf = (job: SimJob): Step[] => {
  const s = job.status;
  const proposal =
    job.origin === 'agent' || !!job.approvedAt || s === 'PROPOSED' || s === 'REJECTED';
  const ran = !!job.startedAt;
  const notRun: StepState = s === 'REJECTED' ? 'skipped' : 'pending';
  const steps: Step[] = [
    {
      key: 'created',
      label: proposal ? 'Proposed' : 'Submitted',
      time: job.createdAt,
      by: job.requestedByName ?? (job.origin === 'agent' ? 'LEVO' : null),
      state: 'done',
    },
  ];
  if (proposal) {
    steps.push({
      key: 'approval',
      label: s === 'REJECTED' ? 'Rejected' : s === 'PROPOSED' ? 'Approval' : 'Approved',
      time: s === 'REJECTED' ? job.finishedAt : job.approvedAt,
      by: job.approvedByName,
      state:
        s === 'PROPOSED'
          ? 'current'
          : s === 'REJECTED'
            ? 'failed'
            : job.approvedAt
              ? 'done'
              : 'skipped',
    });
  }
  steps.push(
    {
      key: 'queued',
      label: 'Queued',
      state: s === 'QUEUED' ? 'current' : ran ? 'done' : notRun,
    },
    {
      key: 'run',
      label: s === 'RUNNING' ? `Running ${Math.round(job.progress * 100)} %` : 'Run',
      time: job.startedAt,
      state:
        s === 'RUNNING'
          ? 'current'
          : s === 'ANALYZING' || s === 'SUCCEEDED' || (s === 'FAILED' && ran)
            ? 'done'
            : notRun,
    },
    {
      key: 'analysis',
      label: 'Analysis',
      state: s === 'ANALYZING' ? 'current' : s === 'SUCCEEDED' ? 'done' : notRun,
    },
    {
      key: 'result',
      label:
        s === 'FAILED'
          ? 'Failed'
          : s === 'CANCELLED'
            ? 'Cancelled'
            : s === 'REJECTED'
              ? 'Not run'
              : 'Done',
      time: s === 'REJECTED' ? null : job.finishedAt,
      state: s === 'SUCCEEDED' ? 'done' : s === 'FAILED' || s === 'CANCELLED' ? 'failed' : notRun,
    }
  );
  return steps;
};

const StepIcon = ({ state, index }: { state: StepState; index: number }) =>
  state === 'done' ? (
    <Check width={14} height={14} />
  ) : state === 'failed' ? (
    <Close width={14} height={14} />
  ) : (
    <span>{index + 1}</span>
  );

/** Compact horizontal stepper of the job's life cycle */
const Stepper = ({ job }: { job: SimJob }) => (
  <ol className={styles.stepper} aria-label="Simulation progress">
    {stepsOf(job).map((step, i) => (
      <li
        key={step.key}
        className={clsx(styles.stepper__item, styles[`stepper__item--${step.state}`])}
        aria-current={step.state === 'current' ? 'step' : undefined}
        title={[step.time ? fmtTime(step.time, 'dd MMM yyyy HH:mm') : null, step.by]
          .filter(Boolean)
          .join(' · ')}
      >
        <i>
          <StepIcon state={step.state} index={i} />
        </i>
        <span className={styles.stepper__text}>
          <strong>{step.label}</strong>
          {step.time ? <time dateTime={step.time}>{fmtTime(step.time)}</time> : null}
        </span>
      </li>
    ))}
  </ol>
);

type TabKey = 'results' | 'trends' | 'events' | 'scenario';

/** One job: life cycle, decisions, and its results, trends, events and scenario in tabs */
export const JobDetail = ({
  jobId,
  onDomain,
}: {
  jobId: number;
  /** told the workspace of the loaded job (a deep link may open another workspace's job) */
  onDomain?: (domain: SimDomain) => void;
}) => {
  const navigate = useNavigate();
  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: SIM_QUERY.job(jobId),
    queryFn: () => getJob(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && SIM_ACTIVE_STATUSES.includes(status)) return ACTIVE_MS;
      return status === 'PROPOSED' ? PROPOSED_MS : false;
    },
    refetchOnWindowFocus: false,
    meta: { toastId: 'simulationJob' },
  });
  const [replayVariant, setReplayVariant] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey | null>(null);
  const kind = job?.kind;
  useEffect(() => {
    if (kind) onDomain?.(domainOf(kind));
  }, [kind, onDomain]);

  if (isLoading || isError || !job) {
    return (
      <Container title={`Simulation #${jobId}`} background="none" className={styles.main}>
        <Loading isLoading={isLoading} />
        {isError ? (
          <Empty error>
            Simulation #{jobId} could not be loaded: {errorText(error)}
          </Empty>
        ) : null}
      </Container>
    );
  }

  const production = job.kind === 'production';
  const domain = domainOf(job.kind);
  const replayable = SIM_REPLAYABLE_STATUSES.includes(job.status) && !production;
  const variant =
    replayVariant && job.variants.includes(replayVariant)
      ? replayVariant
      : (job.variants[0] ?? null);
  const hasResults = production
    ? job.status === 'SUCCEEDED'
    : Object.keys(job.summary.variants).length > 0;
  const tabs: { key: TabKey; label: string }[] = [
    ...(hasResults || replayable ? [{ key: 'results' as const, label: 'Results' }] : []),
    ...(replayable && job.kind === 'scenario' ? [{ key: 'trends' as const, label: 'Trends' }] : []),
    ...(HAS_EVENTS.includes(job.status) && !production
      ? [{ key: 'events' as const, label: 'Events' }]
      : []),
    { key: 'scenario', label: production ? 'Plan' : 'Scenario' },
  ];
  const current = tabs.find((t) => t.key === tab)?.key ?? tabs[0].key;

  return (
    <Container
      title={`#${job.id} ${job.title}`}
      icon={DOMAINS[domain].icon}
      background="none"
      className={styles.main}
      titleProps={{ style: { minWidth: 0, flex: '1 1 auto' } }}
      titleSuffixIcon={
        job.rationale ? <InfoTooltip title="Rationale" content={job.rationale} /> : undefined
      }
      rightTopComponent={<StatusBadge status={job.status} progress={job.progress} />}
      contentWrapperProps={{ style: { overflow: 'hidden', gap: 16 } }}
    >
      <div className={styles.detail__head}>
        <Stepper job={job} />
        <div className={styles.detail__meta}>
          <DomainBanner domain={domain}>
            {job.kind === 'doe' ? 'Design of experiments' : null}
          </DomainBanner>
          <OriginBadge origin={job.origin} />
          {job.simStart ? (
            <span>
              Simulated {fmtTime(job.simStart, 'dd MMM yyyy HH:mm')} –{' '}
              {fmtTime(job.simEnd, production ? 'dd MMM yyyy HH:mm' : 'HH:mm')}
            </span>
          ) : null}
          {job.requestedByName ? <span>Requested by {job.requestedByName}</span> : null}
          {job.status === 'RUNNING' ? <Progress value={job.progress} /> : null}
          {/* below the header, so the title keeps the header's whole width */}
          <div className={styles.detail__actions}>
            {replayable && job.variants.length > 1 ? (
              <Dropdown
                options={job.variants.map((v) => ({ value: v, label: v }))}
                value={variant ?? ''}
                onChange={setReplayVariant}
                background="dark"
                wrapperClassName={styles['detail__variant']}
              />
            ) : null}
            {replayable ? (
              <Button
                type="button"
                color="default-secondary"
                icon={<Cube width={20} height={20} />}
                title="Replay in digital twin"
                onClick={() => navigate(replayLink(job.id, variant))}
              >
                Replay
              </Button>
            ) : null}
          </div>
        </div>
        {job.decisionNote && (job.status === 'REJECTED' || job.status === 'CANCELLED') ? (
          <p className={styles.detail__note} title={job.decisionNote}>
            <strong>{job.status === 'REJECTED' ? 'Rejected:' : 'Cancelled:'}</strong>{' '}
            {job.decisionNote}
          </p>
        ) : null}
        {job.error ? (
          <p className={styles['detail__note--error']} role="alert" title={job.error}>
            {job.error}
          </p>
        ) : null}
        <JobDecision key={job.id} job={job} />
      </div>

      <TabProvider
        value={current}
        onChange={(v) => setTab(v as TabKey)}
        type="1"
        className={styles.tabs}
      >
        <TabList>
          {tabs.map((t) => (
            <Tab key={t.key} value={t.key} label={t.label} className={styles.tabs__tab} />
          ))}
        </TabList>
        <TabPanel value="results" className={styles.tabs__panel}>
          {production ? (
            <ProductionResults job={job} />
          ) : hasResults ? (
            <JobResults job={job} />
          ) : (
            <Empty>Results appear once the analysis finishes</Empty>
          )}
        </TabPanel>
        <TabPanel value="trends" className={styles.tabs__panel}>
          <VariantCharts jobId={job.id} variants={job.variants} />
        </TabPanel>
        <TabPanel value="events" className={clsx(styles.tabs__panel, styles['tabs__panel--fill'])}>
          <EventLog key={job.id} job={job} />
        </TabPanel>
        <TabPanel value="scenario" className={styles.tabs__panel}>
          <JobScenario job={job} />
        </TabPanel>
      </TabProvider>
    </Container>
  );
};
