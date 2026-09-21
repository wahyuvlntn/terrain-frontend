import { describe, expect, it, vi } from 'vitest';

import type { SimFault } from '../api/simulation.api';
import {
  ActionForm,
  defaultScenario,
  gatingHint,
  localInput,
  newAction,
  ScenarioForm,
  scenarioSchema,
  toSpec,
} from './scenario-form.schema';

// the shared barrels load a UI library whose CSS vitest can't import: a typed double of the
// status / condition enums, and the request function only
vi.mock(
  '@digital-twin/components',
  () => import('../../digital-twin/testing/digital-twin-components.mock')
);
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

const CATALOG: SimFault[] = [
  {
    kind: 'cwst_bias',
    assetKind: 'ct',
    assets: ['CT_01', 'CT_02', 'CT_03'],
    intensities: [-2, -1, 1, 2],
    unit: 'K',
    label: 'Tower leaving water temperature sensor bias',
    code: 'CT-013',
  },
  {
    kind: 'twv_stuck',
    assetKind: 'chws',
    assets: ['CHWS_01'],
    intensities: [0.5, 0.75],
    unit: '',
    label: 'Condenser 3-way valve stuck',
    code: 'CHS-007',
  },
];

const action = (over: Partial<ActionForm>): ActionForm => ({ ...newAction(), ...over });

const form = (over: Partial<ScenarioForm> = {}): ScenarioForm => ({
  ...defaultScenario(),
  title: 'Raise CHWST',
  ...over,
});

