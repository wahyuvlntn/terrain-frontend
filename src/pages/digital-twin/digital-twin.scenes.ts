import {
  CDA_LOOP_PARAMS,
  CHILLER_PARAMS,
  CHILLER_SCREENS,
  CHILLER_SCREENS_PCH,
  CHW_LOOP_PARAMS,
  COMPRESSOR_MOTION,
  COMPRESSOR_SCREENS,
  CW_LOOP_PARAMS,
  chillerParams,
  compressorParams,
  DRY_PUMP_SCREENS,
  dryPumpParams,
  MAU_SCREENS,
  mauParams,
  PCW_LOOP_PARAMS,
  PUMP_MOTION,
  pumpParams,
  SCRUBBER_SCREENS,
  scrubberParams,
  TOWER_MOTION,
  TOWER_SCREENS,
  toolParams,
  toolScreens,
  toolVariant,
  towerParams,
} from './digital-twin.bindings';
import {
  FAB1_BAYS,
  FAB1_PUMPS,
  FAB1_SUPPORT,
  FAB1_TEMPLATES,
  FAB1_TOOLS,
  Fab1Unit,
} from './digital-twin.fab1-layout';
import { TwinScene, TwinSceneModel, TwinSpawn } from './digital-twin.types';

const MODEL_BASE = '/models/digital-twin';

/** Plant room layout (Blender metres, see build_plant_room.py): chiller CH-0n stands at y = CHILLER_Y[n] */
const CHILLER_Y = [0, 3.8, 7.6];
const PUMP_X = -6.9;
const CHWP_DY = -0.7;
const CWP_DY = 1.18;
/** CUB roof deck: the plant room slab soffit (z 6.0, where the risers end) plus a 0.3 m slab */
const ROOF_DECK_Z = 6.3;
/**
 * Cooling tower cells CT-01..03 on the roof deck (plant x / y): cell centres along x at y 5.0, so
 * their CW inlet / outlet flanges (cell-local x +1.40, y +4.30) meet the roof piping at y 9.3
 */
const TOWER_X = [-8.6, -4.3, 0.0];
const TOWER_Y = 5.0;
/**
 * PCW pump room (build_pcw_room.py): pumps PCWP-01..04 along the south wall (shaft along y, suction
 * north: the pump GLB is built with its shaft along +x, so it is turned -90 degrees), plate heat
 * exchangers HX-01..03 along the north wall (frame plate south face at y 1.5)
 */
const PCW_PUMP_X = [9.2, 10.9, 16.2, 17.9];
const PCW_PUMP_Y = -1.9;
const HX_X = [11.3, 13.6, 15.9];
const HX_Y = 1.5;
/** CDA compressor room (build_cda_room.py): compressor package centres, service fronts facing north */
const CDA_X = [11.9, 16.9];
const CDA_Y = 6.55;

/** FAB1 has its own building frame, east of CUB; L4 is three 4.2 m storeys above L1. */
const FAB1_X = 65;
const FAB1_L2_Z = 4.2;
const FAB1_L3_Z = 8.4;
const FAB1_DECK_Z = 12.6;
const MAU_X = [-11, 0, 11];

const num = (n: number) => String(n).padStart(2, '0');
/** Blender (x, y, z) -> three.js (x, z, -y) */
const at = (x: number, y: number): [number, number, number] => [x, 0, y === 0 ? 0 : -y];

/**
 * Walk-mode entry point on the floor at Blender plant x / y (scene frame), facing `bearing`:
 * compass degrees, clockwise from north (Blender +y): 0 north, 90 east, 180 south, 270 west
 */
const spawnAt = (x: number, y: number, bearing: number): TwinSpawn => ({
  position: at(x, y),
  // three.js yaw turns counter-clockwise seen from above; 0 looks toward -Z (north)
  yaw: bearing ? (-bearing * Math.PI) / 180 : 0,
});

