import {
  AuthCtx,
  Button,
  Container,
  Dropdown,
  InfoTooltip,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '@digital-twin/components';
import { Plus, Test } from '@digital-twin/icons';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { setAssistantContext } from '../ai-assistant/assistant-context';
import { SimJobOrigin, SimJobOriginEnum } from './api/simulation.api';
import { JobDetail, JobList, ProductionPlanForm, ScenarioForm, STATUS_FILTERS } from './components';
import { Empty, ORIGIN_LABEL } from './components/job-bits';
import styles from './simulation.module.scss';

const JOB_PARAM = 'job';
const NEW_PARAM = 'new';

/**
 * Simulation page: what-if scenarios run on copies of the digital twin's plant model. Jobs list
 * on the left; a job's details (`?job=<id>`, deep-linkable) or the new scenario form (`?new=1`)
 * on the right.
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

  const [statusKey, setStatusKey] = useState('all');
  const [origin, setOrigin] = useState<SimJobOrigin | ''>('');

  const show = useCallback(
    (params: { job?: number; creating?: boolean; planning?: boolean }) =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete(JOB_PARAM);
        next.delete(NEW_PARAM);
        if (params.job !== undefined) next.set(JOB_PARAM, String(params.job));
        if (params.creating) next.set(NEW_PARAM, '1');
        if (params.planning) next.set(NEW_PARAM, 'production');
        return next;
      }),
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
    <div className={styles.page}>
      <div className={styles.ribbon}>
        <div className={styles.ribbon__left}>
          <InfoTooltip
            title="Simulation"
            content="What-if scenarios on a copy of the CUB chiller plant model, and production plans on a copy of the FAB1 production model. The live plant and fab are never touched."
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
          <Button
            icon={<Plus width={20} height={20} />}
            color="default-secondary"
            disabled={!canCreate || planning}
            title={
              canCreate
                ? 'Plan production on a copy of the fab'
                : 'Needs the Simulation › Create permission'
            }
            onClick={() => show({ planning: true })}
          >
            New production plan
          </Button>
          <Button
            icon={<Plus width={20} height={20} />}
            disabled={!canCreate || creating}
            title={canCreate ? undefined : 'Needs the Simulation › Create permission'}
            onClick={() => show({ creating: true })}
          >
            New scenario
          </Button>
        </div>
      </div>

      <div className={styles.body}>
        <JobList
          // a new filter starts at the first page
          key={`${statusKey}|${origin}`}
          statusKey={statusKey}
          origin={origin}
          selectedId={creating || planning ? null : jobId}
          onSelect={(id) => show({ job: id })}
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
          <JobDetail key={jobId} jobId={jobId} />
        ) : (
          <Container
            title="Simulation"
            icon={<Test width={24} height={24} />}
            background="none"
            className={styles.main}
          >
            <Empty>Select a simulation, or start a new scenario.</Empty>
          </Container>
        )}
      </div>
    </div>
  );
};
