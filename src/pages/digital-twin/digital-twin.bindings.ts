/**
 * Live-data bindings of the 3D models: 3D tag (dt_tag of a part in the GLB) -> parameter alias of
 * the bound equipment (asset.model_parameters.alias). `ALIAS:param` reads a parameter of another
 * equipment, e.g. a loop flowmeter that reports the flow of its pump.
 */
import { TwinMotion, TwinScreenConfig, TwinScreenRow } from './digital-twin.types';

export type TwinParamMap = Record<string, string>;

/** Chiller GLB (chiller-wsc.glb, shared by CH-01..03) -> Daikin WSC chiller model parameters */
export const CHILLER_PARAMS: TwinParamMap = {
  'TT-302': 'chwst',
  'TT-301': 'chwrt',
  'TT-201': 'cwet',
  'TT-202': 'cwlt',
  'FS-301': 'chw_flow',
  'PT-101': 'cond_press',
  'PT-102': 'cond_press',
  'PT-103': 'evap_press',
  'PT-105': 'evap_press',
  'TT-101': 'discharge_temp',
  'TT-103': 'superheat',
  'EXV-101': 'superheat',
  'CMP-01': 'vibration',
  'CMP-01-M': 'motor_current',
  'CMP-01-TB': 'power_kw',
  'OIL-01': 'oil_temp',
  'VFD-01': 'load_pct',
  'VFD-01-KP': 'motor_current',
  'HMI-01': 'efficiency',
  'COND-01': 'cond_approach',
  'EVAP-01': 'evap_approach',
  'IGV-01': 'load_pct',
  'CMP-01-IMP': 'vibration',
};

/**
 * Cooling tower GLB (cooling-tower-s3e.glb, shared by CT-01..03) -> BAC tower model parameters.
 * The 4xx instrument tags are local to every cell; `prefix` is the re-tagged unit tag (CT-0n) of
 * the fan, gear reducer, motor, VFD and control panel.
 */
export const towerParams = (prefix: string): TwinParamMap => ({
  'TT-401': 'cwst',
  'TT-403': 'cwrt',
  'TT-402': 'wet_bulb',
  'LT-401': 'basin_level',
  'AIT-401': 'conductivity',
  'VT-401': 'fan_vibration',
  [`${prefix}-GB`]: 'fan_vibration',
  [`${prefix}-M`]: 'fan_current',
  [`${prefix}-FAN`]: 'fan_speed',
  [`${prefix}-VFD`]: 'fan_speed',
  [`${prefix}-CP`]: 'approach',
});

/**
 * Pump GLB (shared by the CW, CHW and PCW pumps) -> Grundfos pump model parameters. `series` is the
 * instrument loop number of the pump's tags (CW pump PI-501…, CHW pump PI-701…, PCW pump PI-1001…).
 */
export const pumpParams = (tagPrefix: string, series = 5): TwinParamMap => ({
  [`PI-${series}01`]: 'suction_press',
  [`PT-${series}01`]: 'suction_press',
  [`PI-${series}02`]: 'discharge_press',
  [`PT-${series}02`]: 'discharge_press',
  [`VT-${series}01`]: 'vibration',
  [`TE-${series}01`]: 'bearing_temp',
  [`${tagPrefix}-M`]: 'motor_current',
  [`${tagPrefix}-P`]: 'flow',
  [`${tagPrefix}-C`]: 'speed',
  [`${tagPrefix}-VFD`]: 'speed',
});

/** Branch flowmeters FT-<series><n>1 of unit n report the flow of its pump */
const branchFlows = (series: number, pumpPrefix: string, units = 3): TwinParamMap =>
  Object.fromEntries(
    Array.from({ length: units }, (_, i) => i + 1).map((n) => [
      `FT-${series}${n}1`,
      `${pumpPrefix}_${String(n).padStart(2, '0')}:flow`,
    ])
  );

/** Condenser water loop GLB: the branch flowmeters report the flow of each CW pump */
export const CW_LOOP_PARAMS: TwinParamMap = branchFlows(6, 'CWP');

/**
 * Chilled water loop GLB -> CHW plant system (BMS plant-level points): header temperatures,
 * header differential pressure and bypass valve. Branch flowmeters report each CHW pump's flow.
 */
