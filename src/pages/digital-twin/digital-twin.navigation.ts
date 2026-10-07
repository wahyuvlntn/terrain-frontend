/**
 * Where the twin goes: targets from its URL (`?asset=CT_01&param=fan_speed&view=walk`, written by
 * the AI assistant's navigation cards and deep links) and from the walk HUD (teleport menu, live
 * events), resolved against the twin location tree into a plan the page applies once the target
 * scope is loaded. Pure logic, no React and no three.js.
 */
import { collectModels, collectStructures, SITE_ID } from './digital-twin.tree';
import { TwinLocation, TwinNode, TwinSpawn } from './digital-twin.types';

/** URL parameters of the twin page */
export const TWIN_URL = {
  /** rendered scope (location or equipment node id) */
  node: 'node',
  asset: 'asset',
  param: 'param',
  location: 'location',
  panel: 'panel',
  view: 'view',
} as const;
/** `view` value of first-person walk mode; any other value (or none) is the orbit view */
export const WALK_VIEW = 'walk';
/** `panel` value that opens the BMS plant overview */
export const PLANT_OVERVIEW_PANEL = 'plant-overview';

/** target parameters: removed from the URL once applied (`node` and `view` stay) */
const CONSUMED = [TWIN_URL.asset, TWIN_URL.param, TWIN_URL.location, TWIN_URL.panel];

/**
 * View options a link can set, as 1 / 0 (`?isolate=0&hover=1`). The page reads them when it opens
 * (they don't change the choices remembered per browser) and drops them with the target.
 */
export const TWIN_VIEW_URL = {
  isolate: 'isolate',
  tags: 'tags',
  /** names & status on hover only */
  hover: 'hover',
  tint: 'tint',
  seeThrough: 'seethrough',
} as const;
export type TwinViewOptions = Partial<Record<keyof typeof TWIN_VIEW_URL, boolean>>;

/** The view options a URL sets (absent or invalid values: not set) */
export const readTwinView = (params: URLSearchParams): TwinViewOptions => {
  const out: TwinViewOptions = {};
  for (const [key, name] of Object.entries(TWIN_VIEW_URL) as [keyof TwinViewOptions, string][]) {
    const v = params.get(name);
    if (v === '1' || v === 'true') out[key] = true;
    else if (v === '0' || v === 'false') out[key] = false;
  }
  return out;
};

/** A link into the twin: scope (backend location id), equipment to select, walk mode, view options */
export const twinUrl = ({
  locationId,
  asset,
  walk,
  view,
}: {
  locationId?: number | null;
  asset?: string | null;
  walk?: boolean;
  view?: TwinViewOptions;
}) => {
  const p = new URLSearchParams();
  if (locationId !== null && locationId !== undefined) p.set(TWIN_URL.node, `loc-${locationId}`);
  if (asset) p.set(TWIN_URL.asset, asset);
  if (walk) p.set(TWIN_URL.view, WALK_VIEW);
  for (const [key, on] of Object.entries(view ?? {}) as [
    keyof TwinViewOptions,
    boolean | undefined,
  ][]) {
    if (on !== undefined) p.set(TWIN_VIEW_URL[key], on ? '1' : '0');
  }
  return `/digital-twin?${p.toString()}`;
};

export type TwinLocations = Map<string, { node: TwinLocation; parentId?: string }>;

export type TwinNavRequest = {
  /** equipment alias (case-insensitive) */
  asset?: string;
  /** parameter alias of `asset`: select the 3D instrument bound to it, else the equipment */
  param?: string;
  /** location name (case-insensitive, trimmed) */
  location?: string;
  /** location node id of the twin tree (teleport menu); wins over `location` */
  locationId?: string;
  /**
   * a target inside the rendered scope keeps the scope (teleport); without it a location, or any
   * target of the site view or the default view, becomes the scope
   */
  keepScope?: boolean;
  /** select the equipment (default true) */
  select?: boolean;
  /** open the BMS plant overview */
  overview?: boolean;
  /** walk mode: true enter (or move when walking), false leave, undefined keep */
  walk?: boolean;
};

/** where to stand when the plan enters walk mode (or moves the walking player) */
export type TwinWalkSpot =
  | { kind: 'equipment'; nodeId: string }
  | { kind: 'location'; locationId: string }
  | { kind: 'scope' };

export type TwinNavPlan = {
  /** scope to render (the current one when unchanged) */
  scopeId: string;
  /** equipment node to select */
  select: string | null;
  /** with `select`: parameter whose 3D instrument to select instead (falls back to the equipment) */
  param: string | null;
  /** backend alias of the selected equipment (instruments bound as `ALIAS:param`) */
  asset: string | null;
  overview: boolean;
  walk: 'enter' | 'exit' | null;
  spot: TwinWalkSpot;
  /** short message for the user (e.g. the equipment has no 3D model) */
  note: string | null;
};

