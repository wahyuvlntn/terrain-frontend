import { describe, expect, it, vi } from 'vitest';

import type { SimFrames } from '../simulation/api/simulation.api';
import type { TwinParameter } from './api/digital-twin.api';
import {
  buildReplayIndex,
  replayAssets,
  replayEventsOf,
  replayOverview,
  replayParameters,
  replaySummary,
  stepAt,
  stepTime,
} from './digital-twin.replay';

// the shared barrels load a UI library whose CSS vitest can't import: a typed double of the
// status / condition enums, and the request function only
vi.mock('@digital-twin/components', () => import('./testing/digital-twin-components.mock'));
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

const T0 = Date.parse('2026-10-11T06:00:00Z');
const at = (min: number, s = 0) => new Date(T0 + min * 60_000 + s * 1000).toISOString();

const event = (over: Partial<SimFrames['events'][number]>): SimFrames['events'][number] => ({
  id: 1,
  variant: 'baseline',
  ts: at(0),
  endTs: null,
  assetAlias: 'CH_01',
  kind: 'note',
  code: null,
  severity: null,
  message: '',
  value: null,
  details: {},
  ...over,
});

const FRAMES: SimFrames = {
  jobId: 7,
  variant: 'baseline',
  t0: at(0),
  stepS: 60,
  steps: 5,
  assets: [
    { alias: 'CH_01', id: 1, name: 'Chiller CH-01', typeName: 'Chiller', modelName: 'WSC-126' },
    { alias: 'CT_01', id: 4, name: 'Tower CT-01', typeName: 'Cooling Tower', modelName: 'S3E' },
  ],
  series: {
    CH_01: { chwst: [6.5, 6.6, 9.2, null, 6.4], load_pct: [70, 71, 72, 73, 74] },
    CT_01: { fan_speed: [60, 61, 62, 63, 64] },
  },
  states: [
    // given out of order: the index sorts them
    { alias: 'CH_01', kind: 'status', value: 'UNPLANNED DOWN', start: at(2, 30), end: null },
    { alias: 'CH_01', kind: 'status', value: 'RUNNING', start: at(0), end: at(2, 30) },
    { alias: 'CH_01', kind: 'condition', value: 'NORMAL', start: at(0), end: at(2) },
    { alias: 'CH_01', kind: 'condition', value: 'CRITICAL', start: at(2), end: null },
    { alias: 'CT_01', kind: 'status', value: 'RUNNING', start: at(0), end: null },
  ],
  events: [
    event({
      id: 2,
      ts: at(2),
      endTs: at(3, 30),
      kind: 'alarm',
      code: 'CHL-008',
      severity: 'CRITICAL',
      message: 'CHW leaving temperature off set point',
    }),
    event({ id: 1, ts: at(1), kind: 'control', message: 'CHWST set point 6.5 → 7.0 °C' }),
    event({ id: 3, ts: at(3), assetAlias: 'CT_01', kind: 'alarm', severity: 'WARNING' }),
  ],
};

const limits = (lower: number | null, upper: number | null) => ({ lower, upper });

const param = (over: Partial<TwinParameter>): TwinParameter => ({
  id: 100,
  alias: 'chwst',
  name: 'CHW Supply Temp',
  unit: '°C',
  dataType: 'number',
  scale: 1,
  value: 0,
  timestamp: null,
  condition: 'NORMAL',
  warning: limits(null, null),
  critical: limits(null, null),
  spc: { ucl: null, lcl: null, centerLine: null, sigma: null, usl: null, lsl: null },
  control: null,
  ...over,
});

const TEMPLATE = [
  param({ alias: 'chwst', warning: limits(null, 7.5), critical: limits(5, 8) }),
  param({ id: 101, alias: 'load_pct', name: 'Load', unit: '%', scale: 0 }),
  param({ id: 102, alias: 'oil_dp', name: 'Oil dP', unit: 'bar' }),
];

