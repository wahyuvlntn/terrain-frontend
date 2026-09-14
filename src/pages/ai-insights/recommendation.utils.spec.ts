import { describe, expect, it } from 'vitest';

import {
  bulletRange,
  constraintView,
  pctOf,
  recommendationSteps,
  setpointRows,
  twinCompare,
  validationVerdict,
} from './recommendation.utils';

const point = (setpoints: Record<string, number>) => ({ setpoints, predicted: {} });

describe('validationVerdict', () => {
  const run = {
    success: true,
    saving_kw: 12.3,
    violations: [],
    baseline_violations: [],
  };

  it('reports all constraints met when neither run violates one', () => {
    expect(validationVerdict(run)).toEqual({ text: 'All met', tone: 'normal', detail: null });
  });

  it('does not claim "all met" for violations the baseline run has too', () => {
    const verdict = validationVerdict({
      ...run,
      baseline_violations: [
        {
          constraint: 'max_mau_valve',
          label: 'MAU CHW valve saturated',
          minutes: 40,
          critical: true,
        },
      ],
    });
    expect(verdict?.text).toBe('Same as baseline');
    expect(verdict?.tone).toBe('warning');
    expect(verdict?.detail).toContain('MAU CHW valve saturated');
  });

  it('reports violations the recommendation caused', () => {
    const verdict = validationVerdict({
      ...run,
      success: false,
      violations: [{ constraint: 'max_chws_temp', label: 'CHW supply above 8.5 °C' }],
    });
    expect(verdict).toMatchObject({ text: 'Violated', tone: 'critical' });
    expect(verdict?.detail).toContain('CHW supply above 8.5 °C');
  });

  it('has no verdict without a success flag (failed or pending runs)', () => {
    expect(validationVerdict({ job_id: 4, status: 'FAILED', error: 'boom' })).toBeNull();
    expect(validationVerdict(null)).toBeNull();
  });
});

describe('recommendationSteps', () => {
  const states = (status: Parameters<typeof recommendationSteps>[0], validation?: unknown) =>
    recommendationSteps(status, validation ?? null).map((s) => `${s.label}:${s.state}`);

  it('walks Proposed → Validating → Validated → Applied', () => {
    expect(states('VALIDATING')).toEqual([
      'Proposed:done',
      'Validating:active',
      'Validated:todo',
      'Applied:todo',
    ]);
    expect(states('APPLIED').every((s) => s.endsWith(':done'))).toBe(true);
  });

  it('shows where a recommendation stopped', () => {
    expect(states('REJECTED')[2]).toBe('Rejected:error');
    expect(states('EXPIRED', { success: true })).toEqual([
      'Proposed:done',
      'Validating:done',
      'Validated:done',
      'Expired:stopped',
    ]);
    expect(states('DISMISSED')[1]).toBe('Validating:stopped');
  });
});

describe('set points and constraints', () => {
  it('lists set points in order with the decision bounds and held values', () => {
    const rows = setpointRows({
      current: point({ riser_dp_sp: 120, chws_sp: 6.5 }),
      recommended: point({ chws_sp: 7, riser_dp_sp: 120, cw_min_temp: 20 }),
      conditions: { values: { cw_min_temp: 20 }, modes: {}, measured: {} },
    });
    expect(rows.map((r) => r.key)).toEqual(['chws_sp', 'riser_dp_sp', 'cw_min_temp']);
    expect(rows[0]).toMatchObject({ current: 6.5, recommended: 7, lo: 5.5, hi: 8, changed: true });
    expect(rows[1].changed).toBe(false);
    expect(rows[2]).toMatchObject({ current: 20, recommended: 20, changed: false });
  });

  it('reads an optimizer constraint and places it on a padded scale', () => {
    const c = constraintView({
      name: 'chws_temp',
      label: 'CHW supply header temperature',
      op: '<=',
      limit: 7.5,
      unit: '°C',
      current: 6.6,
      predicted: 7.1,
      margin: 0.12,
      ok: true,
    });
    expect(c).toMatchObject({ op: '<=', limit: 7.5, current: 6.6, predicted: 7.1, ok: true });
    expect(constraintView('chws_temp ≤ 7.5')).toBeNull();
    const range = bulletRange([7.5, 6.6, 7.1]);
    expect(range.min).toBeLessThan(6.6);
    expect(range.max).toBeGreaterThan(7.5);
    expect(pctOf(7.5, range)).toBeGreaterThan(pctOf(6.6, range));
    expect(pctOf(100, range)).toBe(100);
  });

  it('extracts the twin KPIs of both variants', () => {
    const cmp = twinCompare({
      success: true,
      saving_kw: 20,
      saving_kwh: 40,
      baseline: { avg_plant_kw: 1000, energy_kwh: 2000 },
      recommended: { avg_plant_kw: 980, energy_kwh: 1960 },
    });
    expect(cmp?.baseline.avg_plant_kw).toBe(1000);
    expect(cmp?.recommended.energy_kwh).toBe(1960);
    expect(cmp?.recommended.avg_kw_per_rt).toBeNull();
    expect(twinCompare({ job_id: 1, status: 'FAILED' })).toBeNull();
  });
});