/** One shared GLB per equipment type, placed and re-tagged for every unit */
const plantUnits = (): TwinSceneModel[] =>
  CHILLER_Y.flatMap((y, i): TwinSceneModel[] => {
    const n = num(i + 1);
    return [
      {
        key: `ch-${n}`,
        name: `Chiller CH-${n}`,
        url: `${MODEL_BASE}/chiller-wsc.glb`,
        position: at(0, y),
        retag: { 'CH-01': `CH-${n}` },
        asset: `CH_${n}`,
        params: CHILLER_PARAMS,
        screens: CHILLER_SCREENS,
      },
      {
        key: `chwp-${n}`,
        name: `CHW Pump CHWP-${n}`,
        url: `${MODEL_BASE}/pump-chwp.glb`,
        position: at(PUMP_X, y + CHWP_DY),
        retag: { 'CHWP-01': `CHWP-${n}` },
        asset: `CHWP_${n}`,
        params: pumpParams(`CHWP-${n}`, 7),
        motion: PUMP_MOTION,
      },
      {
        key: `cwp-${n}`,
        name: `CW Pump CWP-${n}`,
        url: `${MODEL_BASE}/pump-cwp.glb`,
        position: at(PUMP_X, y + CWP_DY),
        retag: { 'CWP-01': `CWP-${n}` },
        asset: `CWP_${n}`,
        params: pumpParams(`CWP-${n}`, 5),
        motion: PUMP_MOTION,
      },
    ];
  });

/** Cooling tower cells: one shared GLB (built for CT-01), re-tagged per cell */
const towerUnits = (): TwinSceneModel[] =>
  TOWER_X.map((x, i): TwinSceneModel => {
    const n = num(i + 1);
    return {
      key: `ct-${n}`,
      name: `Cooling Tower CT-${n}`,
      url: `${MODEL_BASE}/cooling-tower-s3e.glb`,
      position: at(x, TOWER_Y),
      retag: { 'CT-01': `CT-${n}` },
      asset: `CT_${n}`,
      params: towerParams(`CT-${n}`),
      screens: TOWER_SCREENS,
      motion: TOWER_MOTION,
    };
  });

/** PCW pumps (one shared GLB, re-tagged and turned per unit) and the plate heat exchangers */
const pcwUnits = (): TwinSceneModel[] => [
  ...PCW_PUMP_X.map((x, i): TwinSceneModel => {
    const n = num(i + 1);
    return {
      key: `pcwp-${n}`,
      name: `PCW Pump PCWP-${n}`,
      url: `${MODEL_BASE}/pump-pcw.glb`,
      position: at(x, PCW_PUMP_Y),
      rotationY: -90,
      retag: { 'PCWP-01': `PCWP-${n}` },
      asset: `PCWP_${n}`,
      params: pumpParams(`PCWP-${n}`, 10),
      motion: PUMP_MOTION,
    };
  }),
  // the exchangers have no DB equipment yet: drill-down only, no badge or dashboard
  ...HX_X.map(
    (x, i): TwinSceneModel => ({
      key: `hx-${num(i + 1)}`,
      name: `PCW Heat Exchanger HX-${num(i + 1)}`,
      url: `${MODEL_BASE}/phe-pcw.glb`,
      position: at(x, HX_Y),
      retag: { 'HX-01': `HX-${num(i + 1)}` },
    })
  ),
];

/** CDA compressors: one shared GLB, re-tagged per unit */
const compressorUnits = (): TwinSceneModel[] =>
  CDA_X.map((x, i): TwinSceneModel => {
    const n = num(i + 1);
    return {
      key: `cda-${n}`,
      name: `CDA Compressor CDA-${n}`,
      url: `${MODEL_BASE}/compressor-zr315.glb`,
      position: at(x, CDA_Y),
      retag: { 'CDA-01': `CDA-${n}` },
      asset: `CDA_${n}`,
      params: compressorParams(`CDA-${n}`),
      screens: COMPRESSOR_SCREENS,
      motion: COMPRESSOR_MOTION,
    };
  });

/**
 * Site context in the CUB plant frame, shown in a building's view without changing its framing: the
 * utility pipe bridge between the two buildings and the other building's massing
 */
