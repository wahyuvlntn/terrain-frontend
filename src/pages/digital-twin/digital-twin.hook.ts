import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getAllLocations, LocationType } from '../location-overview/api/location-overview.api';
import { hasPlant, TWIN_NODE_OF_ASSET } from './digital-twin.bms';
import { useTwinLive } from './digital-twin.live';
import {
  consumeTwinNav,
  findInstrument,
  findLocationByName,
  locationSpawn,
  readTwinNav,
  readTwinView,
  resolveAssetTarget,
  resolveTwinNav,
  TWIN_URL,
  TwinNavContext,
  TwinNavPlan,
  TwinNavRequest,
  TwinWalkSpot,
  WALK_VIEW,
} from './digital-twin.navigation';
import { RENDER_NEAR_M } from './digital-twin.render';
import { TWIN_SCENES, TWIN_SITE } from './digital-twin.scenes';
import { REPLAY_PARAM } from './digital-twin.source';
import {
  buildTwinTree,
  collectModels,
  collectStructures,
  enclosingStructures,
  firstSceneLocation,
  flattenLocations,
  SITE_ID,
  scopeStructureList,
  withSiteRoot,
} from './digital-twin.tree';
import { TwinLocation, TwinNode } from './digital-twin.types';
import { TwinModelEntry, TwinViewer, WalkSpawn, WalkViewState } from './viewer/twin-viewer';

const STATUS_TINT_KEY = 'digitalTwin.statusTint';
const SEE_THROUGH_KEY = 'digitalTwin.seeThroughWalls';
const LABELS_ON_HOVER_KEY = 'digitalTwin.labelsOnHover';

/** A remembered on / off choice (default on, or `fallback`); storage may be unavailable */
const readFlag = (key: string, fallback = true) => {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v !== 'false';
  } catch {
    return fallback;
  }
};
const writeFlag = (key: string, value: boolean) => {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // storage unavailable: the choice just isn't remembered
  }
};
const readStatusTint = () => readFlag(STATUS_TINT_KEY);

const indexTree = (nodes: TwinNode[], out = new Map<string, TwinNode>()) => {
  nodes.forEach((n) => {
    out.set(n.id, n);
    indexTree(n.children, out);
  });
  return out;
};

/** `showWithin`: drawn only while the camera is that near (the site view's interiors, equipment) */
const toEntry = (loc: TwinLocation, showWithin?: number): TwinModelEntry => ({
  key: loc.id,
  name: loc.name,
  url: loc.model?.url ?? '',
  position: loc.model?.position,
  rotationY: loc.model?.rotationY,
  retag: loc.model?.retag,
  ...(loc.type === 'structure' ? { structure: true } : {}),
  ...(loc.model?.context ? { context: true } : {}),
  ...(showWithin ? { showWithin } : {}),
});

const locationProps = (loc: TwinLocation) => ({
  dt_location_type: loc.type,
  ...(loc.level !== undefined ? { dt_level: loc.level } : {}),
  ...(loc.locationId !== undefined ? { dt_location_id: loc.locationId } : {}),
  ...(loc.description ? { dt_description: loc.description } : {}),
});

/** Walk mode (first person) as the viewer reports it */
export type TwinWalkState = WalkViewState;
export type TwinWalkKey = 'T' | 'G' | 'Escape' | 'Tab' | 'F' | 'C' | 'Exit';

const NOT_WALKING: TwinWalkState = { walking: false, locked: false, lookMode: 'pointer-lock' };

/** A walk-mode teleport: a loaded equipment, a location's entry point, or a backend equipment */
export type TwinTeleport =
  | { kind: 'equipment'; nodeId: string }
  | { kind: 'location'; locationId: string }
  | { kind: 'asset'; alias: string };

