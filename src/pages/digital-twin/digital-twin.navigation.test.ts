import { describe, expect, it, vi } from 'vitest';

import type { LocationType } from '../location-overview/api/location-overview.api';
import { TWIN_NODE_OF_ASSET } from './digital-twin.bms';
import {
  consumeTwinNav,
  findInstrument,
  inScope,
  leadsInto3D,
  locationSpawn,
  readTwinNav,
  resolveAssetTarget,
  resolveTwinNav,
  TwinNavContext,
  TwinNavPlan,
  twinLocationsWithScene,
} from './digital-twin.navigation';
import { TWIN_SCENES } from './digital-twin.scenes';
import { buildTwinTree, flattenLocations } from './digital-twin.tree';
import type { TwinNode } from './digital-twin.types';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock('@digital-twin/components', () => import('./testing/digital-twin-components.mock'));
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

/** the demo plant's locations (simulator seed), as the locations API lists them */
const LOCATIONS: [number, string, number | null][] = [
  [1, 'FAB1 Wafer Fab', null],
  [2, 'FAB1 L1 Sub-Fab', 1],
  [3, 'Sub-Fab North', 2],
  [4, 'Sub-Fab South', 2],
  [15, 'FAB1 L2 Cleanroom', 1],
  [16, 'Photo Bay', 15],
  [17, 'Etch & Thin Film Bay', 15],
  [18, 'Wet & Metrology Bay', 15],
  [19, 'Diffusion Bay', 15],
  [20, 'Implant & CMP Bay', 15],
  [5, 'FAB1 L4 Mechanical Deck', 1],
  [6, 'MAU Plant Room North', 5],
  [7, 'MAU Plant Room South', 5],
  [8, 'CUB Central Utility Building', null],
  [9, 'CUB L1 Utility Floor', 8],
  [10, 'Chiller Plant Room', 9],
  [11, 'PCW Pump Room', 9],
  [12, 'CDA Compressor Room', 9],
  [13, 'CUB Roof', 8],
  [14, 'Cooling Tower Yard', 13],
];

const depth = (id: number): number => {
  const parent = LOCATIONS.find(([i]) => i === id)?.[2];
  return parent ? depth(parent) + 1 : 0;
};

const rows: LocationType[] = LOCATIONS.map(([locationId, locationName, parentId]) => ({
  locationId,
  locationName,
  parentId,
  availabilityTh: 0,
  performanceTh: 0,
  qualityTh: 0,
  locationImagePath: '',
  hierarchy: depth(locationId),
}));

const tree = buildTwinTree(rows, TWIN_SCENES);
const locations = flattenLocations(tree);

const ASSETS = [
  { alias: 'CH_02', locationId: 10 },
  { alias: 'CT_01', locationId: 14 },
  { alias: 'PCWP_01', locationId: 11 },
  // fictional: an unmodelled unit in a room that has a 3D scene (every real CUB unit is modelled)
  { alias: 'PCWF_01', locationId: 11 },
  { alias: 'MAU_01', locationId: 6 },
  { alias: 'UNMODELED_01', locationId: 999 },
];

const ctx = (over: Partial<TwinNavContext> = {}): TwinNavContext => ({
  locations,
  nodeOfAsset: TWIN_NODE_OF_ASSET,
  assets: ASSETS,
  scopeId: 'loc-10',
  walking: false,
  ...over,
});

const plan = (p: TwinNavPlan | 'wait') => {
  if (p === 'wait') throw new Error('unexpected wait');
  return p;
};