/** What an equipment alias leads to in 3D */
export type TwinAssetTarget =
  | { kind: 'equipment'; alias: string; nodeId: string }
  /** not modelled, but its location has a 3D scene */
  | { kind: 'location'; alias: string; locationId: string; note: string }
  /** nowhere to go in 3D */
  | { kind: 'none'; alias: string; note: string };

export type TwinNavContext = {
  locations: TwinLocations;
  /** 3D equipment node of each backend alias (TWIN_NODE_OF_ASSET) */
  nodeOfAsset: ReadonlyMap<string, string>;
  /** backend equipment (alias, location id); undefined while loading */
  assets: readonly { alias: string; locationId: number }[] | undefined;
  /** rendered scope */
  scopeId: string;
  /** the scope is the default view's (no `node`): like the site view, it keeps only teleports */
  isDefault?: boolean;
  walking: boolean;
};

const norm = (s: string) => s.trim().toLowerCase();

/** The URL's target, or null when it carries none (only `node` / `view`) */
export const readTwinNav = (params: URLSearchParams): TwinNavRequest | null => {
  if (!CONSUMED.some((k) => params.has(k))) return null;
  const get = (k: string) => params.get(k)?.trim() || undefined;
  return {
    asset: get(TWIN_URL.asset),
    param: get(TWIN_URL.param),
    location: get(TWIN_URL.location),
    overview: get(TWIN_URL.panel) === PLANT_OVERVIEW_PANEL,
    walk: params.get(TWIN_URL.view) === WALK_VIEW,
  };
};

/** The URL once its target is applied: target parameters removed, `node` = the resulting scope */
export const consumeTwinNav = (params: URLSearchParams, scopeId: string) => {
  const next = new URLSearchParams(params);
  CONSUMED.forEach((k) => next.delete(k));
  Object.values(TWIN_VIEW_URL).forEach((k) => next.delete(k));
  if (scopeId) next.set(TWIN_URL.node, scopeId);
  return next;
};

/** Whether a node lies in the subtree of `scopeId` (rendered with that scope) */
export const inScope = (id: string, scopeId: string, locations: TwinLocations) => {
  let cur: string | undefined = id;
  while (cur) {
    if (cur === scopeId) return true;
    cur = locations.get(cur)?.parentId;
  }
  return false;
};

/** Something to render in the location's subtree: equipment or building structures */
export const hasScene = (node: TwinLocation) =>
  collectModels(node).length > 0 || collectStructures(node).length > 0;

/** Backend location (type 'location') with this name, trimmed and case-insensitive */
export const findLocationByName = (name: string, locations: TwinLocations) => {
  const key = norm(name);
  for (const { node } of locations.values())
    if (node.type === 'location' && norm(node.name) === key) return node;
  return undefined;
};

/**
 * Walk-mode entry point of a location: its own (from its scene), else a sub-location's, the one
 * holding the most equipment first (a floor enters through its plant room). Undefined when no
 * scene below it has one.
 */
export const locationSpawn = (node: TwinLocation): TwinSpawn | undefined => {
  if (node.spawn) return node.spawn;
  const subs = (node.children ?? []).filter(
    (c) => c.type !== 'equipment' && c.type !== 'structure'
  );
  const equipment = new Map(subs.map((c) => [c, collectModels(c).length]));
  for (const c of [...subs].sort((a, b) => (equipment.get(b) ?? 0) - (equipment.get(a) ?? 0))) {
    const spawn = locationSpawn(c);
    if (spawn) return spawn;
  }
  return undefined;
};

/** The 3D model, or the 3D location, of a backend equipment alias; 'wait' while assets load */
export const resolveAssetTarget = (
  alias: string,
  ctx: Pick<TwinNavContext, 'locations' | 'nodeOfAsset' | 'assets'>
): TwinAssetTarget | 'wait' => {
  const key = norm(alias);
  for (const [a, nodeId] of ctx.nodeOfAsset)
    if (norm(a) === key && ctx.locations.has(nodeId))
      return { kind: 'equipment', alias: a, nodeId };
  if (!ctx.assets) return 'wait';
  const asset = ctx.assets.find((a) => norm(a.alias) === key);
  if (!asset) return { kind: 'none', alias: alias.trim(), note: `${alias.trim()} was not found` };
  const note = `${asset.alias} is not modelled in 3D yet`;
  for (const { node } of ctx.locations.values()) {
    if (node.type === 'location' && node.locationId === asset.locationId) {
      return hasScene(node)
        ? { kind: 'location', alias: asset.alias, locationId: node.id, note }
        : { kind: 'none', alias: asset.alias, note };
    }
  }
  return { kind: 'none', alias: asset.alias, note };
};

/** Whether a target leads somewhere in 3D (its equipment, or the room that holds it) */
export const leadsInto3D = (target: TwinAssetTarget | 'wait') =>
  target !== 'wait' && target.kind !== 'none';