const siteContext = (
  key: string,
  name: string,
  file: string,
  locationName: string
): TwinSceneModel => ({
  ...structure(key, name, file),
  bind: { locationName },
  context: true,
});

/** Building shell of a location (walls, floor slab, roof): context geometry, not equipment */
const structure = (key: string, name: string, file: string): TwinSceneModel => ({
  key,
  name,
  url: `${MODEL_BASE}/${file}`,
  position: [0, 0, 0],
  structure: true,
});

/** Six live MAUs, facing the service aisle on the north and south sides of L4. */
const mauUnits = (side: 'north' | 'south'): TwinSceneModel[] =>
  MAU_X.map((x, i) => {
    const n = num(i + (side === 'north' ? 1 : 4));
    return {
      key: `mau-${n}`,
      name: `Make-up Air Unit MAU-${n}`,
      url: `${MODEL_BASE}/fab1-mau.glb`,
      position: at(x, side === 'north' ? 7 : -7),
      rotationY: side === 'north' ? 0 : 180,
      retag: { 'MAU-01': `MAU-${n}` },
      asset: `MAU_${n}`,
      params: mauParams(`MAU-${n}`),
      screens: MAU_SCREENS,
    };
  });

/** FAB1 unit tag of a backend alias (ETCH_02 -> ETCH-02) */
const unitTag = (alias: string) => alias.replace('_', '-');

/** Display names of the FAB1 tools by alias prefix (a unit's own entry wins) */
const TOOL_NAME: Record<string, string> = {
  SCN_01: 'ArF Immersion Scanner',
  SCN_02: 'KrF Scanner',
  STP: 'i-line Stepper',
  TRK: 'Litho Track',
  ETCH_01: 'Conductor Etch',
  ETCH: 'Dielectric Etch',
  CVD: 'PECVD Tool',
  PVD: 'PVD Tool',
  RTP: 'RTP Tool',
  ASH: 'Plasma Asher',
  IMP_01: 'Medium Current Implanter',
  IMP_02: 'High Current Implanter',
  CMP_01: 'Oxide / W CMP',
  CMP: 'Cu CMP',
  ECP: 'Cu Plating',
  FRN_03: 'LPCVD Furnace',
  FRN: 'Oxidation Furnace',
  WET: 'Wet Bench',
  SWC: 'Single-Wafer Clean',
  MET: 'Optical Metrology',
  CDS: 'CD-SEM',
  OVL: 'Overlay Metrology',
  DEF: 'Defect Inspection',
  WAT: 'Parametric Tester',
};
const toolName = (alias: string) =>
  `${TOOL_NAME[alias] ?? TOOL_NAME[alias.split('_')[0]] ?? 'Process Tool'} ${unitTag(alias)}`;

/** A FAB1 unit of the generated layout: its template GLB placed, turned and re-tagged to the unit */
const fab1Unit = (u: Fab1Unit, name: string, extra: Partial<TwinSceneModel>): TwinSceneModel => {
  const t = FAB1_TEMPLATES[u.template];
  return {
    key: u.alias.toLowerCase().replace('_', '-'),
    name,
    url: `${MODEL_BASE}/${t.file}`,
    position: at(u.x, u.y),
    rotationY: u.rot,
    retag: { [t.tag]: unitTag(u.alias) },
    asset: u.alias,
    ...extra,
  };
};

/**
 * The process tools of an L2 bay, their load ports facing the bay's intrabay aisle. A vacuum tool's
 * foreline gauge reads the inlet pressure of the dry pump right under it in the sub-fab.
 */
const bayTools = (bay: string): TwinSceneModel[] =>
  FAB1_TOOLS.filter((u) => u.bay === bay).map((u) => {
    const variant = toolVariant(u.alias, u.template);
    const pump = FAB1_PUMPS.find((p) => p.tool === u.alias)?.alias;
    return fab1Unit(u, toolName(u.alias), {
      params: toolParams(variant, unitTag(u.alias), pump),
      screens: toolScreens(variant),
    });
  });