describe('twin URL targets', () => {
  it('reads asset, param, location, panel and view; null without a target', () => {
    expect(readTwinNav(new URLSearchParams('node=loc-10&view=walk'))).toBeNull();
    expect(
      readTwinNav(new URLSearchParams('asset=CT_01&param=fan_speed&view=walk&panel=plant-overview'))
    ).toEqual({
      asset: 'CT_01',
      param: 'fan_speed',
      location: undefined,
      overview: true,
      walk: true,
    });
    expect(readTwinNav(new URLSearchParams('location=%20cub%20roof%20&view=orbit'))).toMatchObject({
      location: 'cub roof',
      walk: false,
      overview: false,
    });
  });

  it('removes the target and sets node; view and other parameters stay', () => {
    const next = consumeTwinNav(
      new URLSearchParams(
        'asset=CT_01&param=fan_speed&location=x&panel=plant-overview&view=walk&replay=3'
      ),
      'loc-14'
    );
    expect(Object.fromEntries(next)).toEqual({ view: 'walk', replay: '3', node: 'loc-14' });
  });
});

describe('scene spawns', () => {
  it('attach to the scene location, moved by the scene origin', () => {
    const yard = locations.get('loc-14')?.node;
    expect(yard?.spawn?.position).toEqual([4.5, 6.3, 2.8]);
    expect(yard?.spawn?.yaw).toBeCloseTo((-300 * Math.PI) / 180);
    const plant = locations.get('loc-10')?.node.spawn;
    expect(plant?.position).toEqual([-6.6, 0, 3.3]);
    // bearing 58° (north-east): three.js yaw turns the other way
    expect(plant?.yaw).toBeCloseTo((-58 * Math.PI) / 180);
    // the building scene holds the stair (a structure of the building) and the outside spawn; the
    // pipe bridge to FAB1 and the FAB1 massing come along as site context (not framed)
    const building = locations.get('loc-8')?.node;
    expect(building?.structures?.map((s) => [s.id, !!s.model?.context])).toEqual([
      ['cub-building/stair', false],
      ['site-utility-link/bridge-cub', true],
      ['site-utility-link/fab1-context', true],
    ]);
    expect(building?.spawn?.position).toEqual([-7.5, 0, 10.5]);
  });

  it('a location without its own enters through a sub-location with equipment', () => {
    // CUB L1: the chiller plant room (the most equipment), not the alphabetically first CDA room
    const floor = locations.get('loc-9')?.node;
    expect(floor && locationSpawn(floor)).toEqual(locations.get('loc-10')?.node.spawn);
    const fab = locations.get('loc-1')?.node;
    // the building's own spawn: in front of the annex main entrance
    expect(fab && locationSpawn(fab)?.position).toEqual([43.75, 0, 15]);
  });

  it('teleport menu lists the locations with something to render', () => {
    expect(twinLocationsWithScene(tree).map(({ node, depth: d }) => `${d}:${node.name}`)).toEqual([
      '0:CUB Central Utility Building',
      '1:CUB L1 Utility Floor',
      '2:CDA Compressor Room',
      '2:Chiller Plant Room',
      '2:PCW Pump Room',
      '1:CUB Roof',
      '2:Cooling Tower Yard',
      '0:FAB1 Wafer Fab',
      '1:FAB1 L1 Sub-Fab',
      '2:Sub-Fab North',
      '2:Sub-Fab South',
      '1:FAB1 L2 Cleanroom',
      '2:Diffusion Bay',
      '2:Etch & Thin Film Bay',
      '2:Implant & CMP Bay',
      '2:Photo Bay',
      '2:Wet & Metrology Bay',
      '1:FAB1 L4 Mechanical Deck',
      '2:MAU Plant Room North',
      '2:MAU Plant Room South',
    ]);
  });
});