export const CHW_LOOP_PARAMS: TwinParamMap = {
  ...branchFlows(8, 'CHWP'),
  'TT-801': 'chws_temp',
  'TT-802': 'chwr_temp',
  'DPT-801': 'riser_dp',
  'FCV-801': 'bypass_valve',
};

/**
 * PCW loop GLB (PCW pump room): the pump discharge flowmeters FT-11n1 report each PCW pump's flow.
 * The heat exchanger, header and CHW points (TT-1101…, TT-12n1, TCV-12n1, TT-1201…) have no DB
 * points yet.
 */
export const PCW_LOOP_PARAMS: TwinParamMap = branchFlows(11, 'PCWP', 4);

/**
 * CDA compressor GLB (compressor-zr315.glb, shared by CDA-01 / CDA-02) -> Atlas Copco ZR compressor
 * model parameters. The 13xx package instruments are local to every unit; `prefix` is the re-tagged
 * unit tag (CDA-0n) of the motor, VSD, controller, elements, intercooler and dryer.
 */
export const compressorParams = (prefix: string): TwinParamMap => ({
  'TT-1301': 'lp_elem_temp',
  'TT-1302': 'intercooler_temp',
  'TT-1303': 'hp_elem_temp',
  'TT-1304': 'cooling_water_temp',
  'PT-1301': 'discharge_press',
  'MT-1301': 'dew_point',
  [`${prefix}-M`]: 'motor_current',
  [`${prefix}-VSD`]: 'load_pct',
  [`${prefix}-CP`]: 'discharge_press',
  [`${prefix}-LP`]: 'lp_elem_temp',
  [`${prefix}-HP`]: 'hp_elem_temp',
  [`${prefix}-IC`]: 'intercooler_temp',
  [`${prefix}-MD`]: 'dew_point',
});

/**
 * CDA loop GLB (CDA compressor room): FT-14n1 report each compressor's free air delivery; PT-1401
 * on the main is the CDA header pressure, which the compressor model reports as its discharge
 * pressure (CDA_01; the value holds while it is stopped, the other unit keeps the header up).
 */
export const CDA_LOOP_PARAMS: TwinParamMap = {
  ...branchFlows(14, 'CDA', 2),
  'PT-1401': 'CDA_01:discharge_press',
};

/** Parameters shown on the chiller HMI (unit controller) and VFD keypad display faces */
export const CHILLER_SCREENS: TwinScreenConfig = {
  hmi: [
    { alias: 'chwst', label: 'Leaving CHW' },
    { alias: 'chwrt', label: 'Entering CHW' },
    { alias: 'load_pct', label: 'Capacity' },
    { alias: 'cond_press', label: 'Cond. pressure' },
  ],
  vfd: { alias: 'motor_current', label: 'Motor' },
};

/** Tower fans turn at the live fan speed (the GLB's dt_spin_rps is the speed at 100 %) */
export const TOWER_MOTION: TwinMotion = { param: 'fan_speed', full: 100 };
/** Pump couplings turn at the live VFD speed (dt_spin_rps at 50 Hz) */
export const PUMP_MOTION: TwinMotion = { param: 'speed', full: 50 };

/** Parameters shown on the cooling tower control panel and fan VFD display faces */
export const TOWER_SCREENS: TwinScreenConfig = {
  hmi: [
    { alias: 'cwst', label: 'Cold water' },
    { alias: 'cwrt', label: 'Hot water' },
    { alias: 'approach', label: 'Approach' },
    { alias: 'wet_bulb', label: 'Wet bulb' },
  ],
  vfd: { alias: 'fan_speed', label: 'Fan' },
};

/** Parameters shown on the compressor controller and VSD display faces */
export const COMPRESSOR_SCREENS: TwinScreenConfig = {
  hmi: [
    { alias: 'discharge_press', label: 'Delivery' },
    { alias: 'load_pct', label: 'Load' },
    { alias: 'dew_point', label: 'Dew point' },
    { alias: 'hp_elem_temp', label: 'HP element' },
  ],
  vfd: { alias: 'motor_current', label: 'Motor' },
};

/**
 * The compressor's screw rotors, dryer drum and canopy fan turn with the VSD load (the GLB's
 * dt_spin_rps is the rate at 100 %)
 */
export const COMPRESSOR_MOTION: TwinMotion = { param: 'load_pct', full: 100 };