export const useDigitalTwin = ({
  labelClassName,
  badgeClassName,
  onWalkKey,
}: {
  labelClassName?: string;
  badgeClassName?: string;
  /** keys the page acts on while walking (assistant, newest event, teleport menu, full screen, exit) */
  onWalkKey?: (key: TwinWalkKey) => void;
} = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<TwinViewer | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  /** view options of the link that opened the page (read once; not remembered) */
  const [linkView] = useState(() => readTwinView(searchParams));
  const onWalkKeyRef = useRef(onWalkKey);
  onWalkKeyRef.current = onWalkKey;

  const {
    data: apiLocations,
    isLoading: isLocationsLoading,
    isError: isLocationsError,
  } = useQuery({
    queryKey: ['getAllLocations'] as const,
    queryFn: async (): Promise<LocationType[] | null> => await getAllLocations(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    meta: {
      toastId: ['getAllLocations'],
    },
  });

  const locationTree = useMemo(
    () => withSiteRoot(buildTwinTree(apiLocations ?? [], TWIN_SCENES), TWIN_SITE.name),
    [apiLocations]
  );
  const locations = useMemo(() => flattenLocations(locationTree), [locationTree]);
  const locationsRef = useRef(locations);
  locationsRef.current = locations;
  /** the building the default view frames (FAB1), when the user can see it */
  const focusLocation = useMemo(() => findLocationByName(TWIN_SITE.focus, locations), [locations]);
  const focusKeys = useMemo(
    () => (focusLocation ? collectStructures(focusLocation).map((s) => s.id) : []),
    [focusLocation]
  );
  /** its structures and equipment: the default view draws them at any distance (see the load) */
  const focusIds = useMemo(
    () =>
      new Set([
        ...focusKeys,
        ...(focusLocation ? collectModels(focusLocation) : []).map((m) => m.id),
      ]),
    [focusKeys, focusLocation]
  );

  /** Location (or equipment) whose models are rendered — kept in the URL for back/forward navigation */
  const nodeParam = searchParams.get(TWIN_URL.node);
  // the campus (else FAB1 alone for a fab-only user), else the first scene as before
  const defaultScope =
    (focusLocation && (locations.has(SITE_ID) ? SITE_ID : focusLocation.id)) ??
    firstSceneLocation(locationTree) ??
    locationTree[0]?.id ??
    '';
  /**
   * The scope rendered before the URL changed: a target link without `node` (the assistant's)
   * keeps it until the target is resolved, so "stay" and "already in view" refer to what the user
   * was looking at rather than the default scope. So does a walk / orbit link without a target
   * (`?view=walk`, or no `view` while walking), until the URL effect pins it as `node`.
   */
  const lastScope = useRef<string | null>(null);
  const heldScope =
    !nodeParam &&
    lastScope.current &&
    locations.has(lastScope.current) &&
    (readTwinNav(searchParams) || searchParams.has(TWIN_URL.view) || viewerRef.current?.isWalking())
      ? lastScope.current
      : null;
  const scopeId = nodeParam && locations.has(nodeParam) ? nodeParam : (heldScope ?? defaultScope);
  if (!isLocationsLoading && scopeId) lastScope.current = scopeId;
  /**
   * The default view (no node, no target, no replay): framed on the focus building once loaded. A
   * ref, so a later write of `node` does not re-run the scope load.
   */
  const showsDefault = useRef(false);
  /** the scope's framing if it was loaded as the default view (its building drawn in full) */
  const defaultFrame = useRef<string[] | null>(null);
  showsDefault.current =
    !nodeParam &&
    !heldScope &&
    !readTwinNav(searchParams) &&
    !searchParams.has(REPLAY_PARAM) &&
    scopeId === defaultScope;
  const scope = locations.get(scopeId)?.node;
  // stable while the API data is unchanged (react-query keeps structurally equal data by reference)
  const scopeModels = useMemo(() => (scope ? collectModels(scope) : []), [scope]);
  /** room shells / roof of the scope's subtree: context geometry rendered around the equipment */
  const scopeStructures = useMemo(
    () =>
      scope
        ? scopeStructureList(scope, [
            ...collectStructures(scope),
            // the cleanroom around a bay: drawn as context, so the view frames the bay's own tools
            ...enclosingStructures(scopeId, locations).map((s) =>
              s.model ? { ...s, model: { ...s.model, context: true } } : s
            ),
          ])
        : [],
    [scope, scopeId, locations]
  );

  const setScopeId = useCallback(
    (id: string) =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(TWIN_URL.node, id);
        return next;
      }),
    [setSearchParams]
  );

  /** Drill-down selection inside the rendered models (equipment / group / part), null = whole scope */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<TwinNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isolate, setIsolate] = useState(linkView.isolate ?? true);
  const [showTags, setShowTags] = useState(linkView.tags ?? false);
  /** tint equipment that isn't running (standby, trip, maintenance, offline); remembered per browser */
  const [statusTint, setStatusTintState] = useState(() => linkView.tint ?? readStatusTint());
  const setStatusTint = useCallback((next: boolean) => {
    setStatusTintState(next);
    writeFlag(STATUS_TINT_KEY, next);
  }, []);
  /**
   * See-through walls (translucent building structures) or solid ones; remembered per browser.
   * The ref hands the current choice to a viewer created later.
   */
  const [seeThrough, setSeeThroughState] = useState(
    () => linkView.seeThrough ?? readFlag(SEE_THROUGH_KEY)
  );
  const seeThroughRef = useRef(seeThrough);
  seeThroughRef.current = seeThrough;
  const setSeeThrough = useCallback((next: boolean) => {
    setSeeThroughState(next);
    writeFlag(SEE_THROUGH_KEY, next);
  }, []);
  /** orbit view: equipment names and statuses (badges) only on the hovered equipment; remembered */
  const [labelsOnHover, setLabelsOnHoverState] = useState(
    () => linkView.hover ?? readFlag(LABELS_ON_HOVER_KEY, false)
  );
  const labelsOnHoverRef = useRef(labelsOnHover);
  labelsOnHoverRef.current = labelsOnHover;
  const setLabelsOnHover = useCallback((next: boolean) => {
    setLabelsOnHoverState(next);
    writeFlag(LABELS_ON_HOVER_KEY, next);
  }, []);
  const pendingSelect = useRef<string | null>(null);
  /** counts explicit selections, so selecting the active node again is noticeable */
  const [selections, setSelections] = useState(0);

  /** BMS plant overview over the 3D view (the page shows it only when the twin has the plant) */
  const [overviewOpen, setOverviewOpen] = useState(false);
  /** walk mode and the node its crosshair points at */
  const [walk, setWalk] = useState<TwinWalkState>(NOT_WALKING);
  const [walkTargetId, setWalkTargetId] = useState<string | null>(null);
  /** walking: Esc held to leave walk mode since this time (performance.now), else null */
  const [exitHold, setExitHold] = useState<number | null>(null);
  /** the equipment the viewer draws now (the site view hides far interiors), null: all of it */
  const [nearby, setNearby] = useState<string[] | null>(null);
  /** short message over the view (a target without a 3D model, nowhere to land) */
  const [note, setNote] = useState<{ text: string; seq: number } | null>(null);
  const showNote = useCallback(
    (text: string) => setNote((n) => ({ text, seq: (n?.seq ?? 0) + 1 })),
    []
  );
  /** scope whose models are in the viewer (null while loading) */
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  /** the loaded scope has simulated OHT vehicles */
  const [transport, setTransport] = useState(false);
  /** a navigation target waiting for its scope to load (URL target, teleport, live event) */
  const pendingNav = useRef<TwinNavPlan | null>(null);
  const [navSeq, setNavSeq] = useState(0);

  /**
   * Walk-mode entry point of a scope: a location's spawn (its own or a sub-location's), in front
   * of an equipment rendered on its own, else a free floor spot near the view centre
   */
  const scopeSpawn = useCallback((id: string): WalkSpawn | null => {
    const viewer = viewerRef.current;
    if (!viewer) return null;
    const node = locationsRef.current.get(id)?.node;
    if (node?.type === 'equipment') return viewer.spawnNear(id) ?? viewer.defaultSpawn();
    return (node && locationSpawn(node)) ?? viewer.defaultSpawn();
  }, []);

  // viewer lifecycle
  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new TwinViewer(containerRef.current, {
      onSelect: (id) => {
        setSelectedId(id);
        setSelections((n) => n + 1);
      },
      onHover: setHoverId,
      onProgress: setProgress,
      labelClassName,
      badgeClassName,
      onWalkChange: setWalk,
      onWalkTarget: setWalkTargetId,
      onWalkKey: (key) => onWalkKeyRef.current?.(key),
      onWalkExitHold: setExitHold,
      onNearbyChange: setNearby,
    });
    viewer.setSeeThrough(seeThroughRef.current);
    viewer.setBadgesOnHover(labelsOnHoverRef.current);
    viewer.setSite(TWIN_SITE.ground, TWIN_SITE.timeZone);
    viewerRef.current = viewer;
    return () => {
      viewer.dispose();
      viewerRef.current = null;
      setWalk(NOT_WALKING);
      setExitHold(null);
    };
  }, [labelClassName, badgeClassName]);

  // render only the models (equipment + structures) of the selected location's subtree
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || isLocationsLoading) return;
    let cancelled = false;
    // the site view (every building) draws interiors and equipment only near the camera
    const near = scopeId === SITE_ID && RENDER_NEAR_M > 0 ? RENDER_NEAR_M : undefined;
    const frame = showsDefault.current ? focusKeys : null;
    defaultFrame.current = frame;
    // the default view frames from past RENDER_NEAR_M: the framed building is drawn in full
    // shortcut: also once the camera moves away; limit it to the framing if the site view lags
    const nearOf = (id: string) => (frame && focusIds.has(id) ? undefined : near);
    const entries = [
      ...scopeModels.map((m) => toEntry(m, nearOf(m.id))),
      ...scopeStructures.map((s) => toEntry(s, s.model?.interior ? nearOf(s.id) : undefined)),
    ];
    const loading = scopeId;
    setIsLoading(entries.length > 0);
    setLoadedScope(null);
    setTransport(false);
    setProgress(0);
    setError(null);
    setSelectedId(null);
    setHoverId(null);
    viewer
      .loadScope(entries)
      .then((loaded) => {
        if (cancelled) return;
        setEquipment(loaded);
        setLoadedScope(loading);
        setTransport(viewer.hasAmhs());
        const pending = pendingSelect.current;
        pendingSelect.current = null;
        if (pending && viewer.getNode(pending)) {
          viewer.select(pending);
          setSelectedId(pending);
        }
        if (frame?.length && !pending && !pendingNav.current && !viewer.isWalking())
          viewer.frameEntries(frame);
        // walking into another scope without a target: stay where the player stands when that
        // is inside one of its building parts (e.g. up a level), else enter at its entry point
        if (viewer.isWalking() && !pendingNav.current) {
          const pose = viewer.getWalkPose();
          if (!pose || !viewer.structureAt(pose.position)) {
            const spawn = scopeSpawn(loading);
            if (spawn) viewer.teleport(spawn);
          }
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the 3D model');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scopeModels, scopeStructures, isLocationsLoading, scopeId, scopeSpawn, focusKeys, focusIds]);

  useEffect(() => viewerRef.current?.setIsolate(isolate), [isolate]);
  useEffect(() => viewerRef.current?.setLabelsVisible(showTags), [showTags]);
  useEffect(() => viewerRef.current?.setSeeThrough(seeThrough), [seeThrough]);
  useEffect(() => viewerRef.current?.setBadgesOnHover(labelsOnHover), [labelsOnHover]);

  /** API locations + the drill-down hierarchy of every loaded equipment */
  const tree = useMemo(() => {
    const loaded = new Map(equipment.map((e) => [e.id, e]));
    const toNode = (loc: TwinLocation, parentId?: string): TwinNode => {
      const eq = loaded.get(loc.id);
      return {
        id: loc.id,
        name: loc.name,
        kind: loc.type === 'equipment' ? 'equipment' : 'location',
        parentId,
        props: { ...(eq?.props ?? {}), ...locationProps(loc) },
        children: [...(loc.children ?? []).map((c) => toNode(c, loc.id)), ...(eq?.children ?? [])],
      };
    };
    return locationTree.map((l) => toNode(l));
  }, [locationTree, equipment]);

  const index = useMemo(() => indexTree(tree), [tree]);
  const activeId = selectedId ?? scopeId;
  const activeNode = index.get(activeId);
  /** changes with the active node and whenever a node is (re)selected */
  const selectionKey = `${activeId}#${selections}`;

  const path = useMemo(() => {
    const out: TwinNode[] = [];
    let node = index.get(activeId);
    while (node) {
      out.unshift(node);
      node = node.parentId ? index.get(node.parentId) : undefined;
    }
    return out;
  }, [index, activeId]);

  const selectNode = useCallback(
    (id: string) => {
      const viewer = viewerRef.current;
      const node = index.get(id);
      if (!viewer || !node) return;
      setSelections((n) => n + 1);
      if (node.kind === 'location') {
        if (id === scopeId) {
          viewer.select(null);
          setSelectedId(null);
        } else {
          setScopeId(id);
        }
        return;
      }
      if (viewer.getNode(id)) {
        viewer.select(id);
        setSelectedId(id);
        return;
      }
      // equipment outside the rendered scope: render it on its own
      pendingSelect.current = null;
      setScopeId(id);
    },
    [index, scopeId, setScopeId]
  );

  const goUp = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (selectedId) {
      const parent = viewer.parentOfSelection();
      if (parent) {
        viewer.select(parent);
        setSelectedId(parent);
        return;
      }
      if (selectedId !== scopeId) {
        viewer.select(null);
        setSelectedId(null);
        return;
      }
    }
    const parentLocation = locations.get(scopeId)?.parentId;
    if (parentLocation) {
      pendingSelect.current = scopeId;
      setScopeId(parentLocation);
    }
  }, [selectedId, scopeId, locations, setScopeId]);

  /** Frame button: the default view returns to the focus building's isometric framing */
  const resetView = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const frame = defaultFrame.current;
    if (!selectedId && showsDefault.current && frame?.length) viewer.frameEntries(frame);
    else viewer.resetView();
  }, [selectedId]);

  const live = useTwinLive({
    viewerRef,
    equipment,
    locations,
    index,
    activeNode,
    selectNode,
    statusTint,
    transport,
    nearby,
  });

  // ---------------------------------------------------------------- navigation targets

  const navContext = (): TwinNavContext => ({
    locations,
    nodeOfAsset: TWIN_NODE_OF_ASSET,
    assets: live.assets,
    scopeId,
    isDefault: !nodeParam && scopeId === defaultScope,
    walking: walk.walking,
  });

  /** Plan applied once its scope is loaded (now, when it already is) */
  const requestNav = (plan: TwinNavPlan, writeScope: boolean) => {
    pendingNav.current = plan;
    setNavSeq((n) => n + 1);
    if (writeScope && plan.scopeId !== scopeId) setScopeId(plan.scopeId);
  };

  /** where the player stands for a plan's spot */
  const spotSpawn = (spot: TwinWalkSpot, planScope: string): WalkSpawn | null => {
    const viewer = viewerRef.current;
    if (!viewer) return null;
    if (spot.kind === 'equipment') return viewer.spawnNear(spot.nodeId) ?? scopeSpawn(planScope);
    if (spot.kind === 'location') {
      const node = locations.get(spot.locationId)?.node;
      return (node && locationSpawn(node)) ?? viewer.defaultSpawn();
    }
    return scopeSpawn(planScope);
  };

  const applyNav = (plan: TwinNavPlan) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (plan.walk === 'enter') {
      // entering, or moving the walking player there
      if (!viewer.enterWalk(spotSpawn(plan.spot, plan.scopeId) ?? undefined)) {
        showNote('Walk mode: there is nowhere to stand in this view');
        // the URL must not claim walk mode (nor, should the target's own write still be on its
        // way, bring the target back)
        if (searchParams.get(TWIN_URL.view) === WALK_VIEW)
          setSearchParams(
            (prev) => {
              const next = consumeTwinNav(prev, plan.scopeId);
              next.delete(TWIN_URL.view);
              return next;
            },
            { replace: true }
          );
      }
    } else if (plan.walk === 'exit') {
      viewer.exitWalk();
    }
    if (plan.select && viewer.getNode(plan.select)) {
      // the instrument bound to the parameter, else the equipment itself
      const id =
        (plan.param &&
          plan.asset &&
          findInstrument(equipment, locations, plan.select, plan.asset, plan.param)) ||
        plan.select;
      viewer.select(id);
      setSelectedId(id);
      setSelections((n) => n + 1);
      // as a selection made in walk mode: the mouse is freed so the dashboard can be used (G and
      // a teleport after a scope load arrive with the pointer still locked)
      if (viewer.isWalking()) viewer.unlockPointer();
    }
    if (plan.overview) {
      // only where it can be shown: the twin must hold the chiller plant (the user's locations)
      if (hasPlant(tree)) setOverviewOpen(true);
      else
        showNote('The plant overview is not available: the chiller plant is not in your locations');
    }
    if (plan.note) showNote(plan.note);
  };
  const applyNavRef = useRef(applyNav);
  applyNavRef.current = applyNav;

  // a plan whose scope is no longer the one to render (the tree, a crumb, Up or Back changed it
  // while the plan's scope was loading) is dropped: it would block the URL's view sync and the
  // walk respawn, and fire whenever that scope is opened later. A new plan's own scope change
  // (written with the plan, or before it) keeps it.
  useEffect(() => {
    if (pendingNav.current && pendingNav.current.scopeId !== scopeId) pendingNav.current = null;
  }, [scopeId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: navSeq announces a new plan (kept in a ref)
  useEffect(() => {
    const plan = pendingNav.current;
    if (!plan || isLoading || loadedScope !== plan.scopeId) return;
    pendingNav.current = null;
    applyNavRef.current(plan);
  }, [navSeq, loadedScope, isLoading]);

  /**
   * URL targets (`asset`, `param`, `location`, `panel`, with `view`): resolved once the location
   * tree (and, for equipment without a 3D model, the equipment list) is loaded, then removed from
   * the URL (replace) with `node` set to the resulting scope; applied once that scope is loaded.
   * Without a target the URL's `view` drives walk mode: `view=walk` enters it, its absence leaves.
   */
  const searchKey = searchParams.toString();
  const assetsLoaded = !!live.assets;
  const viewSyncedFor = useRef<string | null>(null);
  /** the pin below wrote the default scope as `node`: leaving walk mode takes it out again */
  const pinnedDefault = useRef(false);
  const navContextRef = useRef(navContext);
  navContextRef.current = navContext;
  const requestNavRef = useRef(requestNav);
  requestNavRef.current = requestNav;
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the URL changes or the data a target waits for arrives
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || isLocationsLoading) return;
    const req = readTwinNav(searchParams);
    if (req) {
      const plan = resolveTwinNav(req, navContextRef.current());
      if (plan === 'wait') return;
      setSearchParams(consumeTwinNav(searchParams, plan.scopeId), { replace: true });
      requestNavRef.current(plan, false);
      return;
    }
    // a walk / orbit link without `node` keeps the scope on screen: pin it in the URL first
    if (heldScope) {
      pinnedDefault.current = heldScope === defaultScope;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(TWIN_URL.node, heldScope);
          return next;
        },
        { replace: true }
      );
      return;
    }
    // the view follows URL changes only, not this page's own state changes
    if (viewSyncedFor.current === searchKey) return;
    viewSyncedFor.current = searchKey;
    if (pendingNav.current) return;
    const wantWalk = searchParams.get(TWIN_URL.view) === WALK_VIEW;
    if (wantWalk && !viewer.isWalking()) {
      const plan = resolveTwinNav({ walk: true }, navContextRef.current());
      if (plan !== 'wait') requestNavRef.current(plan, false);
    } else if (!wantWalk && viewer.isWalking()) {
      viewer.exitWalk();
    }
  }, [searchKey, isLocationsLoading, assetsLoaded]);

  // walk mode started or left in the page (button, Esc, Exit): `view=walk` follows (replace)
  const wasWalking = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: on walk-mode changes only
  useEffect(() => {
    if (wasWalking.current === walk.walking) return;
    wasWalking.current = walk.walking;
    if (!walk.walking) setWalkTargetId(null);
    // the default view's URL stays clean (no `node`) once walk mode ends
    const unpin = !walk.walking && pinnedDefault.current;
    if (!walk.walking) pinnedDefault.current = false;
    if ((searchParams.get(TWIN_URL.view) === WALK_VIEW) === walk.walking) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (walk.walking) next.set(TWIN_URL.view, WALK_VIEW);
        else next.delete(TWIN_URL.view);
        if (unpin && next.get(TWIN_URL.node) === defaultScope) next.delete(TWIN_URL.node);
        return next;
      },
      { replace: true }
    );
  }, [walk.walking]);

  /** Go to a target from the page (teleport menu, live events); resolves like a URL target */
  const navigate = (req: TwinNavRequest) => {
    if (isLocationsLoading) return;
    const plan = resolveTwinNav(req, navContext());
    if (plan === 'wait') {
      showNote('The equipment list is still loading: try again in a moment');
      return;
    }
    requestNav(plan, true);
  };

  // ---------------------------------------------------------------- walk mode

  /** Toolbar Walk button: enter at the view's entry point (mouse look on at once), or leave */
  const toggleWalk = () => {
    const viewer = viewerRef.current;
    if (!viewer || isLoading) return;
    if (viewer.isWalking()) {
      viewer.exitWalk();
      return;
    }
    if (!viewer.enterWalk(scopeSpawn(scopeId) ?? undefined)) {
      showNote('Walk mode: there is nowhere to stand in this view');
      return;
    }
    viewer.lockPointer();
  };

  /** Walk button dragged over the page: preview the landing spot under the pointer */
  const previewWalk = (clientX: number, clientY: number): boolean | null => {
    const viewer = viewerRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    const over =
      !!rect &&
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;
    if (!viewer || !over || isLoading) {
      viewer?.clearSpawnPreview();
      return null;
    }
    return viewer.previewSpawn(clientX, clientY)?.valid ?? null;
  };

  /** Walk button dropped: land on the spot under the pointer */
  const dropWalk = (clientX: number, clientY: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (previewWalk(clientX, clientY) === null) {
      viewer.clearSpawnPreview();
      return;
    }
    if (viewer.spawnAt(clientX, clientY)) viewer.lockPointer();
    else showNote('Can’t land there: drop the walker on a free floor spot');
  };

  const cancelWalkDrag = () => viewerRef.current?.clearSpawnPreview();

  const exitWalk = useCallback(() => viewerRef.current?.exitWalk(), []);

  /** Teleport: equipment of the view in place; anything else through a plan (scope switch) */
  const teleport = (target: TwinTeleport) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (target.kind === 'equipment') {
      const spawn = viewer.getNode(target.nodeId) ? viewer.spawnNear(target.nodeId) : null;
      if (spawn) viewer.teleport(spawn);
      else showNote('No free spot to stand near it');
    } else if (target.kind === 'location') {
      navigate({ locationId: target.locationId, keepScope: true, walk: true, select: false });
    } else {
      // a live event: go there and show its dashboard (the site view keeps it, as the menu's)
      navigate({ asset: target.alias, walk: true, keepScope: true });
    }
  };

  /** What teleporting to a backend equipment leads to (event Teleport buttons) */
  const assetTarget = (alias: string) => resolveAssetTarget(alias, navContext());

  /** Name of the building part (room, roof, stair) the walking player stands in */
  const structureNames = useMemo(
    () => new Map(scopeStructures.map((s) => [s.id, s.name])),
    [scopeStructures]
  );
  const walkPlace = useCallback(() => {
    const viewer = viewerRef.current;
    const pose = viewer?.getWalkPose();
    const key = pose ? viewer?.structureAt(pose.position) : null;
    return key ? (structureNames.get(key) ?? null) : null;
  }, [structureNames]);

  /** Teleport menu: the twin's 3D locations (entry points) and the equipment of the view */
  const teleportEquipment = useMemo(
    () =>
      equipment.map((eq) => ({
        id: eq.id,
        name: eq.name,
        tag: eq.props.dt_tag ? String(eq.props.dt_tag) : undefined,
      })),
    [equipment]
  );

  return {
    containerRef,
    viewerRef,
    overlay: live.overlay,
    activeAssetAlias: live.activeAssetAlias,
    selectParameter: live.selectParameter,
    hasInstrument: live.hasInstrument,
    selectAsset: live.selectAsset,
    tree,
    locationTree,
    path,
    activeId,
    activeNode,
    selectionKey,
    hoverNode: hoverId ? index.get(hoverId) : undefined,
    scopeId,
    scopeName: scope?.name ?? '',
    /** anything to render: equipment or building structures (an empty room is a valid scene) */
    hasModels: scopeModels.length > 0 || scopeStructures.length > 0,
    hasEquipment: scopeModels.length > 0,
    isLocationsLoading,
    isLocationsError,
    isLoading,
    progress,
    error,
    isolate,
    setIsolate,
    showTags,
    setShowTags,
    statusTint,
    setStatusTint,
    seeThrough,
    setSeeThrough,
    labelsOnHover,
    setLabelsOnHover,
    selectNode,
    goUp,
    resetView,
    overviewOpen,
    setOverviewOpen,
    note,
    showNote,
    walk,
    exitHold: walk.walking ? exitHold : null,
    walkTarget: walkTargetId ? index.get(walkTargetId) : undefined,
    toggleWalk,
    previewWalk,
    dropWalk,
    cancelWalkDrag,
    exitWalk,
    teleport,
    assetTarget,
    walkPlace,
    teleportEquipment,
  };
};
