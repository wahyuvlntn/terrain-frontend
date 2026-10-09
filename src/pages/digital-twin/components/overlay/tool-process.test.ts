import { describe, expect, it, vi } from 'vitest';

import type { TwinToolRun, TwinToolRunNow } from '../../api/digital-twin.api';
import { formatDuration, groupRuns, runProgress, windowStats } from './tool-process';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock('@digital-twin/components', () => import('../../testing/digital-twin-components.mock'));

const T0 = Date.parse('2026-10-14T10:00:00Z');
const iso = (minutes: number) => new Date(T0 + minutes * 60e3).toISOString();

const now = (over: Partial<TwinToolRunNow> = {}): TwinToolRunNow => ({
  lotCode: 'MCU40-261003-007',
  productCode: 'MCU40',
  seq: 12,
  routeSteps: 254,
  stepCode: 'V2-ET',
  operation: 'V2 via etch',
  recipe: 'V2-ETCH',
  chambers: 'PM1,PM2',
  batchId: null,
  area: 'ETCH',
  wafers: 25,
  wafersProcessed: 25,
  queuedAt: iso(-30),
  startedAt: iso(0),
  expectedS: 1000,
  isRework: false,
  ...over,
});

const done = (start: number, end: number, over: Partial<TwinToolRun> = {}): TwinToolRun => ({
  lotCode: 'L1',
  productCode: 'MCU40',
  seq: 1,
  stepCode: 'S',
  operation: 'Op',
  recipe: 'R',
  chambers: null,
  batchId: null,
  startedAt: iso(start),
  endedAt: iso(end),
  isRework: false,
  wafersIn: 25,
  wafersOut: 25,
  scrapped: 0,
  reworked: 0,
  theoreticalS: null,
  outcome: 'PASS',
  ...over,
});

describe('runProgress', () => {
  it('works through the lot wafer by wafer against the expected time', () => {
    const p = runProgress(now(), T0 + 500e3);
    expect(p.progress).toBeCloseTo(0.5);
    expect(p.remainingS).toBeCloseTo(500);
    expect(p.wafer).toBe(13);
  });

  it('holds at 99 % past the expected time, and has all wafers in at once in a batch', () => {
    expect(runProgress(now(), T0 + 2000e3).progress).toBe(0.99);
    expect(runProgress(now({ batchId: 'FRN_01-B1' }), T0 + 500e3).wafer).toBeNull();
  });

  it('has no progress without an expected time', () => {
    const p = runProgress(now({ expectedS: null }), T0 + 500e3);
    expect(p.progress).toBeNull();
    expect(p.wafer).toBeNull();
    expect(p.elapsedS).toBeCloseTo(500);
  });
});

describe('groupRuns', () => {
  it('shows a furnace batch as one run', () => {
    const groups = groupRuns([
      now({ batchId: 'B1', lotCode: 'A' }),
      now({ batchId: 'B1', lotCode: 'B' }),
      now({ lotCode: 'C' }),
    ]);
    expect(groups.map((g) => g.map((r) => r.lotCode))).toEqual([['A', 'B'], ['C']]);
  });
});

describe('windowStats', () => {
  it('counts the runs that ended in the window and how busy the tool was', () => {
    const at = T0 + 120 * 60e3;
    const recent = [
      done(100, 110),
      done(90, 100, { batchId: 'B1', lotCode: 'X', wafersOut: 24 }),
      done(90, 100, { batchId: 'B1', lotCode: 'Y' }),
      // ended before the 1 h window
      done(30, 50),
    ];
    const s = windowStats(recent, [now({ startedAt: iso(115) })], at, 1);
    expect(s.lotSteps).toBe(3);
    expect(s.runCount).toBe(2);
    expect(s.wafers).toBe(74);
    // 90..110 (overlapping batch and run merged) + 115..120 = 25 of 60 minutes
    expect(s.busyPct).toBeCloseTo((25 / 60) * 100);
  });
});

describe('formatDuration', () => {
  it('reads in seconds, minutes, then hours', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(18 * 60)).toBe('18 min');
    expect(formatDuration(125 * 60)).toBe('2 h 05 min');
    expect(formatDuration(null)).toBe('--');
  });
});
