/**
 * BMS plant overview of the CUB chilled water plant: the equipment the schematic shows (aliases of
 * the simulator's demo plant), the parameters read per unit (model-parameter aliases, units as in
 * asset.model_parameters) and the status wording of the plant graphic.
 */
import { STATUS_COLOR, StatusEnum } from '@digital-twin/components';

import { TwinLiveAsset } from './api/digital-twin.api';
import { TWIN_SCENES } from './digital-twin.scenes';
import { UNASSIGNED_ID } from './digital-twin.tree';
import { TwinNode } from './digital-twin.types';

/** CHW plant controller: plant-level BMS points (headers, bypass, riser dP, plant KPIs) */
export const PLANT_SYSTEM = 'CHWS_01';
/** Equipment type of the plant controller (its equipment dashboard opens the overview) */
export const PLANT_SYSTEM_TYPE = 'Chilled Water System';

/** 1 refrigeration ton = 3.517 kW of cooling */
export const KW_PER_RT = 3.517;

export type PlantUnit = { alias: string; tag: string };

/** Unit n of a set: backend alias `CH_01`, P&ID tag `CH-01` */
const units = (prefix: string): PlantUnit[] =>
  ['01', '02', '03'].map((n) => ({ alias: `${prefix}_${n}`, tag: `${prefix}-${n}` }));

/** One column per chiller set: CH-0n with its dedicated pumps and (normally) tower n */
export const PLANT_CHILLERS = units('CH');
export const PLANT_CHW_PUMPS = units('CHWP');
export const PLANT_CW_PUMPS = units('CWP');
export const PLANT_TOWERS = units('CT');

/** Every equipment of the overview, in request order (one batched live query) */
export const PLANT_ALIASES: readonly string[] = [
  PLANT_SYSTEM,
  ...[PLANT_CHILLERS, PLANT_CHW_PUMPS, PLANT_CW_PUMPS, PLANT_TOWERS].flat().map((u) => u.alias),
];

export type PlantPoint = {
  /** model-parameter alias */
  alias: string;
  /** label as drawn on the schematic */
  label: string;
  /** unit shown after the value */
  unit?: string;
};

/** Values shown per unit; `unit` is omitted where the label already names it (kW, kW/RT) */
export const PLANT_POINTS = {
  chiller: [
    { alias: 'load_pct', label: 'LOAD', unit: '%' },
    { alias: 'chwst', label: 'CHWST', unit: '°C' },
    { alias: 'power_kw', label: 'kW' },
    { alias: 'efficiency', label: 'kW/RT' },
  ],
  pump: [
    { alias: 'flow', label: 'FLOW', unit: 'm³/h' },
    { alias: 'speed', label: 'SPEED', unit: 'Hz' },
  ],
  tower: [
    { alias: 'fan_speed', label: 'FAN', unit: '%' },
    { alias: 'cwst', label: 'CWST', unit: '°C' },
    { alias: 'approach', label: 'APPR', unit: 'K' },
  ],
} satisfies Record<string, PlantPoint[]>;

/** Plant-level points of the CHW plant controller (CHWS_01) */
export const SYSTEM_POINTS = {
  supplyTemp: { alias: 'chws_temp', label: 'TT-801', unit: '°C' },
  returnTemp: { alias: 'chwr_temp', label: 'TT-802', unit: '°C' },
  deltaT: { alias: 'delta_t', label: 'ΔT', unit: 'K' },
  plantFlow: { alias: 'plant_flow', label: 'FLOW', unit: 'm³/h' },
  fabFlow: { alias: 'fab_flow', label: 'FLOW', unit: 'm³/h' },
  bypassFlow: { alias: 'bypass_flow', label: 'BYPASS', unit: 'm³/h' },
  bypassValve: { alias: 'bypass_valve', label: 'FCV-801', unit: '%' },
  riserDp: { alias: 'riser_dp', label: 'DPT-801', unit: 'kPa' },
  coolingLoad: { alias: 'cooling_load', label: 'Cooling load', unit: 'kW' },
  plantKw: { alias: 'plant_kw', label: 'Plant power', unit: 'kW' },
  plantEff: { alias: 'plant_eff', label: 'Plant efficiency', unit: 'kW/RT' },
  chillersRunning: { alias: 'chillers_running', label: 'Chillers running' },
} satisfies Record<string, PlantPoint>;

/** Ambient wet bulb (reported by every tower; shown once) */
export const WET_BULB = { alias: 'wet_bulb', label: 'WET BULB', unit: '°C' } satisfies PlantPoint;

/** Status wording of the plant graphic (N+1 plant: a running unit is on duty, an idle one is standby) */
export const UNIT_STATE_LABEL: Record<StatusEnum, string> = {
  [StatusEnum.enum.RUNNING]: 'Duty',
  [StatusEnum.enum.IDLE]: 'Standby',
  [StatusEnum.enum['UNPLANNED DOWN']]: 'Trip',
  [StatusEnum.enum['PLANNED DOWN']]: 'Maintenance',
  [StatusEnum.enum.OFFLINE]: 'Offline',
  [StatusEnum.enum.DOWN]: 'Down',
};

/** Status label, app status colour and whether the unit runs (no data counts as offline) */
export const unitState = (asset?: Pick<TwinLiveAsset, 'status'>) => {
  const status = asset?.status ?? null;
  return {
    label: status ? UNIT_STATE_LABEL[status] : 'No data',
    color: STATUS_COLOR[status ?? StatusEnum.enum.OFFLINE],
    running: status === StatusEnum.enum.RUNNING,
  };
};

/**
 * Operator overrides flagged on the plant graphic: control mode parameter -> label of each
 * non-automatic value (chiller Hand-On / Off, tower fan and pump speed in Manual).
 */
export const OVERRIDE_POINTS: Record<string, Record<number, string>> = {
  run_mode: { 1: 'HAND', 2: 'OFF' },
  fan_mode: { 1: 'MAN' },
  speed_mode: { 1: 'MAN' },
};

/** The unit's active overrides ("MAN", "OFF" …), or null when everything runs in Auto */
export const overrideOf = (asset?: Pick<TwinLiveAsset, 'params'>) => {
  const labels = Object.entries(OVERRIDE_POINTS).flatMap(([alias, byValue]) => {
    const v = asset?.params[alias]?.value;
    return typeof v === 'number' && byValue[v] ? [byValue[v]] : [];
  });
  return labels.length ? labels.join(' ') : null;
};

/** 3D equipment node (`<scene>/<model>`, see buildTwinTree) bound to each backend alias */
export const TWIN_NODE_OF_ASSET = new Map(
  TWIN_SCENES.flatMap((scene) =>
    scene.models.flatMap((m) =>
      m.asset && !m.structure ? [[m.asset, `${scene.id}/${m.key}`] as const] : []
    )
  )
);

/**
 * Equipment nodes are leaves of the location tree here: their 3D parts are not searched. The
 * "Unassigned 3D scenes" group is skipped: a scene lands there when the user's location scope
 * hides its location, and then the plant's live data is out of scope too.
 */
const containsNode = (nodes: TwinNode[], id: string): boolean =>
  nodes.some(
    (n) =>
      n.id !== UNASSIGNED_ID &&
      (n.id === id || (n.kind !== 'equipment' && containsNode(n.children, id)))
  );

/** Whether the twin tree holds the chiller plant (its CHW plant controller's 3D equipment) */
export const hasPlant = (tree: TwinNode[]) => {
  const id = TWIN_NODE_OF_ASSET.get(PLANT_SYSTEM);
  return !!id && containsNode(tree, id);
};
