import { keepPreviousData, Query, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { MemoryRouter, NavigateFunction, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SIM_QUERY, SimFrames, SimJobDetail } from '../simulation/api/simulation.api';
import type { TwinAsset, TwinParameter } from './api/digital-twin.api';
import { LIVE_MS, TWIN_QUERY, useTwinAssets, useTwinParameters } from './digital-twin.queries';
import { JOB_POLL_MS, ReplayProvider, useTwinNow, useTwinSource } from './digital-twin.source';

// the shared barrels load a UI library whose CSS vitest can't import: a typed double of the
// status / condition enums, and the request function only
vi.mock('@digital-twin/components', () => import('./testing/digital-twin-components.mock'));
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

const twin = vi.hoisted(() => ({
  getTwinAssets: vi.fn(),
  getTwinAssetParameters: vi.fn(),
}));
vi.mock('./api/digital-twin.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/digital-twin.api')>()),
  ...twin,
}));

const sim = vi.hoisted(() => ({ getJob: vi.fn(), getFrames: vi.fn(), getTrend: vi.fn() }));
vi.mock('../simulation/api/simulation.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../simulation/api/simulation.api')>()),
  ...sim,
}));

const T0 = Date.parse('2026-10-11T06:00:00Z');
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();

const LIVE_ASSET: TwinAsset = {
  id: 1,
  alias: 'CH_01',
  name: 'Chiller CH-01',
  typeName: 'Chiller',
  modelName: 'WSC-126',
  locationId: 10,
  status: 'RUNNING',
  statusStartTime: at(-600),
  condition: 'NORMAL',
  conditionStartTime: at(-600),
};

const PARAM: TwinParameter = {
  id: 100,
  alias: 'chwst',
  name: 'CHW Supply Temp',
  unit: '°C',
  dataType: 'number',
  scale: 1,
  value: 6.5,
  timestamp: at(-1),
  condition: 'NORMAL',
  warning: { lower: null, upper: 7.5 },
  critical: { lower: null, upper: 8 },
  spc: { ucl: null, lcl: null, centerLine: null, sigma: null, usl: null, lsl: null },
  control: null,
};

const JOB = {
  id: 7,
  kind: 'scenario',
  title: 'Warmer CHW',
  origin: 'ui',
  status: 'SUCCEEDED',
  progress: 1,
  rationale: null,
  requestedBy: 1,
  requestedByName: 'Sarah Lim',
  approvedByName: null,
  approvedAt: null,
  createdAt: at(-60),
  startedAt: at(-59),
  finishedAt: at(-58),
  simStart: at(0),
  simEnd: at(3),
  stepS: 60,
  recommendationId: null,
  error: null,
  variants: ['baseline', 'warmer'],
  spec: null,
  summary: { variants: {}, success: true, reason: null, comparison: null },
  decisionNote: null,
  rawSummary: null,
  rawSpec: null,
} satisfies SimJobDetail;

const FRAMES: SimFrames = {
  jobId: 7,
  variant: 'baseline',
  t0: at(0),
  stepS: 60,
  steps: 3,
  assets: [
    { alias: 'CH_01', id: 1, name: 'Chiller CH-01', typeName: 'Chiller', modelName: 'WSC-126' },
  ],
  series: { CH_01: { chwst: [6.5, 7.2, 8.4] } },
  states: [
    { alias: 'CH_01', kind: 'status', value: 'RUNNING', start: at(0), end: at(2) },
    { alias: 'CH_01', kind: 'status', value: 'UNPLANNED DOWN', start: at(2), end: null },
  ],
  events: [],
};

let client: QueryClient;
let location = '';
let navigate: NavigateFunction = () => undefined;

const LocationProbe = () => {
  const l = useLocation();
  location = `${l.pathname}${l.search}`;
  navigate = useNavigate();
  return null;
};

const wrapper =
  (url: string) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <LocationProbe />
        <ReplayProvider>{children}</ReplayProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

/** what a twin view reads: the source, the assets, one parameter list and the clock */
const useTwinView = () => ({
  source: useTwinSource(),
  assets: useTwinAssets(),
  params: useTwinParameters(1),
  now: useTwinNow(1000),
});