/** Sub-fab support units of a room: the dry pumps under their tools, scrubbers, process chillers */
const subFabUnits = (room: string): TwinSceneModel[] => [
  ...FAB1_PUMPS.filter((u) => u.room === room).map((u) =>
    fab1Unit(u, `Dry Vacuum Pump ${unitTag(u.alias)}`, {
      params: dryPumpParams(unitTag(u.alias)),
      screens: DRY_PUMP_SCREENS,
    })
  ),
  ...FAB1_SUPPORT.filter((u) => u.room === room).map((u) =>
    u.template === 'scrubber'
      ? fab1Unit(u, `Local Scrubber ${unitTag(u.alias)}`, {
          params: scrubberParams(unitTag(u.alias)),
          screens: SCRUBBER_SCREENS,
        })
      : fab1Unit(u, `Process Chiller ${unitTag(u.alias)}`, {
          params: chillerParams(unitTag(u.alias)),
          screens: CHILLER_SCREENS_PCH,
        })
  ),
];

/** One scene per L2 bay (backend location), in the L2 floor frame */
const bayScenes = (): TwinScene[] =>
  FAB1_BAYS.map((b) => {
    const north = b.side === 'N';
    const tools = FAB1_TOOLS.filter((u) => u.bay === b.key);
    return {
      id: `fab1-bay-${b.key}`,
      name: b.location,
      description: `${b.title} of the L2 cleanroom: ${tools.map((u) => toolName(u.alias)).join(', ')}, their load ports on the intrabay aisle under its overhead hoist transport spur.`,
      bind: { locationName: b.location },
      origin: [FAB1_X, FAB1_L2_Z, 0] as [number, number, number],
      models: bayTools(b.key),
      // at the bay's mouth on the interbay aisle, looking up the intrabay aisle
      spawn: spawnAt(b.cx, north ? 1.9 : -1.9, north ? 0 : 180),
    };
  });

/**
 * 3D scenes and the backend locations / equipment they represent. The location tree comes from
 * the locations API; a scene (or one of its models) is attached to the location matching `bind`
 * (`locationId` first, then the exact `locationName`). `asset` binds a model to an equipment
 * alias for live status and details, `params` binds its 3D instruments to parameters.
 * Anything that doesn't match a location is listed under "Unassigned 3D scenes".
 * `structure` models (room shells, roof) are context geometry of their location: they render with
 * every scope that contains it but are not equipment (not in the tree, not pickable).
 *
 * All scenes of the CUB share the plant room frame, so a building-level view shows every room in
 * place: a scene's `origin` puts it there (the roof scenes sit on the roof deck above the plant;
 * their GLBs are exported in the deck frame).
 *
 * `spawn` is where walk mode (first person) enters the scene's location, relative to its origin:
 * on a free floor spot just inside the room's door, facing in. A location without one uses the
 * spawn of a sub-location (see locationSpawn in digital-twin.navigation.ts).
 */
