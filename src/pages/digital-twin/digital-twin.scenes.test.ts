import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { LocationType } from '../location-overview/api/location-overview.api';
import {
  FAB1_AMHS,
  FAB1_BAYS,
  FAB1_PUMPS,
  FAB1_SUPPORT,
  FAB1_TEMPLATES,
  FAB1_TOOLS,
} from './digital-twin.fab1-layout';
import { findInstrument, locationSpawn, resolveTwinNav } from './digital-twin.navigation';
import { TWIN_SCENES } from './digital-twin.scenes';
import {
  buildTwinTree,
  collectModels,
  collectStructures,
  enclosingStructures,
  flattenLocations,
  UNASSIGNED_ID,
} from './digital-twin.tree';
import type { TwinNode } from './digital-twin.types';
import { fab1ScreenDefinitions } from './viewer/twin-screens';

/** IDs deliberately differ from the demo DB: names, never fixed numeric IDs, attach the models. */
const LOCATIONS: [number, string, number | null, number][] = [
  [101, 'FAB1 Wafer Fab', null, 0],
  [102, 'FAB1 L1 Sub-Fab', 101, 1],
  [103, 'Sub-Fab North', 102, 2],
  [104, 'Sub-Fab South', 102, 2],
  [105, 'FAB1 L4 Mechanical Deck', 101, 1],
  [106, 'MAU Plant Room North', 105, 2],
  [107, 'MAU Plant Room South', 105, 2],
  [108, 'FAB1 L2 Cleanroom', 101, 1],
  [109, 'Photo Bay', 108, 2],
  [110, 'Etch & Thin Film Bay', 108, 2],
  [111, 'Wet & Metrology Bay', 108, 2],
  [112, 'Diffusion Bay', 108, 2],
  [113, 'Implant & CMP Bay', 108, 2],
];
const rows: LocationType[] = LOCATIONS.map(([locationId, locationName, parentId, hierarchy]) => ({
  locationId,
  locationName,
  parentId,
  hierarchy,
  availabilityTh: 0,
  performanceTh: 0,
  qualityTh: 0,
  locationImagePath: '',
}));
const scenes = TWIN_SCENES.filter((s) => s.id.startsWith('fab1-'));
const tree = buildTwinTree(rows, scenes);
const locations = flattenLocations(tree);
const building = locations.get('loc-101')!.node;
const idOf = (name: string) => `loc-${LOCATIONS.find((l) => l[1] === name)![0]}`;
const MAUS = ['MAU_01', 'MAU_02', 'MAU_03', 'MAU_04', 'MAU_05', 'MAU_06'];
const inventory = [
  ...MAUS,
  ...FAB1_PUMPS.map((u) => u.alias),
  ...FAB1_SUPPORT.map((u) => u.alias),
  ...FAB1_TOOLS.map((u) => u.alias),
];
const models = collectModels(building);
const nodeOfAsset = new Map(models.map((m) => [m.asset!, m.id]));
const childAssets = (name: string) => locations.get(idOf(name))?.node.children?.map((m) => m.asset);