const observerOptions = (key: readonly unknown[]) =>
  client.getQueryCache().find({ queryKey: key, exact: true })?.observers[0]?.options;

/** the poll interval a query runs at now (its observers' option, or its value for the query) */
const pollOf = (q: Query) =>
  q.observers
    .map((o) => {
      const i = o.options.refetchInterval;
      return typeof i === 'function' ? (i as (query: Query) => number | false | undefined)(q) : i;
    })
    .find(Boolean) ?? false;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  twin.getTwinAssets.mockResolvedValue([LIVE_ASSET]);
  twin.getTwinAssetParameters.mockResolvedValue([PARAM]);
  sim.getJob.mockResolvedValue(JOB);
  sim.getFrames.mockResolvedValue(FRAMES);
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.clearAllMocks();
});

describe('twin data source', () => {
  it('is the live plant without a replay link: the same polling queries as before', async () => {
    const { result } = renderHook(useTwinView, { wrapper: wrapper('/digital-twin?node=x') });
    await waitFor(() => expect(result.current.assets).toEqual([LIVE_ASSET]));
    await waitFor(() => expect(result.current.params.data).toEqual([PARAM]));

    expect(result.current.source).toMatchObject({ mode: 'live', key: 'live', replay: null });
    // keys end with the source key, so prefix invalidations (control writes) still reach them
    expect(observerOptions([...TWIN_QUERY.assets, 'live'])?.refetchInterval).toBe(LIVE_MS.assets);
    expect(observerOptions([...TWIN_QUERY.parameters(1), 'live'])?.refetchInterval).toBe(
      LIVE_MS.parameters
    );
    // the wall clock drives the elapsed timers
    expect(Math.abs(result.current.now - Date.now())).toBeLessThan(5_000);
    expect(sim.getJob).not.toHaveBeenCalled();
    expect(sim.getFrames).not.toHaveBeenCalled();
  });

  it('replays a job at the playhead, without polling the plant, until the replay is left', async () => {
    const { result } = renderHook(useTwinView, {
      wrapper: wrapper('/digital-twin?node=x&replay=7'),
    });
    await waitFor(() => expect(result.current.assets?.[0]?.status).toBe('RUNNING'));
    const replay = result.current.source.replay;
    expect(replay).toMatchObject({ jobId: 7, variant: 'baseline', playing: false, step: 0 });
    expect(sim.getFrames).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 7, variant: 'baseline' })
    );
    expect(twin.getTwinAssets).not.toHaveBeenCalled();
    // the live parameter list is the metadata template of the replayed values
    await waitFor(() => expect(result.current.params.data?.[0]).toMatchObject({ value: 6.5 }));
    expect(result.current.now).toBe(T0);

    // seeking moves every view to the sample at (or before) the playhead
    act(() => result.current.source.replay?.seek(T0 + 90_500));
    expect(result.current.source.replay?.step).toBe(1);
    expect(result.current.now).toBe(T0 + 90_000);
    // the playhead stays inside the run: the last sample at most
    act(() => result.current.source.replay?.seek(T0 + 10 * 60_000));
    expect(result.current.source.replay?.step).toBe(2);
    expect(result.current.assets?.[0]).toMatchObject({
      status: 'UNPLANNED DOWN',
      statusStartTime: at(2),
    });
    expect(result.current.params.data?.[0]).toMatchObject({ value: 8.4, condition: 'CRITICAL' });
    expect(result.current.now).toBe(T0 + 120_000);

    // the replayed queries never poll (nor does a finished job)
    const polling = client
      .getQueryCache()
      .getAll()
      .filter((q) => pollOf(q));
    expect(polling.map((q) => q.queryKey)).toEqual([]);

    // leaving the replay keeps the selection and returns to the live plant
    act(() => result.current.source.replay?.exit());
    expect(location).toBe('/digital-twin?node=x');
    expect(result.current.source.mode).toBe('live');
    await waitFor(() => expect(result.current.assets).toEqual([LIVE_ASSET]));
  });

  it('starts a deep link at its time and switches variant in the URL', async () => {
    const { result } = renderHook(useTwinView, {
      wrapper: wrapper(`/digital-twin?replay=7&t=${encodeURIComponent(at(1))}`),
    });
    await waitFor(() => expect(result.current.source.replay?.index).toBeDefined());
    expect(result.current.source.replay?.step).toBe(1);

    act(() => result.current.source.replay?.setVariant('warmer'));
    expect(location).toContain('variant=warmer');
    await waitFor(() =>
      expect(sim.getFrames).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 7, variant: 'warmer' })
      )
    );
  });

  it('follows a job that is still running and reads its frames again once recorded', async () => {
    sim.getJob.mockResolvedValue({ ...JOB, status: 'RUNNING' });
    const { result } = renderHook(useTwinView, { wrapper: wrapper('/digital-twin?replay=7') });
    await waitFor(() => expect(result.current.source.replay?.job?.status).toBe('RUNNING'));
    await waitFor(() => expect(sim.getFrames).toHaveBeenCalledTimes(1));
    const jobQuery = () =>
      client.getQueryCache().find({ queryKey: SIM_QUERY.job(7), exact: true }) as Query;
    expect(pollOf(jobQuery())).toBe(JOB_POLL_MS);

    sim.getJob.mockResolvedValue(JOB);
    await act(() => client.refetchQueries({ queryKey: SIM_QUERY.job(7) }));
    await waitFor(() => expect(result.current.source.replay?.job?.status).toBe('SUCCEEDED'));
    expect(pollOf(jobQuery())).toBe(false);
    await waitFor(() => expect(sim.getFrames).toHaveBeenCalledTimes(2));
  });

  it('reads a deep-linked variant of a running job again once the run is recorded', async () => {
    sim.getJob.mockResolvedValue({ ...JOB, status: 'RUNNING' });
    const { result } = renderHook(useTwinView, {
      wrapper: wrapper('/digital-twin?replay=7&variant=warmer'),
    });
    await waitFor(() => expect(result.current.source.replay?.index).toBeDefined());
    // read once, with the running status: never before the job's status is known (those frames
    // would be cached as the recorded ones and kept after the run finishes)
    expect(sim.getFrames).toHaveBeenCalledTimes(1);

    sim.getJob.mockResolvedValue(JOB);
    await act(() => client.refetchQueries({ queryKey: SIM_QUERY.job(7) }));
    await waitFor(() => expect(result.current.source.replay?.job?.status).toBe('SUCCEEDED'));
    await waitFor(() => expect(sim.getFrames).toHaveBeenCalledTimes(2));
    expect(sim.getFrames).toHaveBeenLastCalledWith(
      expect.objectContaining({ jobId: 7, variant: 'warmer' })
    );
  });

  it('never shows the previous job while another one loads', async () => {
    // the app keeps previous data by default
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, placeholderData: keepPreviousData } },
    });
    const { result } = renderHook(useTwinView, { wrapper: wrapper('/digital-twin?replay=7') });
    await waitFor(() => expect(result.current.source.replay?.index).toBeDefined());

    sim.getJob.mockImplementation(() => new Promise(() => undefined));
    act(() => navigate('/digital-twin?replay=8'));
    expect(result.current.source.replay).toMatchObject({
      jobId: 8,
      job: undefined,
      index: undefined,
      isLoading: true,
    });
  });

  it('explains a replay link that cannot be shown', async () => {
    const { result } = renderHook(useTwinView, { wrapper: wrapper('/digital-twin?replay=abc') });
    expect(result.current.source.replay?.error).toBe('This replay link is not valid');
    expect(sim.getJob).not.toHaveBeenCalled();

    sim.getFrames.mockResolvedValueOnce({ ...FRAMES, t0: null, steps: 0, series: {} });
    const empty = renderHook(useTwinView, { wrapper: wrapper('/digital-twin?replay=7') });
    await waitFor(() =>
      expect(empty.result.current.source.replay?.error).toBe(
        'Simulation #7 has no recorded frames (succeeded)'
      )
    );
  });
});
