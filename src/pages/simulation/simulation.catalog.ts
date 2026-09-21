/**
 * What a scenario can act on: the writable plant controls (aliases, ranges and options as defined
 * in the simulator's plant model, cmd/simulator/plant.go, and DESIGN.md §2.1) and the chiller
 * plant units that can be tripped, taken offline or put in maintenance. Fault injections come
 * from the backend fault catalog (simulation/getfaultcatalog).
 */
import {
  PLANT_CHILLERS,
  PLANT_CHW_PUMPS,
  PLANT_CW_PUMPS,
  PLANT_SYSTEM,
  PLANT_TOWERS,
  PlantUnit,
} from '../digital-twin/digital-twin.bms';
import { SimActionKind } from './api/simulation.api';

export type ControlOption = { value: number; label: string };

/** A writable parameter: a control mode (options; 0 = automatic) or a set point (range) */
export type ControlDef = {
  param: string;
  label: string;
  unit: string;
  options?: ControlOption[];
  min?: number;
  max?: number;
  step?: number;
  /** value proposed when the action is added */
  def: number;
  /** mode parameter that must be out of automatic (≠ 0) for this set point to act */
  mode?: string;
  hint?: string;
};

const mode = (param: string, label: string, options: string[], hint?: string): ControlDef => ({
  param,
  label,
  unit: '',
  options: options.map((o, value) => ({ value, label: o })),
  def: 1,
  hint,
});

const setpoint = (
  param: string,
  label: string,
  unit: string,
  [min, max, step]: [number, number, number],
  def: number,
  extra: Pick<ControlDef, 'mode' | 'hint'> = {}
): ControlDef => ({ param, label, unit, min, max, step, def, ...extra });

/** CHW plant controller CHWS_01: plant supervisory set points (CHW and CW loops) */
const PLANT_CONTROLS: ControlDef[] = [
  mode('chws_reset_mode', 'CHW Set Point Mode', ['Reset', 'Manual'], 'Reset: outdoor-air reset'),
  setpoint('chws_sp', 'CHW Supply Set Point', '°C', [5.5, 8.0, 0.1], 7.0, {
    mode: 'chws_reset_mode',
    hint: 'pushed to every chiller',
  }),
  mode('staging_mode', 'Chiller Staging Mode', ['Load', 'Manual'], 'Load: staged on cooling load'),
  setpoint('chillers_sp', 'Duty Chillers Set Point', '', [1, 3, 1], 2, { mode: 'staging_mode' }),
  setpoint('approach_sp', 'Tower Approach Set Point', 'K', [2.0, 8.0, 0.1], 3.5),
  setpoint('cw_min_temp', 'Min Condenser Water Temp', '°C', [15.0, 28.0, 0.5], 20.0),
  setpoint('twv_min_pos', '3-Way Valve Min Position', '%', [0, 50, 1], 0),
  setpoint('riser_dp_sp', 'Riser DP Set Point', 'kPa', [80, 160, 1], 120),
];

const CHILLER_CONTROLS: ControlDef[] = [
  mode('run_mode', 'Run Mode', ['Auto', 'On', 'Off'], 'On / Off override the duty rotation'),
  setpoint('chwst_sp', 'CHW Supply Temp Set Point', '°C', [5.5, 8.0, 0.1], 6.5, {
    hint: 'until the plant controller pushes its next set point',
  }),
];

const TOWER_CONTROLS: ControlDef[] = [
  mode('fan_mode', 'Fan Control Mode', ['Auto', 'Manual']),
  setpoint('fan_speed_sp', 'Fan Speed Set Point', '%', [30, 100, 1], 65, { mode: 'fan_mode' }),
];

/** CHW / CW pumps: the VFD maximum is the design speed (faster overloads the motor) */
const pumpControls = (designHz: number): ControlDef[] => [
  mode('speed_mode', 'Speed Control Mode', ['Auto', 'Manual']),
  setpoint('speed_sp', 'Speed Set Point', 'Hz', [30, designHz, 0.5], designHz, {
    mode: 'speed_mode',
  }),
];

export type ScenarioUnit = PlantUnit & { kind: string; group: string };