/** FAB1 make-up air unit: unit-prefixed tags are re-tagged when the shared model is placed. */
export const mauParams = (prefix: string): TwinParamMap => ({
  [`${prefix}-TT-OA`]: 'oat',
  [`${prefix}-TT-SA`]: 'sat',
  [`${prefix}-RH-SA`]: 'sa_rh',
  [`${prefix}-DPT-PRE`]: 'prefilter_dp',
  [`${prefix}-DPT-HEPA`]: 'hepa_dp',
  [`${prefix}-FAN`]: 'fan_speed',
  [`${prefix}-VFD`]: 'fan_current',
  [`${prefix}-FCV`]: 'chw_valve',
  [`${prefix}-FT`]: 'airflow',
  [`${prefix}-DPT-DUCT`]: 'duct_static',
  [`${prefix}-RH-OA`]: 'oa_rh',
});

export const MAU_SCREENS: TwinScreenConfig = {
  hmi: [
    { alias: 'sat', label: 'Supply air' },
    { alias: 'sa_rh', label: 'Supply RH' },
    { alias: 'prefilter_dp', label: 'Pre-filter dP' },
    { alias: 'airflow', label: 'Airflow' },
  ],
  vfd: { alias: 'fan_speed', label: 'Fan' },
};

/** Etch and CVD dry pump instruments share the same backend parameter aliases. */
export const dryPumpParams = (prefix: string): TwinParamMap => ({
  [`${prefix}-PT-IN`]: 'inlet_press',
  [`${prefix}-MOTOR`]: 'dp_current',
  [`${prefix}-BOOSTER`]: 'booster_current',
  [`${prefix}-TT-BODY`]: 'body_temp',
  [`${prefix}-PT-EXH`]: 'exhaust_press',
  [`${prefix}-FT-N2`]: 'n2_flow',
  [`${prefix}-FT-PCW`]: 'cooling_water_flow',
});

/**
 * FAB1 process tools: instrument suffix -> parameter of the tool's model, per GLB template. Units
 * that share a template on a different model (ETCH-01 is an ICP conductor etcher, ETCH-02/03 CCP
 * dielectric etchers; MET / OVL / DEF share the metrology footprint) get their own map. A tool's
 * foreline gauge (PT-FL) reads the inlet pressure of the dry pump under it.
 */
const TOOL_INSTRUMENTS: Record<string, Record<string, string>> = {
  track: {
    'TT-RES': 'resist_temp',
    'TT-PEB': 'peb_temp',
    'TT-DEV': 'dev_temp',
    'PT-EXH': 'cup_exhaust',
    RH: 'humidity',
  },
  scanner: {
    'TT-LENS': 'lens_temp',
    'TT-STG': 'stage_temp',
    LSR: 'laser_energy',
    'TT-IMM': 'immersion_temp',
  },
  stepper: { 'TT-LENS': 'lens_temp', 'TT-STG': 'stage_temp', LAMP: 'lamp_intensity' },
  etch: { RF: 'rf_source_power', 'PT-CH': 'chamber_pressure', 'TT-CH': 'esc_temp' },
  etchd: { RF: 'rf_hf_power', 'PT-CH': 'chamber_pressure', 'TT-CH': 'wall_temp' },
  cvd: {
    RF: 'rf_power',
    'PT-CH': 'chamber_pressure',
    'TT-HTR': 'heater_temp',
    'FT-TEOS': 'teos_flow',
  },
  pvd: {
    PS: 'dc_power',
    'PT-CH': 'chamber_pressure',
    'PT-BASE': 'base_pressure',
    'TT-SUB': 'substrate_temp',
  },
  rtp: { 'TT-PYRO': 'peak_temp', LAMP: 'lamp_power', 'AIT-O2': 'o2_ppm' },
  ash: { RF: 'rf_power', 'FT-O2': 'o2_flow', 'PT-CH': 'chamber_pressure' },
  implanter: {
    SRC: 'arc_current',
    HV: 'beam_energy',
    BEAM: 'beam_current',
    'PT-ES': 'endstation_vacuum',
  },
  cmp: {
    'FT-SLR': 'slurry_flow',
    'TT-PAD': 'pad_temp',
    'M-PLT': 'platen_speed',
    'PT-HEAD': 'head_pressure',
  },
  ecp: {
    'TT-BATH': 'bath_temp',
    'AIT-CU': 'cu_conc',
    PS: 'plating_current',
    'AIT-ACC': 'accelerator',
  },
  furnace: { 'TT-TUBE': 'tube_temp', 'PT-TUBE': 'tube_pressure', 'FT-GAS': 'gas_flow' },
  wet: {
    'TT-BATH': 'bath_temp',
    'AIT-CONC': 'chem_conc',
    PC: 'particles',
    'AIT-DI': 'di_resistivity',
  },
  swc: {
    'TT-CHEM': 'chem_temp',
    'FT-CHEM': 'chem_flow',
    PC: 'particles',
    'AIT-DI': 'di_resistivity',
  },
  met: { SRC: 'lamp_intensity', 'TT-STG': 'stage_temp' },
  ovl: { SRC: 'lamp_intensity', 'TT-STG': 'stage_temp' },
  def: { SRC: 'laser_power', 'TT-STG': 'stage_temp' },
  cdsem: { EBM: 'beam_current', 'PT-COL': 'column_vacuum', 'TT-STG': 'stage_temp' },
  wat: { 'TT-CHK': 'chuck_temp', SMU: 'smu_leakage', PRB: 'contact_res' },
};

