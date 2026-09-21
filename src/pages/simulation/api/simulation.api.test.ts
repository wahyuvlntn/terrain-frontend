import { jsRequest } from '@digital-twin/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  approveJob,
  getEvents,
  getFaultCatalog,
  getFrames,
  getJob,
  getTrend,
  listJobs,
  rejectJob,
  submitJob,
} from './simulation.api';

// the shared barrels load a UI library whose CSS vitest can't import: a typed double of the
// status / condition enums, and the request function only
vi.mock(
  '@digital-twin/components',
  () => import('../../digital-twin/testing/digital-twin-components.mock')
);
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

const request = vi.mocked(jsRequest);

/** A JobRow as the backend writes it (DESIGN.md §4.2) */
const ROW = {
  id: 12,
  kind: 'scenario',
  title: 'Raise CHWST',
  origin: 'agent',
  status: 'PROPOSED',
  progress: 0,
  rationale: 'The optimizer suggests 7.5 °C',
  requested_by: 3,
  requested_by_name: 'Jason Teo',
  approved_by_name: null,
  approved_at: null,
  created_at: '2026-10-10T08:00:00Z',
  started_at: null,
  finished_at: null,
  sim_start: null,
  sim_end: null,
  step_s: 60,
  recommendation_id: null,
  error: null,
  variants: ['baseline', 'recommended'],
};

beforeEach(() => {
  request.mockReset();
});