const unitsOf = (units: PlantUnit[], kind: string, group: string): ScenarioUnit[] =>
  units.map((u) => ({ ...u, kind, group }));

/** Equipment with writable controls, in display order */
export const CONTROL_UNITS: ScenarioUnit[] = [
  { alias: PLANT_SYSTEM, tag: PLANT_SYSTEM.replace('_', '-'), kind: 'chws', group: 'Plant' },
  ...unitsOf(PLANT_CHILLERS, 'chiller', 'Chillers'),
  ...unitsOf(PLANT_TOWERS, 'ct', 'Cooling towers'),
  ...unitsOf(PLANT_CHW_PUMPS, 'chwp', 'CHW pumps'),
  ...unitsOf(PLANT_CW_PUMPS, 'cwp', 'CW pumps'),
];

/** Physical plant units (trip, offline, maintenance, release) */
export const PLANT_UNITS: ScenarioUnit[] = CONTROL_UNITS.filter((u) => u.kind !== 'chws');

const CONTROLS_OF_KIND: Record<string, ControlDef[]> = {
  chws: PLANT_CONTROLS,
  chiller: CHILLER_CONTROLS,
  ct: TOWER_CONTROLS,
  chwp: pumpControls(46),
  cwp: pumpControls(47),
};

const UNIT_BY_ALIAS = new Map(CONTROL_UNITS.map((u) => [u.alias, u]));

export const unitOf = (alias: string) => UNIT_BY_ALIAS.get(alias);

/** Writable controls of an equipment (none for unknown aliases) */
export const controlsOf = (alias: string): ControlDef[] =>
  CONTROLS_OF_KIND[UNIT_BY_ALIAS.get(alias)?.kind ?? ''] ?? [];

export const controlOf = (alias: string, param?: string | null) =>
  param ? controlsOf(alias).find((c) => c.param === param) : undefined;

/** Equipment tag as drawn on the P&ID ("CT-01") */
export const tagOf = (alias: string) => UNIT_BY_ALIAS.get(alias)?.tag ?? alias.replace('_', '-');

/** Display text of a control value: option label, or number with unit */
export const controlValueText = (
  control: ControlDef | undefined,
  value: number | null | undefined
) => {
  if (value === null || value === undefined) return '--';
  const option = control?.options?.find((o) => o.value === value);
  if (option) return option.label;
  const decimals =
    control?.step && control.step < 1 ? String(control.step).split('.')[1].length : 0;
  return `${value.toFixed(decimals)}${control?.unit ? ` ${control.unit}` : ''}`;
};

export const ACTION_KINDS: { value: SimActionKind; label: string; hint: string }[] = [
  { value: 'control', label: 'Set point / mode', hint: 'Write a plant control' },
  { value: 'fault', label: 'Inject fault', hint: 'Start a documented fault at an intensity' },
  { value: 'clear_fault', label: 'Clear fault', hint: 'End an injected fault' },
  { value: 'trip', label: 'Trip', hint: 'Trip the unit (it restarts after the trip clears)' },
  { value: 'offline', label: 'Comm loss', hint: 'The unit stops reporting for a while' },
  { value: 'maintenance', label: 'Maintenance', hint: 'Take the unit out for maintenance' },
  { value: 'release', label: 'Release', hint: 'Return a unit from maintenance' },
];

export const ACTION_KIND_LABEL = Object.fromEntries(
  ACTION_KINDS.map((k) => [k.value, k.label])
) as Record<SimActionKind, string>;

/** Scenario length presets (minutes) */
export const DURATION_PRESETS = [
  { minutes: 60, label: '1 h' },
  { minutes: 240, label: '4 h' },
  { minutes: 480, label: '8 h' },
  { minutes: 1440, label: '24 h' },
  { minutes: 2880, label: '48 h' },
];

/** Limits of the scenario spec (DESIGN.md §4.2 / §5.1) */
export const SPEC_LIMITS = {
  durationMin: 10,
  durationMax: 2880,
  maxVariants: 3,
  maxActions: 200,
  /** a scheduled start may lie at most this far ahead */
  startAheadDays: 14,
  loadScale: [0.5, 1.3] as const,
  /** weather offsets accepted by the form (°C) */
  weatherOffset: [-8, 8] as const,
};