/**
 * Plan for a target: the scope to render, what to select, the walk-mode change and where to
 * stand. Equipment inside the rendered scope keeps the scope, else its scene's location becomes
 * the scope (CT_01 -> Cooling Tower Yard). The site view and the default view hold every target:
 * they keep one only for a teleport (`keepScope`), else the target's room opens. An equipment
 * without a 3D model goes to its location when that has a scene, else the scope stays (and a
 * walking player stays put); both with a note. 'wait' while the backend equipment list is needed
 * but not loaded yet.
 */
export const resolveTwinNav = (req: TwinNavRequest, ctx: TwinNavContext): TwinNavPlan | 'wait' => {
  const { locations, scopeId: current } = ctx;
  const plan: TwinNavPlan = {
    scopeId: current,
    select: null,
    param: null,
    asset: null,
    overview: !!req.overview,
    walk: req.walk === true ? 'enter' : req.walk === false && ctx.walking ? 'exit' : null,
    spot: { kind: 'scope' },
    note: null,
  };
  const scopeOf = (id: string, fallback: string) =>
    ((current !== SITE_ID && !ctx.isDefault) || req.keepScope) && inScope(id, current, locations)
      ? current
      : fallback;

  if (req.asset) {
    const target = resolveAssetTarget(req.asset, ctx);
    if (target === 'wait') return 'wait';
    if (target.kind === 'equipment') {
      plan.scopeId = scopeOf(
        target.nodeId,
        locations.get(target.nodeId)?.parentId ?? target.nodeId
      );
      plan.select = req.select === false ? null : target.nodeId;
      plan.param = plan.select && req.param ? req.param : null;
      plan.asset = target.alias;
      plan.spot = { kind: 'equipment', nodeId: target.nodeId };
    } else if (target.kind === 'location') {
      plan.scopeId = scopeOf(target.locationId, target.locationId);
      plan.spot = { kind: 'location', locationId: target.locationId };
      plan.note = target.note;
    } else {
      plan.note = target.note;
    }
    return keepWalker(plan, ctx);
  }

  if (req.locationId || req.location) {
    const loc = req.locationId
      ? locations.get(req.locationId)?.node
      : findLocationByName(req.location ?? '', locations);
    if (!loc || loc.type === 'equipment' || loc.type === 'structure') {
      plan.note = `Location "${req.location ?? req.locationId}" was not found`;
      return keepWalker(plan, ctx);
    }
    plan.scopeId = req.keepScope ? scopeOf(loc.id, loc.id) : loc.id;
    plan.spot = { kind: 'location', locationId: loc.id };
  }
  return keepWalker(plan, ctx);
};

/**
 * A walking player stays where they stand when the plan has no place to go and keeps the scope
 * (a target without a 3D model or an unknown location, the plant overview with `view=walk`):
 * only entering walk mode starts at the scope's entry point.
 */
const keepWalker = (plan: TwinNavPlan, ctx: TwinNavContext): TwinNavPlan => {
  if (
    ctx.walking &&
    plan.walk === 'enter' &&
    plan.spot.kind === 'scope' &&
    plan.scopeId === ctx.scopeId
  )
    plan.walk = null;
  return plan;
};

/**
 * The 3D instrument bound to a parameter of an equipment: on the equipment's own model (binding
 * `param` or `ALIAS:param`), else on any loaded model that binds `ALIAS:param` (a pump's flow on
 * the loop's flowmeter FT-811). Null when none is loaded.
 */
export const findInstrument = (
  equipment: readonly TwinNode[],
  locations: TwinLocations,
  equipmentId: string,
  alias: string,
  param: string
): string | null => {
  const own = norm(param);
  const qualified = `${norm(alias)}:${own}`;
  const tagsOf = (id: string, ownModel: boolean) =>
    Object.entries(locations.get(id)?.node.params ?? {})
      .filter(([, b]) => norm(b) === qualified || (ownModel && norm(b) === own))
      .map(([tag]) => tag);
  const find = (n: TwinNode, tags: string[]): TwinNode | undefined =>
    n.kind === 'part' && tags.includes(String(n.props.dt_tag ?? ''))
      ? n
      : n.children.map((c) => find(c, tags)).find(Boolean);
  const ordered = [
    ...equipment.filter((e) => e.id === equipmentId),
    ...equipment.filter((e) => e.id !== equipmentId),
  ];
  for (const eq of ordered) {
    const tags = tagsOf(eq.id, eq.id === equipmentId);
    const hit = tags.length ? find(eq, tags) : undefined;
    if (hit) return hit.id;
  }
  return null;
};

/**
 * Locations of the twin with something to render, depth-first in tree order with their depth
 * (teleport menu)
 */
export const twinLocationsWithScene = (roots: readonly TwinLocation[]) => {
  const out: { node: TwinLocation; depth: number }[] = [];
  const walk = (nodes: readonly TwinLocation[], depth: number) =>
    nodes.forEach((n) => {
      if (n.type === 'equipment' || n.type === 'structure' || !hasScene(n)) return;
      out.push({ node: n, depth });
      walk(n.children ?? [], depth + 1);
    });
  walk(roots, 0);
  return out;
};