describe('jobs', () => {
  it('lists jobs with CSV statuses and camelCase rows', async () => {
    request.mockResolvedValueOnce({ total: 1, jobs: [{ ...ROW, progress: 1.7 }] });
    const page = await listJobs({ status: ['QUEUED', 'RUNNING'], limit: 20, offset: 40 });
    expect(request).toHaveBeenCalledWith({
      url: '/simulation/listjobs',
      data: { status: 'QUEUED,RUNNING', origin: undefined, limit: 20, offset: 40 },
    });
    expect(page.total).toBe(1);
    expect(page.jobs[0]).toMatchObject({
      id: 12,
      requestedByName: 'Jason Teo',
      createdAt: '2026-10-10T08:00:00Z',
      stepS: 60,
      // a fraction, clamped
      progress: 1,
    });
  });

  it('reads a job with its spec and per-variant summary', async () => {
    request.mockResolvedValueOnce({
      ...ROW,
      status: 'SUCCEEDED',
      spec: JSON.stringify({ duration_min: 120, actions: [], variants: [{ name: 'baseline' }] }),
      summary: {
        success: true,
        reason: null,
        comparison: { recommended: { energy_saving_pct: 2.4 } },
        variants: {
          baseline: {
            energy_kwh: 2400,
            avg_kw_per_rt: 0.61,
            alarm_counts: { warning: 1, critical: 0 },
            anomalies: [{}, {}],
            faults_detected: [
              { rule: 'CT-013', asset: 'CT_02', started_at: '2026-10-10T09:00:00Z' },
            ],
          },
          broken: { energy_kwh: 'lots' },
          warm: {
            energy_kwh: 2300,
            constraint_violations: [
              {
                constraint: 'chws_temp',
                label: 'CHW supply above 8.5 °C',
                minutes: 14,
                longest_min: 12,
                worst: 8.71,
                critical: true,
                first_at: '2026-10-10T10:00:00Z',
              },
            ],
          },
        },
      },
      decision_note: '  ',
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const job = await getJob(12);
    expect(request).toHaveBeenCalledWith({ url: '/simulation/getjob', data: { job_id: 12 } });
    expect(job.spec?.duration_min).toBe(120);
    expect(job.summary.success).toBe(true);
    expect(job.summary.comparison).toEqual({ recommended: { energy_saving_pct: 2.4 } });
    expect(job.summary.variants.baseline).toMatchObject({
      energyKwh: 2400,
      avgKwPerRt: 0.61,
      avgPlantKw: null,
      alarmCounts: { warning: 1, critical: 0 },
      anomalies: 2,
      faultsDetected: [{ rule: 'CT-013', asset: 'CT_02', startedAt: '2026-10-10T09:00:00Z' }],
      constraintViolations: [],
    });
    expect(job.summary.variants.warm.constraintViolations).toEqual([
      expect.objectContaining({
        label: 'CHW supply above 8.5 °C',
        minutes: 14,
        longestMin: 12,
        critical: true,
        firstAt: '2026-10-10T10:00:00Z',
        assets: [],
      }),
    ]);
    // a blank note is no note
    expect(job.decisionNote).toBeNull();
    // an unreadable variant is left out (and reported) rather than failing the job
    expect(job.summary.variants).not.toHaveProperty('broken');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('submits the spec as a JSON string', async () => {
    request.mockResolvedValueOnce({ ...ROW, origin: 'ui', status: 'QUEUED' });
    const spec = {
      start: null,
      duration_min: 60,
      initial: 'live' as const,
      stochastic: false,
      seed: 0,
      weather: { dry_bulb_offset: 0, wet_bulb_offset: 0 },
      load_scale: 1,
      actions: [],
      variants: [{ name: 'baseline', actions: [] }],
    };
    const job = await submitJob({ title: 'T', spec, rationale: '' });
    expect(request).toHaveBeenCalledWith({
      url: '/simulation/submit',
      data: { title: 'T', spec: JSON.stringify(spec), rationale: undefined },
    });
    expect(job.status).toBe('QUEUED');
  });

  it('approves and rejects by job id', async () => {
    request.mockResolvedValue({ ...ROW, status: 'QUEUED' });
    await approveJob(12);
    expect(request).toHaveBeenLastCalledWith({ url: '/simulation/approve', data: { job_id: 12 } });
    await rejectJob(12, '  not now ');
    expect(request).toHaveBeenLastCalledWith({
      url: '/simulation/reject',
      data: { job_id: 12, reason: 'not now' },
    });
  });
});

describe('results', () => {
  const EVENT = {
    id: 5,
    variant: 'baseline',
    ts: '2026-10-10T09:01:00Z',
    end_ts: null,
    asset_alias: 'CH_01',
    kind: 'alarm',
    code: 'CHL-008',
    severity: 'WARNING',
    message: 'CHWST off set point',
    value: 7.9,
    details: {},
  };

  it('pages events with kind and asset filters', async () => {
    request.mockResolvedValueOnce({ total: 1, events: [EVENT] });
    const page = await getEvents({
      jobId: 12,
      kinds: ['alarm', 'trip'],
      asset: 'CH_01',
      limit: 50,
    });
    expect(request).toHaveBeenCalledWith({
      url: '/simulation/getevents',
      data: {
        job_id: 12,
        variant: undefined,
        kinds: 'alarm,trip',
        asset: 'CH_01',
        limit: 50,
        offset: 0,
      },
    });
    expect(page.events[0]).toMatchObject({ assetAlias: 'CH_01', endTs: null, kind: 'alarm' });
  });

  it('reads frames', async () => {
    request.mockResolvedValueOnce({
      job_id: 12,
      variant: 'baseline',
      t0: '2026-10-10T09:00:00Z',
      step_s: 60,
      steps: 2,
      assets: [{ alias: 'CH_01', id: 1, name: 'CH-01', type_name: 'Chiller', model_name: 'WSC' }],
      series: { CH_01: { chwst: [6.5, null] } },
      states: [
        {
          alias: 'CH_01',
          kind: 'status',
          value: 'RUNNING',
          start: '2026-10-10T09:00:00Z',
          end: null,
        },
      ],
      events: [EVENT],
    });
    const frames = await getFrames({ jobId: 12, aliases: ['CH_01', 'CT_01'] });
    expect(request).toHaveBeenCalledWith({
      url: '/simulation/getframes',
      data: { job_id: 12, variant: undefined, aliases: 'CH_01,CT_01' },
    });
    expect(frames).toMatchObject({ jobId: 12, stepS: 60, assets: [{ typeName: 'Chiller' }] });
    expect(frames.series.CH_01.chwst).toEqual([6.5, null]);
  });

  it('reads frames of a run that recorded nothing, leaving unknown equipment out', async () => {
    request.mockResolvedValueOnce({
      job_id: 12,
      variant: 'baseline',
      t0: null,
      step_s: 60,
      steps: 0,
      assets: [
        { alias: 'CH_01', id: 1, name: 'CH-01', type_name: 'Chiller', model_name: 'WSC' },
        { alias: 'OLD_01', id: null, name: 'OLD_01', type_name: null, model_name: null },
      ],
      series: {},
      states: [],
      events: [],
    });
    const frames = await getFrames({ jobId: 12 });
    expect(frames.t0).toBeNull();
    expect(frames.assets.map((a) => a.alias)).toEqual(['CH_01']);
  });

  it('rejects frames whose series are not numbers', async () => {
    request.mockResolvedValueOnce({
      job_id: 12,
      variant: 'baseline',
      t0: '2026-10-10T09:00:00Z',
      step_s: 60,
      steps: 1,
      assets: [],
      series: { CH_01: { chwst: ['6.5'] } },
      states: [],
      events: [],
    });
    await expect(getFrames({ jobId: 12 })).rejects.toThrow();
  });

  it('reads a simulated trend in the live trend shape', async () => {
    request.mockResolvedValueOnce({
      name: 'CHW Supply Temp',
      unit: '°C',
      minutes: 60,
      data: [{ timestamp: '2026-10-10T09:00:00Z', value: 6.5, running: true }],
      warning: { lower: null, upper: 7.5 },
      critical: { lower: null, upper: 8 },
      spc: {
        center_line: 6.5,
        sigma: 0.1,
        ucl: 6.8,
        lcl: 6.2,
        usl: null,
        lsl: null,
        computed: true,
      },
      stats: {
        count: 1,
        mean: 6.5,
        std_dev: 0,
        min: 6.5,
        max: 6.5,
        cp: null,
        cpk: null,
        excluded: 0,
      },
      violations: [],
    });
    const trend = await getTrend({
      jobId: 12,
      variant: 'baseline',
      assetAlias: 'CH_01',
      paramAlias: 'chwst',
      at: '2026-10-10T10:00:00Z',
    });
    expect(request).toHaveBeenCalledWith({
      url: '/simulation/gettrend',
      data: {
        job_id: 12,
        variant: 'baseline',
        asset_alias: 'CH_01',
        param_alias: 'chwst',
        at: '2026-10-10T10:00:00Z',
        minutes: 60,
      },
    });
    expect(trend).toMatchObject({ id: 0, spc: { centerLine: 6.5 }, stats: { stdDev: 0 } });
  });

  it('reads the fault catalog', async () => {
    request.mockResolvedValueOnce([
      {
        kind: 'ct_fouling',
        asset_kind: 'ct',
        assets: ['CT_01'],
        intensities: [0.95, 0.8, 0.65],
        unit: null,
        label: 'Cooling tower fouling',
        code: 'CT-014',
      },
    ]);
    expect(await getFaultCatalog()).toEqual([
      {
        kind: 'ct_fouling',
        assetKind: 'ct',
        assets: ['CT_01'],
        intensities: [0.95, 0.8, 0.65],
        unit: '',
        label: 'Cooling tower fouling',
        code: 'CT-014',
      },
    ]);
  });
});