const row = (alias: string, label: string): TwinScreenRow => ({ alias, label });
const THROUGHPUT = row('throughput_wph', 'Throughput');
const QUEUE = row('queue_lots', 'Lots waiting');

/** What each tool's controller face shows (model variant as in TOOL_INSTRUMENTS) */
const TOOL_HMI: Record<string, TwinScreenRow[]> = {
  track: [
    row('resist_temp', 'Resist'),
    row('peb_temp', 'PEB plate'),
    row('cup_exhaust', 'Cup exhaust'),
    THROUGHPUT,
  ],
  scanner: [
    row('dose', 'Dose'),
    row('focus_offset', 'Focus'),
    row('overlay_residual', 'Overlay'),
    THROUGHPUT,
  ],
  stepper: [
    row('dose', 'Dose'),
    row('focus_offset', 'Focus'),
    row('lamp_intensity', 'Hg lamp'),
    THROUGHPUT,
  ],
  etch: [
    row('rf_source_power', 'RF source'),
    row('chamber_pressure', 'Pressure'),
    row('endpoint_time', 'Endpoint'),
    THROUGHPUT,
  ],
  etchd: [
    row('rf_hf_power', 'HF RF'),
    row('wall_temp', 'Wall temp'),
    row('endpoint_time', 'Endpoint'),
    THROUGHPUT,
  ],
  cvd: [
    row('dep_rate', 'Dep. rate'),
    row('heater_temp', 'Heater'),
    row('film_buildup', 'Film build-up'),
    THROUGHPUT,
  ],
  pvd: [
    row('dc_power', 'DC power'),
    row('base_pressure', 'Base press.'),
    row('target_life', 'Target life'),
    THROUGHPUT,
  ],
  rtp: [
    row('peak_temp', 'Peak temp'),
    row('ramp_rate', 'Ramp rate'),
    row('o2_ppm', 'O2'),
    THROUGHPUT,
  ],
  ash: [
    row('strip_rate', 'Strip rate'),
    row('rf_power', 'RF power'),
    row('chuck_temp', 'Chuck'),
    THROUGHPUT,
  ],
  implanter: [
    row('beam_current', 'Beam'),
    row('beam_energy', 'Energy'),
    row('dose_uniformity', 'Uniformity'),
    THROUGHPUT,
  ],
  cmp: [
    row('removal_rate', 'Removal rate'),
    row('slurry_flow', 'Slurry'),
    row('pad_life', 'Pad life'),
    THROUGHPUT,
  ],
  ecp: [
    row('plating_current', 'Plating'),
    row('cu_conc', 'Cu'),
    row('accelerator', 'Accelerator'),
    THROUGHPUT,
  ],
  furnace: [
    row('tube_temp', 'Tube temp'),
    row('temp_uniformity', 'Zone spread'),
    row('boat_load', 'Lots in boat'),
    QUEUE,
  ],
  wet: [
    row('bath_temp', 'Bath temp'),
    row('chem_conc', 'Concentration'),
    row('bath_age', 'Bath age'),
    THROUGHPUT,
  ],
  swc: [
    row('chem_flow', 'Chem flow'),
    row('spin_speed', 'Spin speed'),
    row('particles', 'Particles'),
    THROUGHPUT,
  ],
  met: [row('measure_time', 'Meas. time'), row('lamp_intensity', 'Lamp'), THROUGHPUT, QUEUE],
  ovl: [
    row('tis', 'TIS'),
    row('lamp_intensity', 'Lamp'),
    row('measure_time', 'Meas. time'),
    THROUGHPUT,
  ],
  def: [
    row('sensitivity', 'Sensitivity'),
    row('laser_power', 'Laser'),
    row('scan_time', 'Scan time'),
    THROUGHPUT,
  ],
  cdsem: [
    row('resolution', 'Resolution'),
    row('beam_current', 'Probe current'),
    row('measure_time', 'Meas. time'),
    THROUGHPUT,
  ],
  wat: [
    row('contact_res', 'Contact res.'),
    row('test_time', 'Test time'),
    row('touchdowns', 'Touchdowns'),
    THROUGHPUT,
  ],
};

