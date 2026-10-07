import { LocationType } from '../location-overview/api/location-overview.api';
import { TwinBinding, TwinLocation, TwinScene } from './digital-twin.types';

export const UNASSIGNED_ID = 'unassigned-scenes';

/**
 * Builds the twin location tree from the flat locations API response and attaches the
 * models of every scene to the location it is bound to: equipment as children, structure models
 * (room shells, roof) as the location's `structures`, and the scene's walk-mode `spawn` (moved by
 * the scene origin) to the scene's own location.
 */
export const buildTwinTree = (rows: LocationType[], scenes: TwinScene[]): TwinLocation[] => {
  const valid = rows.filter(
    (r): r is LocationType & { locationId: number } => r.locationId !== null
  );
  const byId = new Map<number, TwinLocation>();
  valid.forEach((r) =>
    byId.set(r.locationId, {
      id: `loc-${r.locationId}`,
      name: r.locationName,
      type: 'location',
      locationId: r.locationId,
      level: r.hierarchy,
      children: [],
    })
  );

  const roots: TwinLocation[] = [];
  [...valid]
    .sort((a, b) => a.hierarchy - b.hierarchy || a.locationName.localeCompare(b.locationName))
    .forEach((r) => {
      const node = byId.get(r.locationId) as TwinLocation;
      const parent =
        r.parentId !== null && r.parentId !== r.locationId ? byId.get(r.parentId) : undefined;
      (parent ? (parent.children as TwinLocation[]) : roots).push(node);
    });

  const byName = new Map<string, TwinLocation>();
  valid.forEach((r) => {
    const key = r.locationName.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, byId.get(r.locationId) as TwinLocation);
  });
  const resolve = (b?: TwinBinding) =>
    (b?.locationId !== undefined ? byId.get(b.locationId) : undefined) ??
    (b?.locationName ? byName.get(b.locationName.trim().toLowerCase()) : undefined);

  const unassigned: TwinLocation[] = [];
  scenes.forEach((scene) => {
    const origin = scene.origin ?? [0, 0, 0];
    let sceneNode: TwinLocation | undefined;
    scene.models.forEach((m) => {
      const p = m.position ?? [0, 0, 0];
      const model: TwinLocation = {
        id: `${scene.id}/${m.key}`,
        name: m.name,
        type: m.structure ? 'structure' : 'equipment',
        model: {
          url: m.url,
          position: [p[0] + origin[0], p[1] + origin[1], p[2] + origin[2]],
          rotationY: m.rotationY,
          retag: m.retag,
          ...(m.structure && m.context ? { context: true } : {}),
          ...(m.structure && m.enclosing ? { enclosing: true } : {}),
          ...(m.structure && m.context && m.represents ? { represents: m.represents } : {}),
          ...(m.structure && m.interior ? { interior: true } : {}),
        },
        ...(m.structure
          ? {}
          : {
              asset: m.asset,
              params: m.params,
              screens: m.screens,
              motion: m.motion,
            }),
      };
      /** structures stay out of `children` (tree, details list); equipment becomes a child */
      const attach = (loc: TwinLocation) => {
        if (m.structure) loc.structures = [...(loc.structures ?? []), model];
        else (loc.children as TwinLocation[]).push(model);
      };
      const target = resolve(m.bind) ?? resolve(scene.bind);
      if (target) {
        attach(target);
        return;
      }
      if (!sceneNode) {
        sceneNode = {
          id: `scene-${scene.id}`,
          name: scene.name,
          type: 'scene',
          description:
            `${scene.description ?? ''} This scene is not linked to a location yet.`.trim(),
          children: [],
        };
        unassigned.push(sceneNode);
      }
      attach(sceneNode);
    });
    // walk-mode entry point of the scene's location (the first scene bound there wins)
    const spawnHolder = resolve(scene.bind) ?? sceneNode;
    if (scene.spawn && spawnHolder && !spawnHolder.spawn) {
      const p = scene.spawn.position;
      spawnHolder.spawn = {
        position: [p[0] + origin[0], p[1] + origin[1], p[2] + origin[2]],
        yaw: scene.spawn.yaw,
      };
    }
  });

  if (unassigned.length) {
    roots.push({
      id: UNASSIGNED_ID,
      name: 'Unassigned 3D scenes',
      type: 'group',
      description: '3D scenes that do not match any location from the locations API.',
      children: unassigned,
    });
  }
  return roots;
};

