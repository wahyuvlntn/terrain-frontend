import {
  AuthCtx,
  Button,
  Container,
  Dropdown,
  InfoTooltip,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '@digital-twin/components';
import { Plus } from '@digital-twin/icons';
import {
  TabListProduct as TabList,
  TabProduct as Tab,
  TabProvider,
} from '@digital-twin/reusables';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { setAssistantContext } from '../ai-assistant/assistant-context';
import { SimJobOrigin, SimJobOriginEnum } from './api/simulation.api';
import { JobDetail, JobList, ProductionPlanForm, ScenarioForm } from './components';
import { Empty, ORIGIN_LABEL } from './components/job-bits';
import { DOMAIN_PARAM, DOMAINS, SimDomain } from './simulation.domain';
import { jobFilterFromUrl, STATUS_FILTERS } from './simulation.links';
import styles from './simulation.module.scss';

const JOB_PARAM = 'job';
const NEW_PARAM = 'new';

/**
 * Simulation page, two workspaces (`?domain=chiller|fab`): what-if scenarios on a copy of the
 * chiller plant model and production plans on a copy of the fab model. Each has its own color,
 * job list and "New …" action. A job's details (`?job=<id>`, deep-linkable) or a new scenario /
 * plan form (`?new=1|production`) on the right.
 */
export const SimulationJobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobParam = searchParams.get(JOB_PARAM);
  const jobId = jobParam && /^\d+$/.test(jobParam) ? Number(jobParam) : null;
  const creating = searchParams.get(NEW_PARAM) === '1';
  const planning = searchParams.get(NEW_PARAM) === 'production';
  const { hasPermission } = useContext(AuthCtx);
  const canCreate = hasPermission(
    PermissionGroupAliasEnum.enum.simulation,
    PermissionAliasEnum.enum.create
  );

  const [initial] = useState(() => jobFilterFromUrl(searchParams));
  const [statusKey, setStatusKey] = useState(initial.statusKey);
  const [origin, setOrigin] = useState(initial.origin);
  // the list's filters live in the URL (assistant links, reload); defaults are left out, and a move
  // that drops them writes them back
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const put = (key: string, value: string, fallback: string) =>
      value && value !== fallback ? next.set(key, value) : next.delete(key);
    put('status', statusKey, 'all');
    put('origin', origin, '');
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, statusKey, origin]);
  const domain: SimDomain = searchParams.get(DOMAIN_PARAM) === 'fab' ? 'fab' : 'chiller';
  /** keepJob: a deep-linked job only moves the workspace to its own */
  const setDomain = useCallback(
    (value: SimDomain, keepJob = false) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(DOMAIN_PARAM, value);
          if (!keepJob) {
            next.delete(JOB_PARAM);
            next.delete(NEW_PARAM);
          }
          return next;
        },
        { replace: keepJob }
      ),
    [setSearchParams]
  );
  const noCreate = 'Needs the Simulation › Create permission';

  const show = useCallback(
    (params: { job?: number; creating?: boolean; planning?: boolean; replace?: boolean }) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(JOB_PARAM);
          next.delete(NEW_PARAM);
          if (params.job !== undefined) next.set(JOB_PARAM, String(params.job));
          if (params.creating) next.set(NEW_PARAM, '1');
          if (params.planning) next.set(NEW_PARAM, 'production');
          return next;
        },
        { replace: params.replace }
      ),
    [setSearchParams]
  );

  // tell the AI assistant which job the user is looking at
  useEffect(() => {
    setAssistantContext({
      page: 'simulation',
      nodeId: undefined,
      assetAlias: undefined,
      replayJobId: jobId ?? undefined,
    });
  }, [jobId]);
  useEffect(
    () => () =>
      setAssistantContext({
        page: undefined,
        nodeId: undefined,
        assetAlias: undefined,
        replayJobId: undefined,
      }),
    []
  );

  return (
    <div className={styles.page} data-domain={domain}>
      <div className={styles.ribbon}>
        <div className={styles.ribbon__left}>
          <TabProvider
            value={domain}
            onChange={(v) => setDomain(v as SimDomain)}
            className={styles.domains}
          >
            <TabList className={styles.domains__list}>
              {(Object.keys(DOMAINS) as SimDomain[]).map((d) => (
                <Tab
                  key={d}
                  value={d}
                  label={DOMAINS[d].label}
                  icon={DOMAINS[d].icon}
                  className={styles[`domains__tab--${d}`]}
                />
              ))}
            </TabList>
          </TabProvider>
          <InfoTooltip
            title={DOMAINS[domain].title}
            content={
              domain === 'chiller'
                ? 'What-if scenarios on a copy of the CUB chiller plant model: set points, faults, weather and load. The live plant is never touched.'
                : 'Production plans on a copy of the FAB1 production model: lot starts, tool downs and added tools. The live fab is never touched.'
            }
          />
          <Dropdown
            label="Status"
            labelPosition="left"
            labelWidth={56}
            options={STATUS_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
            value={statusKey}
            onChange={setStatusKey}
            wrapperClassName={styles.filter}
          />
          <Dropdown
            label="Origin"
            labelPosition="left"
            labelWidth={56}
            options={[
              { value: '', label: 'All origins' },
              ...SimJobOriginEnum.options.map((o) => ({ value: o, label: ORIGIN_LABEL[o] })),
            ]}
            value={origin}
            onChange={(v) => setOrigin(v as SimJobOrigin | '')}
            wrapperClassName={styles.filter}
          />
        </div>
        <div className={styles.ribbon__right}>
          {domain === 'chiller' ? (
            <Button
              icon={<Plus width={20} height={20} />}
              disabled={!canCreate || creating}
              title={canCreate ? 'Run a what-if on a copy of the chiller plant' : noCreate}
              className={styles.launch}
              onClick={() => show({ creating: true })}
            >
              New scenario
            </Button>
          ) : (
            <Button
              icon={<Plus width={20} height={20} />}
              disabled={!canCreate || planning}
              title={canCreate ? 'Plan production on a copy of the fab' : noCreate}
              className={styles.launch}
              onClick={() => show({ planning: true })}
            >
              New production plan
            </Button>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <JobList
          // a new filter starts at the first page
          key={`${statusKey}|${origin}|${domain}`}
          statusKey={statusKey}
          origin={origin}
          domain={domain}
          selectedId={creating || planning ? null : jobId}
          onSelect={(id) => show({ job: id })}
          // nothing open yet: show the newest job rather than an empty panel
          onLoaded={(newest) =>
            jobId === null && !creating && !planning && show({ job: newest, replace: true })
          }
        />
        {planning ? (
          <ProductionPlanForm
            onCreated={(id) => show({ job: id })}
            onCancel={() => show({ job: jobId ?? undefined })}
          />
        ) : creating ? (
          <ScenarioForm
            onCreated={(id) => show({ job: id })}
            onCancel={() => show({ job: jobId ?? undefined })}
          />
        ) : jobId !== null ? (
          <JobDetail
            key={jobId}
            jobId={jobId}
            onDomain={(d) => d !== domain && setDomain(d, true)}
          />
        ) : (
          <Container
            title={DOMAINS[domain].title}
            icon={DOMAINS[domain].icon}
            background="none"
            className={styles.main}
          >
            <Empty>
              {domain === 'chiller'
                ? 'Select a scenario, or run a new one on a copy of the chiller plant.'
                : 'Select a production plan, or plan production on a copy of the fab.'}
            </Empty>
          </Container>
        )}
      </div>
    </div>
  );
};