/** Read the glTF JSON chunk without loading geometry, so instrument names are checked at source. */
const glbNodes = (url: string): { name?: string; extras?: Record<string, unknown> }[] => {
  const data = readFileSync(resolve('public', url.replace(/^\//, '')));
  expect(data.subarray(0, 4).toString()).toBe('glTF');
  expect(data.readUInt32LE(16)).toBe(0x4e4f534a);
  return JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString('utf8')).nodes;
};

describe('FAB1 digital twin inventory and placement', () => {
  it('attaches all 53 real assets exactly once to their named locations with no fixed DB IDs', () => {
    expect(tree.map((n) => n.id)).toEqual(['loc-101']);
    expect(tree.find((n) => n.id === UNASSIGNED_ID)).toBeUndefined();
    expect(inventory).toHaveLength(53);
    expect(models.map((m) => m.asset).sort()).toEqual([...inventory].sort());
    expect(new Set(models.map((m) => m.id)).size).toBe(53);
    expect(scenes.map((s) => s.bind?.locationName).sort()).toEqual(
      LOCATIONS.map((l) => l[1]).sort()
    );
    expect(scenes.every((s) => s.bind?.locationId === undefined)).toBe(true);
    expect(childAssets('MAU Plant Room North')).toEqual(['MAU_01', 'MAU_02', 'MAU_03']);
    expect(childAssets('MAU Plant Room South')).toEqual(['MAU_04', 'MAU_05', 'MAU_06']);
    // the backend's sub-fab rooms of the support units
    expect(childAssets('Sub-Fab North')).toEqual([
      'DP_01',
      'DP_02',
      'DP_03',
      'DP_04',
      'DP_05',
      'DP_07',
      'SCR_01',
      'PCH_01',
      'SCR_02',
      'PCH_02',
    ]);
    expect(childAssets('Sub-Fab South')).toEqual([
      'DP_06',
      'DP_08',
      'DP_09',
      'DP_10',
      'SCR_03',
      'PCH_03',
    ]);
    expect(childAssets('Photo Bay')).toEqual([
      'TRK_01',
      'SCN_01',
      'TRK_02',
      'SCN_02',
      'TRK_03',
      'STP_01',
    ]);
    expect(childAssets('Etch & Thin Film Bay')).toHaveLength(6);
    expect(childAssets('Wet & Metrology Bay')).toHaveLength(8);
    expect(childAssets('Diffusion Bay')).toHaveLength(5);
    expect(childAssets('Implant & CMP Bay')).toHaveLength(6);
  });

  it('keeps L1, L2 and L4 in one FAB1 frame, distinct from the CUB plant frame', () => {
    const position = (alias: string) => models.find((m) => m.asset === alias)?.model?.position;
    expect(position('MAU_01')).toEqual([54, 12.6, -7]);
    expect(position('MAU_06')).toEqual([76, 12.6, 7]);
    expect(
      models
        .filter((m) => m.asset?.startsWith('MAU_0') && Number(m.asset.slice(-1)) >= 4)
        .every((m) => m.model?.rotationY === 180)
    ).toBe(true);
    for (const u of FAB1_TOOLS) {
      expect(position(u.alias)).toEqual([65 + u.x, 4.2, u.y === 0 ? 0 : -u.y]);
      expect(models.find((m) => m.asset === u.alias)?.model?.rotationY).toBe(u.rot);
    }
    for (const u of [...FAB1_PUMPS, ...FAB1_SUPPORT])
      expect(position(u.alias)).toEqual([65 + u.x, 0, -u.y]);
    // every dry pump serves a tool of the layout, in the sub-fab room under it
    for (const p of FAB1_PUMPS) {
      const tool = FAB1_TOOLS.find((t) => t.alias === p.tool)!;
      expect(tool).toBeDefined();
      expect(p.room).toBe(tool.y > 0 ? 'Sub-Fab North' : 'Sub-Fab South');
      expect(Math.abs(p.y - tool.y)).toBeLessThan(0.5);
    }
    expect(TWIN_SCENES.find((s) => s.id === 'central-plant')?.origin).toBeUndefined();
    expect(TWIN_SCENES.find((s) => s.id === 'cooling-tower-yard')?.origin).toEqual([0, 6.3, 0]);
  });

  it('renders the building, rooms, services and corridors as context with no fabricated assets', () => {
    const context = collectStructures(building);
    expect(context).toHaveLength(13);
    const byUrl = (file: string) =>
      context.find((m) => m.model?.url.endsWith(file))?.model?.position;
    expect(byUrl('fab1-cleanroom-l2.glb')).toEqual([65, 4.2, 0]);
    expect(byUrl('fab1-plenum-l3.glb')).toEqual([65, 8.4, 0]);
    expect(byUrl('fab1-room-subfab-north.glb')).toEqual([65, 0, 0]);
    expect(context.every((m) => m.type === 'structure' && !m.asset && !m.params)).toBe(true);
    expect(locations.get('loc-102')?.node.structures?.[0].model?.url).toBe(
      '/models/digital-twin/fab1-corridor-l1.glb'
    );
    expect(locations.get('loc-105')?.node.structures?.[0].model?.position).toEqual([65, 12.6, 0]);
    // the main entrance of the support annex
    expect(locationSpawn(building)?.position).toEqual([43.75, 0, 15]);
    expect(locations.get('loc-102')?.node.spawn?.position).toEqual([50, 0, 0]);
    expect(locations.get('loc-105')?.node.spawn?.position).toEqual([65, 12.6, 0]);
    expect(locations.get('loc-106')?.node.spawn?.position).toEqual([54, 12.6, -2.5]);
    expect(locations.get('loc-107')?.node.spawn?.yaw).toBeCloseTo(-Math.PI);
  });

  it('frames every bay with the cleanroom it stands in', () => {
    for (const b of FAB1_BAYS) {
      const id = idOf(b.location);
      expect(locations.get(id)?.node.structures ?? []).toHaveLength(0);
      expect(enclosingStructures(id, locations).map((s) => s.model?.url)).toEqual([
        '/models/digital-twin/fab1-cleanroom-l2.glb',
      ]);
      // the walk spawn is the bay's mouth on the interbay aisle (L2 floor)
      expect(locations.get(id)?.node.spawn?.position[1]).toBe(4.2);
    }
    expect(enclosingStructures('loc-103', locations)).toHaveLength(0);
  });

  it.each(inventory)('routes %s directly to its own FAB1 model from a CUB scope', (alias) => {
    const plan = resolveTwinNav(
      { asset: alias, walk: true },
      {
        locations,
        nodeOfAsset,
        assets: undefined,
        scopeId: 'loc-10',
        walking: false,
      }
    );
    expect(plan).toMatchObject({
      select: nodeOfAsset.get(alias),
      asset: alias,
      walk: 'enter',
      note: null,
    });
    expect(plan !== 'wait' && plan.scopeId).toBe(locations.get(nodeOfAsset.get(alias)!)?.parentId);
  });
});

describe('FAB1 process tools', () => {
  const tools = models.filter((m) => FAB1_TOOLS.some((u) => u.alias === m.asset));

  it('binds every tool to its backend record, re-tags its template and its instruments', () => {
    expect(tools).toHaveLength(31);
    for (const tool of tools) {
      const unit = tool.asset!.replace('_', '-');
      const [source, target] = Object.entries(tool.model!.retag!)[0];
      expect(target).toBe(unit);
      const nodes = glbNodes(tool.model!.url);
      const tags = new Set(nodes.map((n) => n.extras?.dt_tag));
      expect(tags.has(source)).toBe(true);
      // every bound instrument exists in the GLB under the template tag
      const params = Object.keys(tool.params ?? {});
      expect(params.length).toBeGreaterThan(1);
      for (const tag of params) {
        expect(tag.startsWith(`${unit}-`)).toBe(true);
        expect(tags.has(tag.replace(unit, source))).toBe(true);
      }
      // the controller face and the signal tower
      expect(nodes.filter((n) => n.name === 'TOOL_HMI_Screen')).toHaveLength(1);
      expect(nodes.filter((n) => n.extras?.dt_signal)).toHaveLength(1);
      expect(tool.screens?.hmi).toHaveLength(4);
      expect(tool.screens?.vfd).toBeUndefined();
      // exterior only: nothing inside a tool turns
      expect(nodes.some((n) => n.extras?.dt_spin)).toBe(false);
    }
  });

  it('reads the foreline vacuum of a vacuum tool from the dry pump under it', () => {
    for (const p of FAB1_PUMPS) {
      const tool = tools.find((t) => t.asset === p.tool)!;
      const unit = p.tool!.replace('_', '-');
      expect(tool.params?.[`${unit}-PT-FL`]).toBe(`${p.alias}:inlet_press`);
    }
    // the oxidation furnaces have no pump: their gas cabinet gauge stays unbound
    const frn = tools.find((t) => t.asset === 'FRN_01')!;
    expect(frn.params?.['FRN-01-PT-FL']).toBeUndefined();
    // the dielectric etchers run a different model on the etch template
    expect(tools.find((t) => t.asset === 'ETCH_02')?.params?.['ETCH-02-TT-CH']).toBe('wall_temp');
    expect(tools.find((t) => t.asset === 'ETCH_01')?.params?.['ETCH-01-TT-CH']).toBe('esc_temp');
  });

  it('has the simulated OHT fleet: one vehicle per simulator vehicle, each with its hoist and FOUP', () => {
    const nodes = glbNodes('/models/digital-twin/fab1-cleanroom-l2.glb');
    expect(nodes.some((n) => n.extras?.dt_track !== undefined)).toBe(false);
    const vehicles = nodes.filter((n) => typeof n.extras?.dt_vehicle === 'string');
    expect(vehicles.map((v) => v.extras?.dt_vehicle).sort()).toEqual(
      Array.from({ length: FAB1_AMHS.fleet }, (_, i) => `V${String(i + 1).padStart(2, '0')}`)
    );
    expect(nodes.filter((n) => Number(n.extras?.dt_hoist) > 0)).toHaveLength(2 * FAB1_AMHS.fleet);
    expect(nodes.filter((n) => n.extras?.dt_hoist_foup)).toHaveLength(FAB1_AMHS.fleet);
    expect(nodes.filter((n) => n.extras?.dt_hoist_belt)).toHaveLength(FAB1_AMHS.fleet);
    // and no tool GLB has static FOUPs on its load ports (the simulated lots are drawn there)
    Object.values(FAB1_TEMPLATES).forEach(({ file }) => {
      const names = glbNodes(`/models/digital-twin/${file}`).map((n) => n.name ?? '');
      expect(
        names.some((n) => n.endsWith('_FOUPs')),
        file
      ).toBe(false);
    });
  });
});

describe('FAB1 live instrument, controller and motion contracts', () => {
  const support = models.filter((m) => /^(MAU|DP|SCR|PCH)_/.test(m.asset!));

  it('retags every instrument of each support unit and resolves its parameter deep links', () => {
    expect(support).toHaveLength(22);
    for (const model of support) {
      const unitTag = model.asset!.replace('_', '-');
      const source = `${model.asset!.split('_')[0]}-01`;
      expect(model.model?.retag).toEqual({ [source]: unitTag });
      const tags = Object.keys(model.params!);
      expect(tags.every((tag) => tag.startsWith(`${unitTag}-`))).toBe(true);
      const loaded: TwinNode[] = [
        {
          id: model.id,
          name: model.name,
          kind: 'equipment',
          props: {},
          children: tags.map((tag) => ({
            id: `${model.id}/${tag}`,
            name: tag,
            kind: 'part',
            props: { dt_tag: tag },
            children: [],
          })),
        },
      ];
      for (const [tag, param] of Object.entries(model.params!)) {
        expect(findInstrument(loaded, locations, model.id, model.asset!, param)).toBe(
          `${model.id}/${tag}`
        );
      }
      expect(model.screens?.hmi).toHaveLength(4);
      if (/^(MAU|DP)_/.test(model.asset!)) {
        const rows = [...model.screens!.hmi, model.screens!.vfd!];
        expect(rows.every((row) => Object.values(model.params!).includes(row.alias))).toBe(true);
      }
      // exterior models: no internal fans or rotors turn any more
      expect(model.motion).toBeUndefined();
    }
  });

  it.each([
    ['fab1-mau.glb', 'MAU-01', 'MAU_HMI_Screen', 'MAU_VFD_Display'],
    ['fab1-dry-pump.glb', 'DP-01', 'DP_HMI_Screen', 'DP_VFD_Display'],
  ])('exports bound instruments and the registered screens in %s', (file, source, hmi, vfd) => {
    const nodes = glbNodes(`/models/digital-twin/${file}`);
    const model = scenes.flatMap((s) => s.models).find((m) => m.url.endsWith(file))!;
    const tags = new Set(nodes.map((n) => n.extras?.dt_tag));
    expect(tags.has(source)).toBe(true);
    const instance = Object.values(model.retag!)[0];
    for (const tag of Object.keys(model.params!))
      expect(tags.has(tag.replace(instance, source))).toBe(true);
    const defs = fab1ScreenDefinitions(source);
    expect(defs[hmi].slot).toBe('HMI_Screen');
    expect(defs[vfd].slot).toBe('VFD_Display');
    expect(defs[hmi].rows.map(([label]) => label)).toEqual(model.screens!.hmi.map((r) => r.label));
    expect(defs[vfd].rows[0][0]).toEqual(model.screens!.vfd?.label);
    for (const name of [hmi, vfd])
      expect(nodes.find((n) => n.name === name)?.extras?.dt_type).toBe('screen');
    expect(nodes.some((n) => ['x', 'y', 'z'].includes(String(n.extras?.dt_spin)))).toBe(false);
  });
});

describe('CUB to FAB1 utility link', () => {
  const site = buildTwinTree(
    [
      ...rows,
      { ...rows[0], locationId: 120, locationName: 'CUB Central Utility Building', parentId: null },
    ],
    TWIN_SCENES.filter((s) => s.id.startsWith('fab1-') || s.id === 'site-utility-link')
  );
  const nodes = flattenLocations(site);
  const contextOf = (id: string) =>
    (nodes.get(id)?.node.structures ?? []).filter((m) => m.model?.context);

  it('shows the pipe bridge and the other building as unframed context in each building view', () => {
    expect(site.find((n) => n.id === UNASSIGNED_ID)).toBeUndefined();
    expect(contextOf('loc-101').map((m) => m.model?.url.split('/').pop())).toEqual([
      'fab1-site-utility-bridge.glb',
      'fab1-site-cub-massing.glb',
    ]);
    expect(contextOf('loc-120').map((m) => m.model?.url.split('/').pop())).toEqual([
      'fab1-site-utility-bridge.glb',
      'fab1-site-fab1-massing.glb',
    ]);
    // exported in the CUB plant frame: placed at the origin in both views
    expect(
      [...contextOf('loc-101'), ...contextOf('loc-120')].every((m) =>
        m.model?.position?.every((v) => v === 0)
      )
    ).toBe(true);
    // the building's own structures are not context
    expect(collectStructures(building).some((m) => m.model?.context)).toBe(false);
  });
});