export const SITE_ID = 'site';

/**
 * The buildings with 3D scenes under one site root (not a backend location), so one view renders
 * them all in their shared frame. Only when there is more than one; "Unassigned 3D scenes" stays
 * a root of its own.
 */
export const withSiteRoot = (roots: TwinLocation[], name: string): TwinLocation[] => {
  const hasScene = (n: TwinLocation): boolean =>
    !!n.structures?.length || !!n.model || (n.children ?? []).some(hasScene);
  const buildings = roots.filter((r) => r.id !== UNASSIGNED_ID && hasScene(r));
  if (buildings.length < 2) return roots;
  const site: TwinLocation = {
    id: SITE_ID,
    name,
    type: 'location',
    description: 'All buildings of the site in one view, in their places.',
    children: buildings,
  };
  return [site, ...roots.filter((r) => !buildings.includes(r))];
};

/**
 * The structures a scope draws: a context massing that stands in for a location the scope draws
 * itself is left out, and the same model at the same place (the pipe bridge both buildings show as
 * context) is drawn once
 */
export const scopeStructureList = (scope: TwinLocation, structures: TwinLocation[]) => {
  const names = new Set<string>();
  const addNames = (n: TwinLocation) => {
    names.add(n.name.trim().toLowerCase());
    (n.children ?? []).forEach(addNames);
  };
  addNames(scope);
  const seen = new Set<string>();
  return structures.filter((s) => {
    const m = s.model;
    if (!m) return false;
    if (m.represents && names.has(m.represents.trim().toLowerCase())) return false;
    const key = `${m.url}|${(m.position ?? [0, 0, 0]).join(',')}|${m.rotationY ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const flattenLocations = (
  nodes: TwinLocation[],
  parentId?: string,
  out = new Map<string, { node: TwinLocation; parentId?: string }>()
) => {
  nodes.forEach((node) => {
    out.set(node.id, { node, parentId });
    if (node.children) flattenLocations(node.children, node.id, out);
  });
  return out;
};

/** Every equipment in `node`'s subtree (including itself) that carries a model */
export const collectModels = (node: TwinLocation): TwinLocation[] => [
  ...(node.model && node.type !== 'structure' ? [node] : []),
  ...(node.children ?? []).flatMap(collectModels),
];

/** Every structure model (room shell, roof) of the locations in `node`'s subtree (including itself) */
export const collectStructures = (node: TwinLocation): TwinLocation[] => [
  ...(node.structures ?? []).filter((s) => s.model),
  ...(node.children ?? []).flatMap(collectStructures),
];

/**
 * Structures of the locations above `id` that enclose their sub-locations (`enclosing`): a bay's
 * view also shows the cleanroom it is in
 */
export const enclosingStructures = (
  id: string,
  locations: Map<string, { node: TwinLocation; parentId?: string }>
): TwinLocation[] => {
  const out: TwinLocation[] = [];
  for (let p = locations.get(id)?.parentId; p; p = locations.get(p)?.parentId) {
    out.push(...(locations.get(p)?.node.structures ?? []).filter((s) => s.model?.enclosing));
  }
  return out;
};

/** First node (depth-first) that directly contains equipment — the default view without FAB1 */
export const firstSceneLocation = (nodes: TwinLocation[]): string | undefined => {
  for (const n of nodes) {
    if (n.children?.some((c) => c.type === 'equipment')) return n.id;
    const found = firstSceneLocation(n.children ?? []);
    if (found) return found;
  }
  return undefined;
};