export const TWIN_SCENES: TwinScene[] = [
  {
    id: 'central-plant',
    name: 'Central chiller plant',
    description:
      'Chillers CH-01..03 (N+1) with their dedicated CHW and CW pumps, the chilled water loop (fab return riser -> pumps -> evaporators -> fab supply riser, bypass) and the condenser water loop (roof towers -> pumps -> condensers -> roof).',
    bind: { locationName: 'Chiller Plant Room' },
    models: [
      ...plantUnits(),
      {
        key: 'chwl-01',
        name: 'Chilled Water Loop CHWL-01',
        url: `${MODEL_BASE}/chw-loop.glb`,
        position: [0, 0, 0],
        // the loop's live points are the plant-level BMS points of the CHW system
        asset: 'CHWS_01',
        params: CHW_LOOP_PARAMS,
      },
      {
        key: 'cwl-01',
        name: 'Condenser Water Loop CWL-01',
        url: `${MODEL_BASE}/cw-loop.glb`,
        position: [0, 0, 0],
        params: CW_LOOP_PARAMS,
      },
      structure('room', 'Chiller Plant Room', 'room-chiller-plant.glb'),
    ],
    // in the open south aisle just inside the personnel double door (x -9.9 .. -8.1), clear of
    // its leaves' swing and of the pump row (CHWP-01 2 m to the north-west), looking north-east at
    // the chiller row: CH-01 4.6 m ahead, CH-02 / CH-03 behind it, nothing within 2.7 m in view
    spawn: spawnAt(-6.6, -3.3, 58),
  },
  {
    id: 'pcw-pump-room',
    name: 'PCW pump room',
    description:
      'Process cooling water pumps PCWP-01..04 (3 duty + 1 standby), plate heat exchangers HX-01..03 cooled by chilled water from the plant room, and the PCW loop (FAB1 return -> pumps -> exchangers -> FAB1 supply over the roof).',
    bind: { locationName: 'PCW Pump Room' },
    models: [
      ...pcwUnits(),
      {
        key: 'pcwl-01',
        name: 'PCW Loop PCWL-01',
        url: `${MODEL_BASE}/pcw-loop.glb`,
        position: [0, 0, 0],
        params: PCW_LOOP_PARAMS,
      },
      structure('room', 'PCW Pump Room', 'room-pcw-pump.glb'),
    ],
    // inside its south double door (x 13.1 .. 14.9), clear of the leaves' swing, between the
    // pump pairs, looking north up the aisle at the heat exchangers
    spawn: spawnAt(14.0, -2.6, 0),
  },
  {
    id: 'cda-compressor-room',
    name: 'CDA compressor room',
    description:
      'Oil-free screw compressors CDA-01 / CDA-02 with integrated drum dryers, the CDA header, air receiver, filters and the CDA main to FAB1, and the condenser water that cools the compressors.',
    bind: { locationName: 'CDA Compressor Room' },
    models: [
      ...compressorUnits(),
      {
        key: 'cdal-01',
        name: 'CDA Distribution CDAL-01',
        url: `${MODEL_BASE}/cda-loop.glb`,
        position: [0, 0, 0],
        params: CDA_LOOP_PARAMS,
      },
      structure('room', 'CDA Compressor Room', 'room-cda-compressor.glb'),
    ],
    // inside its north double door (x 13.1 .. 14.9), clear of the leaves' swing and of the
    // receiver, looking south at the compressors' cut-open service fronts
    spawn: spawnAt(14.0, 11.6, 180),
  },
  {
    id: 'cub-building',
    name: 'CUB building',
    description:
      'External roof access stair ST-01 on the east facade of the central utility building (foot pad at ground level, two flights to the roof deck).',
    bind: { locationName: 'CUB Central Utility Building' },
    // the stair renders only in the building scope, together with every room and the roof
    models: [structure('stair', 'Roof access stair', 'cub-access-stair.glb')],
    // on the forecourt 6 m south of the facade, looking north at the chiller plant room's double
    // door (x -9.9 .. -8.1) and roller shutter, with the towers above the roof
    spawn: spawnAt(-7.5, -10.5, 10),
  },
  {
    id: 'cub-roof',
    name: 'CUB roof',
    description: 'Roof slab, parapet and roof access stair of the central utility building.',
    bind: { locationName: 'CUB Roof' },
    // plant room frame raised to the roof deck: roof models stand on z = 0 in plant x / y
    origin: [0, ROOF_DECK_Z, 0],
    // where the access stair arrives: inside the safety gate of the east parapet (y 5.38 .. 6.68),
    // clear of the gate leaf's swing, looking west across the roof to the towers
    spawn: spawnAt(18.8, 6.03, 270),
    models: [
      {
        ...structure('roof', 'CUB Roof', 'cub-roof.glb'),
        // bound one level down so the tower yard view also stands on the deck; the CUB Roof and
        // building views still include it (a scope shows the structures of its whole subtree)
        bind: { locationName: 'Cooling Tower Yard' },
      },
    ],
  },
  {
    id: 'cooling-tower-yard',
    name: 'Cooling tower yard',
    description:
      'Crossflow cooling towers CT-01..03 (BAC S3E-1424) on the CUB roof and the roof condenser water piping CWR-01 (return header -> tower inlets, tower outlets -> supply header -> plant risers).',
    bind: { locationName: 'Cooling Tower Yard' },
    // plant room frame raised to the roof deck: roof models stand on z = 0 in plant x / y
    origin: [0, ROOF_DECK_Z, 0],
    // on the deck south-east of the tower row, looking west-north-west along the walkway pads
    // past the cells' control panels: CT-03 3.6 m ahead on the right, CT-02 / CT-01 beyond
    spawn: spawnAt(4.5, -2.8, 300),
    models: [
      ...towerUnits(),
      {
        key: 'cwr-01',
        name: 'Roof CW piping CWR-01',
        url: `${MODEL_BASE}/roof-piping.glb`,
        position: [0, 0, 0],
      },
    ],
  },
  {
    id: 'fab1-building',
    name: 'FAB1 Wafer Fab',
    description:
      'Wafer fab building: L1 sub-fab with the dry pumps, scrubbers and process chillers under their tools, L2 bay-and-aisle cleanroom with 31 process tools and overhead wafer transport, L3 FFU deck and utility plenum, L4 MAU deck, and the west support annex with the concrete stair core, lift, lobby and gowning room.',
    bind: { locationName: 'FAB1 Wafer Fab' },
    origin: [FAB1_X, 0, 0],
    models: [
      structure('building', 'FAB1 building, support annex and stair core', 'fab1-building.glb'),
      {
        ...structure('plenum', 'L3 FFU deck and utility plenum', 'fab1-plenum-l3.glb'),
        position: [0, FAB1_L3_Z, 0],
      },
    ],
    // on the forecourt in front of the main entrance of the support annex, looking north
    spawn: spawnAt(-21.25, -15, 0),
  },
  {
    id: 'fab1-subfab',
    name: 'FAB1 L1 Sub-Fab',
    description:
      'L1 process support floor: the east-west access corridor between Sub-Fab North and South, open to the annex hall and the stair core.',
    bind: { locationName: 'FAB1 L1 Sub-Fab' },
    origin: [FAB1_X, 0, 0],
    models: [structure('corridor', 'L1 sub-fab access corridor', 'fab1-corridor-l1.glb')],
    spawn: spawnAt(-15, 0, 90),
  },
  {
    id: 'fab1-subfab-north',
    name: 'Sub-Fab North',
    description:
      "Under the etch, thin film, photo and wet / metrology bays: dry pumps DP-01..05 / DP-07 under their etch, CVD and PVD tools, scrubbers SCR-01 / SCR-02, process chillers PCH-01 / PCH-02, the scanners' excimer lasers, process gas cabinets, bulk chemical distribution and the PCW, N2, CDA and acid exhaust mains.",
    bind: { locationName: 'Sub-Fab North' },
    origin: [FAB1_X, 0, 0],
    models: [
      ...subFabUnits('Sub-Fab North'),
      structure('room', 'Sub-Fab North', 'fab1-room-subfab-north.glb'),
      structure('services', 'Sub-fab north process support services', 'fab1-services-north.glb'),
    ],
    // inside the corridor door, between the etch and CVD pump rows, looking north at the gas cabinets
    spawn: spawnAt(0, 2.6, 0),
  },
  {
    id: 'fab1-subfab-south',
    name: 'Sub-Fab South',
    description:
      'Under the diffusion and implant / CMP bays: dry pumps DP-06 / DP-08..10 under the LPCVD furnace, the implanters and the asher, scrubber SCR-03, process chiller PCH-03, CMP slurry dispense, ECP bath make-up and the mains.',
    bind: { locationName: 'Sub-Fab South' },
    origin: [FAB1_X, 0, 0],
    models: [
      ...subFabUnits('Sub-Fab South'),
      structure('room', 'Sub-Fab South', 'fab1-room-subfab-south.glb'),
      structure('services', 'Sub-fab south process support services', 'fab1-services-south.glb'),
    ],
    spawn: spawnAt(-2, -2.4, 180),
  },
  {
    id: 'fab1-cleanroom',
    name: 'FAB1 L2 Cleanroom',
    description:
      'L2 bay-and-aisle cleanroom: one-way overhead hoist transport (OHT) network - the interbay loop and a spur through every bay - whose ten vehicles carry the simulated lots between load ports and the three FOUP stockers, the reticle stocker, the air shower from the gowning room and the fan filter unit ceiling.',
    bind: { locationName: 'FAB1 L2 Cleanroom' },
    origin: [FAB1_X, FAB1_L2_Z, 0],
    models: [
      {
        ...structure('cleanroom', 'L2 cleanroom', 'fab1-cleanroom-l2.glb'),
        // the shell, ceiling and wafer transport also frame each bay's own view
        enclosing: true,
      },
    ],
    // just through the air shower, looking east along the interbay aisle
    spawn: spawnAt(-14.8, -8.8, 45),
  },
  ...bayScenes(),
  {
    id: 'fab1-mechanical-deck',
    name: 'FAB1 L4 Mechanical Deck',
    description:
      'L4 cleanroom make-up air floor: the north and south MAU rooms with filter, coil, fan and supply-air distribution.',
    bind: { locationName: 'FAB1 L4 Mechanical Deck' },
    origin: [FAB1_X, FAB1_DECK_Z, 0],
    models: [structure('corridor', 'L4 mechanical deck access corridor', 'fab1-corridor-l4.glb')],
    spawn: spawnAt(0, 0, 0),
  },
  {
    id: 'fab1-mau-north',
    name: 'MAU Plant Room North',
    description:
      'Cleanroom make-up air units MAU-01..03 with outdoor-air intake, CHW cooling and supply-air distribution.',
    bind: { locationName: 'MAU Plant Room North' },
    origin: [FAB1_X, FAB1_DECK_Z, 0],
    models: [
      ...mauUnits('north'),
      structure('room', 'North MAU plant room', 'fab1-room-mau-north.glb'),
      structure('hvac', 'North make-up air distribution', 'fab1-hvac-north.glb'),
    ],
    spawn: spawnAt(-11, 2.5, 0),
  },
  {
    id: 'fab1-mau-south',
    name: 'MAU Plant Room South',
    description:
      'Cleanroom make-up air units MAU-04..06 with outdoor-air intake, CHW cooling and supply-air distribution.',
    bind: { locationName: 'MAU Plant Room South' },
    origin: [FAB1_X, FAB1_DECK_Z, 0],
    models: [
      ...mauUnits('south'),
      structure('room', 'South MAU plant room', 'fab1-room-mau-south.glb'),
      structure('hvac', 'South make-up air distribution', 'fab1-hvac-south.glb'),
    ],
    spawn: spawnAt(-11, -2.5, 180),
  },
  {
    id: 'site-utility-link',
    name: 'CUB to FAB1 utility link',
    description:
      'Pipe bridge carrying chilled water, process cooling water and clean dry air from the CUB roof stubs to the FAB1 L3 utility entries, with the neighbouring building as context in each building view.',
    // plant frame (the FAB1 assets of this scene are exported in it too); no own location
    models: [
      siteContext(
        'bridge-cub',
        'Utility pipe bridge to FAB1',
        'fab1-site-utility-bridge.glb',
        'CUB Central Utility Building'
      ),
      siteContext(
        'fab1-context',
        'FAB1 Wafer Fab (context)',
        'fab1-site-fab1-massing.glb',
        'CUB Central Utility Building'
      ),
      siteContext(
        'bridge-fab1',
        'Utility pipe bridge from the CUB',
        'fab1-site-utility-bridge.glb',
        'FAB1 Wafer Fab'
      ),
      siteContext(
        'cub-context',
        'Central utility building (context)',
        'fab1-site-cub-massing.glb',
        'FAB1 Wafer Fab'
      ),
    ],
  },
];