/** issue messages by dotted path (catalog null: the catalog failed to load) */
const issues = (f: ScenarioForm, catalog: SimFault[] | null = CATALOG) => {
  const r = scenarioSchema(catalog ?? undefined).safeParse(f);
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('scenarioSchema', () => {
  it('accepts the defaults with a title', () => {
    expect(issues(form())).toEqual({});
    expect(issues(form({ title: '  ' }))).toHaveProperty('title');
  });

  it('checks set points against their range and step', () => {
    expect(issues(form({ actions: [action({ value: 7.3 })] }))).toEqual({});
    expect(issues(form({ actions: [action({ value: 8.5 })] }))).toEqual({
      'actions.0.value': 'Maximum 8',
    });
    expect(issues(form({ actions: [action({ value: 7.25 })] }))).toEqual({
      'actions.0.value': 'Steps of 0.1',
    });
    expect(
      issues(form({ actions: [action({ asset: 'CH_01', param: 'run_mode', value: 5 })] }))
    ).toEqual({ 'actions.0.value': 'Pick an option' });
    // a chiller's own set point (until the plant controller pushes the next one)
    expect(
      issues(form({ actions: [action({ asset: 'CH_01', param: 'chwst_sp', value: 7 })] }))
    ).toEqual({});
    expect(issues(form({ actions: [action({ asset: 'CH_01', param: 'chws_sp' })] }))).toEqual({
      'actions.0.param': 'Pick a control',
    });
  });

  it('keeps actions inside the run', () => {
    const f = form({ duration_min: 60, actions: [action({ at_min: 60 })] });
    expect(issues(f)).toEqual({ 'actions.0.at_min': 'Before the end (60 min)' });
  });

  it('checks fault injections against the catalog', () => {
    const fault = (over: Partial<ActionForm>) =>
      action({ kind: 'fault', asset: 'CT_02', param: '', fault: 'cwst_bias', value: 1, ...over });
    expect(issues(form({ actions: [fault({})] }))).toEqual({});
    expect(issues(form({ actions: [fault({ value: 1.5 })] }))).toEqual({
      'actions.0.value': 'Pick a documented intensity',
    });
    expect(issues(form({ actions: [fault({ asset: 'CH_01' })] }))).toEqual({
      'actions.0.fault': 'Pick a fault of this equipment',
    });
    expect(issues(form({ actions: [fault({})] }), null)).toEqual({
      'actions.0.fault': 'The fault catalog is not available',
    });
  });

  it('needs a length for comm loss and a plant unit for trips', () => {
    expect(
      issues(form({ actions: [action({ kind: 'offline', asset: 'CWP_01', duration_min: null })] }))
    ).toEqual({ 'actions.0.duration_min': 'How long (minutes)' });
    expect(issues(form({ actions: [action({ kind: 'trip', asset: 'CHWS_01' })] }))).toEqual({
      'actions.0.asset': 'Pick a plant unit',
    });
  });

  it('needs distinct variant names', () => {
    const f = form({
      variants: [
        { name: 'baseline', actions: [] },
        { name: 'Baseline', actions: [] },
      ],
    });
    expect(issues(f)).toEqual({ 'variants.1.name': 'Names must differ' });
  });

  it('keeps a later start within 14 days', () => {
    const inDays = (d: number) => localInput(new Date(Date.now() + d * 86_400_000));
    expect(issues(form({ startMode: 'at', startAt: inDays(1) }))).toEqual({});
    expect(issues(form({ startMode: 'at', startAt: inDays(-1) }))).toEqual({
      startAt: 'The start lies in the past',
    });
    expect(issues(form({ startMode: 'at', startAt: inDays(15) }))).toEqual({
      startAt: 'At most 14 days ahead',
    });
  });
});

describe('toSpec', () => {
  it('sends only the fields of each kind, in time order, modes ahead of their set points', () => {
    const spec = toSpec(
      form({
        duration_min: 120,
        load_scale: 1.1,
        actions: [
          action({ at_min: 30, kind: 'trip', asset: 'CH_02', param: 'x', value: 3 }),
          action({ at_min: 10, value: 7.5 }),
          action({ at_min: 10, param: 'chws_reset_mode', value: 1 }),
        ],
        variants: [
          { name: 'baseline', actions: [] },
          {
            name: ' warmer ',
            actions: [
              action({
                at_min: 5,
                kind: 'fault',
                asset: 'CHWS_01',
                fault: 'twv_stuck',
                value: 0.5,
              }),
              action({ at_min: 6, kind: 'offline', asset: 'CT_01', duration_min: 15 }),
            ],
          },
        ],
      })
    );
    expect(spec).toEqual({
      start: null,
      duration_min: 120,
      initial: 'live',
      stochastic: false,
      seed: 0,
      weather: { dry_bulb_offset: 0, wet_bulb_offset: 0 },
      load_scale: 1.1,
      actions: [
        { at_min: 10, kind: 'control', asset: 'CHWS_01', param: 'chws_reset_mode', value: 1 },
        { at_min: 10, kind: 'control', asset: 'CHWS_01', param: 'chws_sp', value: 7.5 },
        { at_min: 30, kind: 'trip', asset: 'CH_02' },
      ],
      variants: [
        { name: 'baseline', actions: [] },
        {
          name: 'warmer',
          actions: [
            { at_min: 5, kind: 'fault', asset: 'CHWS_01', fault: 'twv_stuck', value: 0.5 },
            { at_min: 6, kind: 'offline', asset: 'CT_01', duration_min: 15 },
          ],
        },
      ],
    });
  });

  it('sends the optional length of a control (revert) and of a trip', () => {
    const spec = toSpec(
      form({
        actions: [
          action({ at_min: 0, param: 'approach_sp', value: 3, duration_min: 90 }),
          action({ at_min: 5, kind: 'trip', asset: 'CH_01', duration_min: 30 }),
        ],
      })
    );
    expect(spec.actions).toEqual([
      {
        at_min: 0,
        kind: 'control',
        asset: 'CHWS_01',
        param: 'approach_sp',
        value: 3,
        duration_min: 90,
      },
      { at_min: 5, kind: 'trip', asset: 'CH_01', duration_min: 30 },
    ]);
    expect(
      issues(form({ actions: [action({ param: 'approach_sp', value: 3, duration_min: 3000 })] }))
    ).toEqual({ 'actions.0.duration_min': 'Whole minutes, 1 to 2880' });
  });

  it('turns a later start into UTC', () => {
    const local = '2026-10-12T08:30';
    expect(toSpec(form({ startMode: 'at', startAt: local })).start).toBe(
      new Date(local).toISOString()
    );
  });
});

describe('gatingHint', () => {
  it('flags a set point whose mode is not switched by then', () => {
    const sp = action({ at_min: 20, value: 7.5 });
    expect(gatingHint(sp, [sp])).toMatchObject({ mode: 'chws_reset_mode', manual: 'Manual' });
    const late = action({ at_min: 30, param: 'chws_reset_mode', value: 1 });
    expect(gatingHint(sp, [late, sp])).not.toBeNull();
    const early = action({ at_min: 20, param: 'chws_reset_mode', value: 1 });
    expect(gatingHint(sp, [early, sp])).toBeNull();
  });

  it('ignores ungated set points and other kinds', () => {
    expect(gatingHint(action({ param: 'approach_sp', value: 3.5 }), [])).toBeNull();
    expect(gatingHint(action({ kind: 'trip', asset: 'CH_01' }), [])).toBeNull();
  });
});