/** The model variant of a tool: its template, unless the unit runs a different model on it */
export const toolVariant = (alias: string, template: string) =>
  ({ ETCH_02: 'etchd', ETCH_03: 'etchd', OVL_01: 'ovl', DEF_01: 'def', STP_01: 'stepper' })[
    alias
  ] ?? template;

/** Instrument bindings of a FAB1 process tool (`prefix` = its unit tag, e.g. ETCH-02) */
export const toolParams = (variant: string, prefix: string, pump?: string): TwinParamMap => ({
  ...Object.fromEntries(
    Object.entries(TOOL_INSTRUMENTS[variant] ?? {}).map(([suffix, param]) => [
      `${prefix}-${suffix}`,
      param,
    ])
  ),
  ...(pump ? { [`${prefix}-PT-FL`]: `${pump}:inlet_press` } : {}),
});

export const toolScreens = (variant: string): TwinScreenConfig => ({
  hmi: TOOL_HMI[variant] ?? [
    THROUGHPUT,
    row('wafers_today', 'Wafers today'),
    QUEUE,
    row('lot_progress', 'Run progress'),
  ],
});

/** Sub-fab local scrubber (burn-wet abatement) */
export const scrubberParams = (prefix: string): TwinParamMap => ({
  [`${prefix}-PT-IN`]: 'inlet_press',
  [`${prefix}-FT-EXH`]: 'process_flow',
  [`${prefix}-TT-OUT`]: 'outlet_temp',
  [`${prefix}-TT-BRN`]: 'burner_temp',
  [`${prefix}-FT-W`]: 'water_flow',
  [`${prefix}-FT-FUEL`]: 'fuel_flow',
  [`${prefix}-AIT-PH`]: 'water_ph',
});

export const SCRUBBER_SCREENS: TwinScreenConfig = {
  hmi: [
    row('burner_temp', 'Burner'),
    row('process_flow', 'Exhaust flow'),
    row('water_ph', 'Water pH'),
    row('outlet_temp', 'Outlet'),
  ],
};

/** Sub-fab process chiller (coolant to the chamber walls / chucks) */
export const chillerParams = (prefix: string): TwinParamMap => ({
  [`${prefix}-TT-S`]: 'supply_temp',
  [`${prefix}-TT-R`]: 'return_temp',
  [`${prefix}-FT`]: 'coolant_flow',
  [`${prefix}-CMP`]: 'comp_current',
  [`${prefix}-LT`]: 'tank_level',
});

export const CHILLER_SCREENS_PCH: TwinScreenConfig = {
  hmi: [
    row('supply_temp', 'Supply'),
    row('return_temp', 'Return'),
    row('coolant_flow', 'Flow'),
    row('heat_load', 'Heat load'),
  ],
};

export const DRY_PUMP_SCREENS: TwinScreenConfig = {
  hmi: [
    { alias: 'inlet_press', label: 'Inlet pressure' },
    { alias: 'body_temp', label: 'Pump body' },
    { alias: 'n2_flow', label: 'N2 purge' },
    { alias: 'cooling_water_flow', label: 'Cooling water' },
  ],
  vfd: { alias: 'dp_current', label: 'Motor' },
};
