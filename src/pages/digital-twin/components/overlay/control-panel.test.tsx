import '@testing-library/jest-dom/vitest';

import { AuthCtx } from '@digital-twin/components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ContextType } from 'react';
import { MemoryRouter, NavigateFunction, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SimFrames, SimJobDetail } from '../../../simulation/api/simulation.api';
import type { TwinAsset, TwinParameter } from '../../api/digital-twin.api';
import { ReplayProvider } from '../../digital-twin.source';
import { ControlPanel } from './control-panel';

vi.mock('@digital-twin/components', () => import('../../testing/digital-twin-components.mock'));
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

const twin = vi.hoisted(() => ({
  getTwinControlRequests: vi.fn(() => Promise.resolve([])),
  writeTwinParameter: vi.fn(),
}));
vi.mock('../../api/digital-twin.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/digital-twin.api')>()),
  ...twin,
}));

const T0 = Date.parse('2026-10-11T06:00:00Z');
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();

const sim = vi.hoisted(() => ({ getJob: vi.fn(), getFrames: vi.fn() }));
vi.mock('../../../simulation/api/simulation.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../simulation/api/simulation.api')>()),
  ...sim,
}));

const ASSET: TwinAsset = {
  id: 4,
  alias: 'CT_01',
  name: 'Cooling Tower CT-01',
  typeName: 'Cooling Tower',
  modelName: 'S3E-1424',
  locationId: 14,
  status: 'RUNNING',
  statusStartTime: at(-600),
  condition: 'NORMAL',
  conditionStartTime: at(-600),
};

const param = (p: Partial<TwinParameter> & Pick<TwinParameter, 'id' | 'alias' | 'name'>) =>
  ({
    unit: '',
    dataType: 'number',
    scale: 0,
    value: 0,
    timestamp: at(-1),
    condition: 'NORMAL',
    warning: { lower: null, upper: null },
    critical: { lower: null, upper: null },
    spc: { ucl: null, lcl: null, centerLine: null, sigma: null, usl: null, lsl: null },
    control: null,
    ...p,
  }) as TwinParameter;

const PARAMS = [
  param({
    id: 1,
    alias: 'fan_mode',
    name: 'Fan Mode',
    value: 1,
    control: {
      min: null,
      max: null,
      step: null,
      options: [
        { value: 0, label: 'Auto' },
        { value: 1, label: 'Manual' },
      ],
      mode: null,
      target: 'fan_speed',
    },
  }),
  param({
    id: 2,
    alias: 'fan_speed_sp',
    name: 'Fan Speed Set Point',
    unit: '%',
    value: 65,
    control: { min: 30, max: 100, step: 1, options: null, mode: 'fan_mode', target: 'fan_speed' },
  }),
];

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
  variants: ['baseline'],
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
    {
      alias: 'CT_01',
      id: 4,
      name: 'Cooling Tower CT-01',
      typeName: 'Cooling Tower',
      modelName: 'S3E-1424',
    },
  ],
  series: { CT_01: { fan_speed_sp: [80, 80, 80] } },
  states: [],
  events: [],
};

let navigate: NavigateFunction = () => undefined;
const NavigateProbe = () => {
  navigate = useNavigate();
  return null;
};

const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ControlPanel', () => {
  it('drops a pending confirmation and typed set points when a replay starts or ends', async () => {
    sim.getJob.mockResolvedValue(JOB);
    sim.getFrames.mockResolvedValue(FRAMES);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const auth = { hasPermission: () => true } as unknown as ContextType<typeof AuthCtx>;
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/digital-twin']}>
          <NavigateProbe />
          <AuthCtx.Provider value={auth}>
            <ReplayProvider>
              <ControlPanel asset={ASSET} params={PARAMS} historyRows={0} />
            </ReplayProvider>
          </AuthCtx.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const input = screen.getByLabelText('New Fan Speed Set Point of CT-01');
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(screen.getByRole('alertdialog', { name: 'Confirm command' })).toHaveTextContent(
      'Set Fan Speed Set Point of CT-01: 65 → 75 %?'
    );

    act(() => navigate('/digital-twin?replay=7'));
    await settle();
    expect(screen.getByText('Replay · read-only')).toBeInTheDocument();
    expect(screen.getByLabelText('New Fan Speed Set Point of CT-01')).toBeDisabled();
    expect(screen.queryByRole('alertdialog')).toBeNull();

    // back on the live plant: neither the confirmation nor the typed value comes back
    act(() => navigate('/digital-twin'));
    await settle();
    expect(screen.queryByText('Replay · read-only')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByLabelText('New Fan Speed Set Point of CT-01')).toHaveValue(65);
    expect(screen.getByRole('button', { name: 'Set' })).toBeDisabled();
    expect(twin.writeTwinParameter).not.toHaveBeenCalled();
  });
  it('asks before it writes: Enter asks, Esc withdraws, only Confirm sends', async () => {
    twin.writeTwinParameter.mockResolvedValue({
      id: 31,
      assetId: 4,
      parameterId: 2,
      alias: 'fan_speed_sp',
      name: 'Fan Speed Set Point',
      unit: '%',
      scale: 0,
      oldValue: 65,
      value: 75,
      status: 'APPLIED',
      reason: null,
      requestedAt: at(0),
      completedAt: at(0),
      username: 'sarah_lim',
      userName: 'Sarah Lim',
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const auth = { hasPermission: () => true } as unknown as ContextType<typeof AuthCtx>;
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/digital-twin']}>
          <AuthCtx.Provider value={auth}>
            <ReplayProvider>
              <ControlPanel asset={ASSET} params={PARAMS} historyRows={0} />
            </ReplayProvider>
          </AuthCtx.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const input = screen.getByLabelText('New Fan Speed Set Point of CT-01');
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const dialog = screen.getByRole('alertdialog', { name: 'Confirm command' });
    // Confirm is never focused by the keystroke that asked
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Confirm' }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(twin.writeTwinParameter).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await settle();
    expect(twin.writeTwinParameter).toHaveBeenCalledWith(2, 75);
    expect(await screen.findByRole('status')).toHaveTextContent('Applied');
  });
});