describe('resolveTwinNav', () => {
  it('equipment outside the rendered scope switches to the location of its scene', () => {
    const p = plan(resolveTwinNav({ asset: 'ct_01', param: 'fan_speed', walk: true }, ctx()));
    expect(p).toMatchObject({
      scopeId: 'loc-14',
      select: 'cooling-tower-yard/ct-01',
      param: 'fan_speed',
      asset: 'CT_01',
      walk: 'enter',
      spot: { kind: 'equipment', nodeId: 'cooling-tower-yard/ct-01' },
      note: null,
    });
  });

  it('equipment inside the rendered scope keeps the scope', () => {
    const p = plan(resolveTwinNav({ asset: 'CH_02' }, ctx({ scopeId: 'loc-8' })));
    expect(p.scopeId).toBe('loc-8');
    expect(p.select).toBe('central-plant/ch-02');
    expect(p.walk).toBeNull();
    expect(inScope('central-plant/ch-02', 'loc-8', locations)).toBe(true);
    expect(inScope('central-plant/ch-02', 'loc-14', locations)).toBe(false);
  });

  it('equipment without a 3D model: its location when that has a scene, else stay; with a note', () => {
    const pcw = plan(resolveTwinNav({ asset: 'PCWF_01', walk: true }, ctx()));
    expect(pcw).toMatchObject({
      scopeId: 'loc-11',
      select: null,
      spot: { kind: 'location', locationId: 'loc-11' },
      note: 'PCWF_01 is not modelled in 3D yet',
    });
    const unmodelled = plan(resolveTwinNav({ asset: 'UNMODELED_01' }, ctx()));
    expect(unmodelled).toMatchObject({
      scopeId: 'loc-10',
      select: null,
      note: 'UNMODELED_01 is not modelled in 3D yet',
    });
    expect(plan(resolveTwinNav({ asset: 'XYZ_9' }, ctx())).note).toBe('XYZ_9 was not found');
  });

  it('equipment with nowhere to go in 3D leaves a walking player where they stand', () => {
    // A target with no scene must not move a walking player back to the entry point.
    expect(
      plan(resolveTwinNav({ asset: 'UNMODELED_01', walk: true }, ctx({ walking: true })))
    ).toEqual({
      scopeId: 'loc-10',
      select: null,
      param: null,
      asset: null,
      overview: false,
      walk: null,
      spot: { kind: 'scope' },
      note: 'UNMODELED_01 is not modelled in 3D yet',
    });
    expect(
      plan(resolveTwinNav({ asset: 'XYZ_9', walk: true }, ctx({ walking: true }))).walk
    ).toBeNull();
    // not walking yet: view=walk still enters walk mode, at the scope's entry point
    expect(plan(resolveTwinNav({ asset: 'UNMODELED_01', walk: true }, ctx()))).toMatchObject({
      walk: 'enter',
      spot: { kind: 'scope' },
    });
    // the room of an unmodelled unit is somewhere to go: the walking player is moved there
    expect(
      plan(resolveTwinNav({ asset: 'PCWF_01', walk: true }, ctx({ walking: true })))
    ).toMatchObject({ walk: 'enter', spot: { kind: 'location', locationId: 'loc-11' } });
    expect(leadsInto3D(resolveAssetTarget('UNMODELED_01', ctx()))).toBe(false);
    expect(leadsInto3D(resolveAssetTarget('PCWF_01', ctx()))).toBe(true);
    expect(leadsInto3D(resolveAssetTarget('CT_01', ctx()))).toBe(true);
    expect(leadsInto3D(resolveAssetTarget('UNMODELED_01', ctx({ assets: undefined })))).toBe(false);
  });

  it('waits for the equipment list only when the alias has no 3D model', () => {
    expect(resolveTwinNav({ asset: 'PCWF_01' }, ctx({ assets: undefined }))).toBe('wait');
    expect(plan(resolveTwinNav({ asset: 'CT_02' }, ctx({ assets: undefined }))).select).toBe(
      'cooling-tower-yard/ct-02'
    );
    expect(resolveAssetTarget('MAU_01', ctx({ assets: undefined }))).toEqual({
      kind: 'equipment',
      alias: 'MAU_01',
      nodeId: 'fab1-mau-north/mau-01',
    });
    expect(resolveAssetTarget('pcwf_01', ctx())).toMatchObject({
      kind: 'location',
      alias: 'PCWF_01',
      locationId: 'loc-11',
    });
    // the PCW pumps and CDA compressors are modelled: their own 3D units, no list needed
    expect(resolveAssetTarget('pcwp_01', ctx({ assets: undefined }))).toEqual({
      kind: 'equipment',
      alias: 'PCWP_01',
      nodeId: 'pcw-pump-room/pcwp-01',
    });
    expect(plan(resolveTwinNav({ asset: 'CDA_02', param: 'dew_point' }, ctx()))).toMatchObject({
      scopeId: 'loc-12',
      select: 'cda-compressor-room/cda-02',
      param: 'dew_point',
      asset: 'CDA_02',
      note: null,
    });
  });

  it('location by name (trimmed, case-insensitive) becomes the scope; unknown names leave a note', () => {
    const p = plan(resolveTwinNav({ location: '  cooling tower YARD ', walk: true }, ctx()));
    expect(p).toMatchObject({
      scopeId: 'loc-14',
      walk: 'enter',
      spot: { kind: 'location', locationId: 'loc-14' },
    });
    expect(plan(resolveTwinNav({ location: 'Nowhere' }, ctx())).note).toBe(
      'Location "Nowhere" was not found'
    );
  });

  it('teleport to a location inside the scope keeps the scope (keepScope)', () => {
    const p = plan(
      resolveTwinNav(
        { locationId: 'loc-14', keepScope: true, walk: true },
        ctx({ scopeId: 'loc-8' })
      )
    );
    expect(p.scopeId).toBe('loc-8');
    expect(p.spot).toEqual({ kind: 'location', locationId: 'loc-14' });
    // outside it, the location becomes the scope
    expect(
      plan(resolveTwinNav({ locationId: 'loc-14', keepScope: true, walk: true }, ctx())).scopeId
    ).toBe('loc-14');
  });

  it('walk: view=walk enters at the scope, no view leaves only while walking; panel opens the overview', () => {
    expect(plan(resolveTwinNav({ walk: true }, ctx()))).toMatchObject({
      walk: 'enter',
      spot: { kind: 'scope' },
      scopeId: 'loc-10',
    });
    expect(
      plan(resolveTwinNav({ walk: false, overview: true }, ctx({ walking: true })))
    ).toMatchObject({ walk: 'exit', overview: true });
    expect(plan(resolveTwinNav({ walk: false }, ctx())).walk).toBeNull();
    // the overview (or an unknown place) with view=walk while walking: the player stays put
    expect(
      plan(resolveTwinNav({ walk: true, overview: true }, ctx({ walking: true })))
    ).toMatchObject({ walk: null, overview: true, spot: { kind: 'scope' } });
    expect(
      plan(resolveTwinNav({ location: 'Nowhere', walk: true }, ctx({ walking: true }))).walk
    ).toBeNull();
  });

  it('param is ignored without equipment to select', () => {
    expect(
      plan(resolveTwinNav({ asset: 'CT_01', param: 'cwst', select: false }, ctx()))
    ).toMatchObject({ select: null, param: null });
  });
});