describe('replay index', () => {
  const ix = buildReplayIndex(FRAMES);

  it('spans the samples and orders events and intervals', () => {
    expect(ix.t0).toBe(T0);
    expect(ix.end).toBe(T0 + 4 * 60_000);
    expect(ix.events.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(ix.status.get('CH_01')?.map((s) => s.value)).toEqual(['RUNNING', 'UNPLANNED DOWN']);
  });

  it('maps a playhead to the last sample at or before it, clamped to the run', () => {
    expect(stepAt(ix, T0 - 60_000)).toBe(0);
    expect(stepAt(ix, T0)).toBe(0);
    expect(stepAt(ix, T0 + 90_000)).toBe(1);
    expect(stepAt(ix, T0 + 120_000)).toBe(2);
    expect(stepAt(ix, T0 + 10 * 60_000)).toBe(4);
    expect(stepTime(ix, 3)).toBe(T0 + 3 * 60_000);
  });
});

describe('replay index of unusual frames', () => {
  it('reads engine status ids as status names', () => {
    const ix = buildReplayIndex({
      ...FRAMES,
      states: [
        { alias: 'CH_01', kind: 'status', value: '1', start: at(0), end: at(2) },
        { alias: 'CH_01', kind: 'status', value: '5', start: at(2), end: null },
      ],
    });
    expect(replayAssets(ix, 1)[0].status).toBe('RUNNING');
    expect(replayAssets(ix, 3)[0].status).toBe('PLANNED DOWN');
  });

  it('has no samples when nothing was recorded', () => {
    const ix = buildReplayIndex({ ...FRAMES, t0: null, steps: 0, series: {} });
    expect(ix.steps).toBe(0);
    expect(ix.end).toBe(ix.t0);
    expect(stepAt(ix, Date.now())).toBe(0);
  });
});

describe('replayAssets', () => {
  const ix = buildReplayIndex(FRAMES);

  it('gives each unit the status and condition covering the sample', () => {
    const [ch1] = replayAssets(ix, 1);
    expect(ch1).toMatchObject({
      id: 1,
      alias: 'CH_01',
      status: 'RUNNING',
      statusStartTime: at(0),
      condition: 'NORMAL',
    });
    const [later] = replayAssets(ix, 3);
    expect(later).toMatchObject({
      status: 'UNPLANNED DOWN',
      statusStartTime: at(2, 30),
      condition: 'CRITICAL',
      conditionStartTime: at(2),
    });
  });
});

describe('replayParameters', () => {
  const ix = buildReplayIndex(FRAMES);

  it('fills the live template with the recorded values and limit conditions', () => {
    const normal = replayParameters(ix, 1, 0, TEMPLATE);
    expect(normal.map((p) => [p.alias, p.value, p.condition])).toEqual([
      ['chwst', 6.5, 'NORMAL'],
      ['load_pct', 70, 'NORMAL'],
      // not recorded: no value
      ['oil_dp', null, 'OFFLINE'],
    ]);
    expect(normal[0].timestamp).toBe(at(0));
    expect(normal[0].name).toBe('CHW Supply Temp');
    expect(replayParameters(ix, 1, 2, TEMPLATE)[0].condition).toBe('CRITICAL');
    expect(replayParameters(ix, 1, 3, TEMPLATE)[0]).toMatchObject({
      value: null,
      condition: 'OFFLINE',
    });
  });

  it('lists the recorded series by alias without a template', () => {
    const raw = replayParameters(ix, 4, 1, undefined);
    expect(raw).toHaveLength(1);
    expect(raw[0]).toMatchObject({ alias: 'fan_speed', value: 61, unit: '', control: null });
    expect(raw[0].id).toBeLessThan(0);
  });
});

describe('replayOverview', () => {
  const ix = buildReplayIndex(FRAMES);

  it('keeps the requested order and leaves unknown units out', () => {
    const rows = replayOverview(ix, ['CT_01', 'NOPE', 'CH_01'], 2, new Map([['CH_01', TEMPLATE]]));
    expect(rows.map((r) => r.alias)).toEqual(['CT_01', 'CH_01']);
    expect(rows[0].params.fan_speed).toMatchObject({ value: 62, condition: 'NORMAL' });
    expect(rows[1].params.chwst).toMatchObject({ value: 9.2, unit: '°C', condition: 'CRITICAL' });
    expect(rows[1].status).toBe('RUNNING');
  });
});

describe('replaySummary', () => {
  const ix = buildReplayIndex(FRAMES);

  it('clips the history to the run up to the playhead', () => {
    const s = replaySummary(ix, 1, 4, 24, { location: 'Plant room', image: null });
    expect(s).toBeDefined();
    if (!s) return;
    expect(s.from).toBe(at(0));
    expect(s.to).toBe(at(4));
    expect(s.statuses).toEqual([
      { value: 'RUNNING', start: at(0), end: at(2, 30) },
      { value: 'UNPLANNED DOWN', start: at(2, 30), end: at(4) },
    ]);
    expect(s.uptimeWindow.uptime).toBeCloseTo(62.5);
    expect(s.runningHours).toBeCloseTo(2.5 / 60);
    expect(s.criticalCounts).toBe(1);
    expect(s.warningCounts).toBe(0);
    expect(s.alarms).toEqual([
      expect.objectContaining({
        name: 'CHL-008',
        severity: 'CRITICAL',
        active: false,
        end: at(3, 30),
      }),
    ]);
    expect(s.location).toBe('Plant room');
    expect(s.maintenances).toEqual([]);
  });

  it('shows an alarm as active before it ends', () => {
    const s = replaySummary(ix, 1, 3, 24);
    expect(s?.alarms[0]).toMatchObject({ active: true, end: null });
  });

  it('is undefined for a unit outside the frames', () => {
    expect(replaySummary(ix, 999, 1, 24)).toBeUndefined();
  });
});

describe('replayEventsOf', () => {
  it('returns the unit events of a kind up to the sample, newest first', () => {
    const ix = buildReplayIndex(FRAMES);
    expect(replayEventsOf(ix, 'CH_01', ['control'], 0, 5)).toEqual([]);
    expect(replayEventsOf(ix, 'CH_01', ['control', 'alarm'], 4, 5).map((e) => e.id)).toEqual([
      2, 1,
    ]);
    expect(replayEventsOf(ix, 'CH_01', ['control', 'alarm'], 4, 1).map((e) => e.id)).toEqual([2]);
  });
});