describe('findInstrument', () => {
  const part = (id: string, tag: string): TwinNode => ({
    id,
    name: tag,
    kind: 'part',
    props: { dt_tag: tag },
    children: [],
  });
  const eq = (id: string, parts: TwinNode[]): TwinNode => ({
    id,
    name: id,
    kind: 'equipment',
    props: {},
    children: [{ id: `${id}/g`, name: 'g', kind: 'group', props: {}, children: parts }],
  });
  const loaded = [
    eq('central-plant/chwp-01', [part('p-te', 'TE-701'), part('p-c', 'CHWP-01-C')]),
    eq('central-plant/chwl-01', [part('l-ft', 'FT-811'), part('l-tt', 'TT-801')]),
  ];

  it('finds the instrument on the equipment itself', () => {
    expect(
      findInstrument(loaded, locations, 'central-plant/chwp-01', 'CHWP_01', 'bearing_temp')
    ).toBe('p-te');
  });

  it('falls back to a model binding ALIAS:param (a pump flow on the loop flowmeter)', () => {
    expect(findInstrument(loaded, locations, 'central-plant/chwp-01', 'CHWP_01', 'flow')).toBe(
      'l-ft'
    );
  });

  it('null when nothing loaded is bound to it', () => {
    expect(
      findInstrument(loaded, locations, 'central-plant/chwp-01', 'CHWP_01', 'spec_energy')
    ).toBeNull();
  });
});
