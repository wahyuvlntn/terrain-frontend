import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import {
  MemoryRouter,
  NavigateFunction,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocationType } from '../location-overview/api/location-overview.api';
import { useDigitalTwin } from './digital-twin.hook';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock('@digital-twin/components', () => import('./testing/digital-twin-components.mock'));
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

const api = vi.hoisted(() => ({ getAllLocations: vi.fn() }));
vi.mock('../location-overview/api/location-overview.api', () => api);

/** the backend equipment the twin knows (alias, location id) */
const live = vi.hoisted(() => ({
  assets: [
    { alias: 'CH_02', locationId: 10 },
    { alias: 'CT_01', locationId: 14 },
    { alias: 'PCWP_01', locationId: 11 },
    { alias: 'MAU_01', locationId: 6 },
    { alias: 'UNMODELED_01', locationId: 999 },
  ],
}));
vi.mock('./digital-twin.live', () => ({
  useTwinLive: () => ({
    assets: live.assets,
    overlay: null,
    activeAssetAlias: undefined,
    selectParameter: () => undefined,
    hasInstrument: () => false,
    selectAsset: () => undefined,
  }),
}));

/**
 * The 3D viewer without three.js: a scope load waits for `finish()` (loading a GLB takes
 * seconds), walk mode is a flag reported like the real viewer does
 */
const fake = vi.hoisted(() => {
  type Entry = { key: string; name: string; structure?: boolean; showWithin?: number };
  type WalkChange = (s: { walking: boolean; locked: boolean; lookMode: string }) => void;
  const viewers: FakeViewer[] = [];
  class FakeViewer {
    walking = false;
    /** false: there is nowhere to stand (enterWalk fails) */
    canWalk = true;
    loaded = new Set<string>();
    /** the entries of the latest scope load */
    entries: Entry[] = [];
    private pending: (() => void) | null = null;
    enterWalk = vi.fn((_spawn?: unknown) => {
      if (!this.canWalk) return false;
      if (!this.walking) {
        this.walking = true;
        this.emit();
      }
      return true;
    });
    exitWalk = vi.fn(() => {
      if (!this.walking) return;
      this.walking = false;
      this.emit();
    });
    select = vi.fn();
    teleport = vi.fn();
    lockPointer = vi.fn();
    unlockPointer = vi.fn();
    constructor(
      _el: unknown,
      private opts: { onWalkChange?: WalkChange }
    ) {
      viewers.push(this);
    }
    private emit() {
      this.opts.onWalkChange?.({ walking: this.walking, locked: false, lookMode: 'pointer-lock' });
    }
    loadScope(entries: Entry[]) {
      this.loaded = new Set();
      this.entries = entries;
      return new Promise((resolve) => {
        this.pending = () => {
          entries.forEach((e) => this.loaded.add(e.key));
          resolve(
            entries
              .filter((e) => !e.structure)
              .map((e) => ({ id: e.key, name: e.name, kind: 'equipment', props: {}, children: [] }))
          );
        };
      });
    }
    /** the latest scope load completes */
    finish() {
      const done = this.pending;
      this.pending = null;
      done?.();
    }
    get loading() {
      return !!this.pending;
    }
    getNode(id: string) {
      return this.loaded.has(id) ? { id } : undefined;
    }
    isWalking() {
      return this.walking;
    }
    spawnNear(id: string) {
      return { position: [0, 0, 0], yaw: 0, near: id };
    }
    defaultSpawn() {
      return { position: [9, 9, 9] };
    }
    getWalkPose() {
      return this.walking ? { position: [0, 0, 0], yaw: 0, pitch: 0 } : null;
    }
    structureAt() {
      return null;
    }
    hasAmhs() {
      return false;
    }
    parentOfSelection() {
      return null;
    }
    previewSpawn() {
      return null;
    }
    spawnAt() {
      return false;
    }
    setIsolate = vi.fn();
    setLabelsVisible = vi.fn();
    setSeeThrough = vi.fn();
    setBadgesOnHover = vi.fn();
    setSite = vi.fn();
    resetView = vi.fn();
    frameEntries = vi.fn();
    clearSpawnPreview = vi.fn();
    dispose = vi.fn();
  }
  return { FakeViewer, viewers };
});
vi.mock('./viewer/twin-viewer', () => ({ TwinViewer: fake.FakeViewer }));

/** the demo plant's locations (simulator seed), as the locations API lists them */
const LOCATIONS: [number, string, number | null][] = [
  [1, 'FAB1 Wafer Fab', null],
  [2, 'FAB1 L1 Sub-Fab', 1],
  [3, 'Sub-Fab Bay A (Etch)', 2],
  [4, 'Sub-Fab Bay B (CVD)', 2],
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
const rows = (only?: (id: number) => boolean): LocationType[] =>
  LOCATIONS.filter(([id]) => !only || only(id)).map(([locationId, locationName, parentId]) => ({
    locationId,
    locationName,
    parentId,
    availabilityTh: 0,
    performanceTh: 0,
    qualityTh: 0,
    locationImagePath: '',
    hierarchy: depth(locationId),
  }));

type Twin = ReturnType<typeof useDigitalTwin>;
const page = {
  twin: undefined as unknown as Twin,
  search: '',
  navType: '',
  navigate: undefined as unknown as NavigateFunction,
};
const Harness = () => {
  const twin = useDigitalTwin();
  const location = useLocation();
  page.twin = twin;
  page.search = location.search;
  page.navType = useNavigationType();
  page.navigate = useNavigate();
  return <div ref={twin.containerRef} />;
};
const params = () => Object.fromEntries(new URLSearchParams(page.search));
const go = (to: string | number) =>
  act(async () => {
    await (typeof to === 'number' ? page.navigate(to) : page.navigate(to));
  });

/** The twin page at `url`, its locations and first scope loaded */
const mount = async (url: string, locations = rows()) => {
  api.getAllLocations.mockResolvedValue(locations);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Harness />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const viewer = fake.viewers[fake.viewers.length - 1];
  await waitFor(() => expect(viewer.loading).toBe(true));
  await act(async () => viewer.finish());
  return viewer;
};

const TOWER = 'cooling-tower-yard/ct-01';

beforeEach(() => {
  fake.viewers.length = 0;
});
afterEach(cleanup);

describe('useDigitalTwin navigation', () => {
  it('consumes a URL target (replace) and applies it once its scope is loaded', async () => {
    const viewer = await mount('/digital-twin?node=loc-10');
    // the assistant's link: no node, a target in another scope, walk mode
    await go('/digital-twin?asset=CT_01&param=fan_speed&view=walk');
    await waitFor(() => expect(params()).toEqual({ node: 'loc-14', view: 'walk' }));
    expect(page.navType).toBe('REPLACE');
    expect(viewer.enterWalk).not.toHaveBeenCalled();

    await act(async () => viewer.finish());
    expect(page.twin.scopeId).toBe('loc-14');
    expect(viewer.enterWalk).toHaveBeenCalledTimes(1);
    expect(viewer.enterWalk).toHaveBeenCalledWith({ position: [0, 0, 0], yaw: 0, near: TOWER });
    // no instrument bound to fan_speed is loaded: the equipment itself, mouse freed for its card
    expect(viewer.select).toHaveBeenLastCalledWith(TOWER);
    expect(page.twin.activeId).toBe(TOWER);
    expect(viewer.unlockPointer).toHaveBeenCalled();

    // applied once
    await act(async () => page.twin.setShowTags(true));
    expect(viewer.enterWalk).toHaveBeenCalledTimes(1);
    expect(viewer.select.mock.calls.filter(([id]) => id === TOWER)).toHaveLength(1);
  });

  it('drops a plan when the scope changes while its scope loads', async () => {
    const viewer = await mount('/digital-twin?node=loc-10');
    act(() => page.twin.teleport({ kind: 'asset', alias: 'CT_01' }));
    await waitFor(() => expect(params().node).toBe('loc-14'));
    expect(viewer.loading).toBe(true);
    // the user opens another room before the tower yard is there
    act(() => page.twin.selectNode('loc-11'));
    await waitFor(() => expect(params().node).toBe('loc-11'));
    await act(async () => viewer.finish());
    expect(viewer.enterWalk).not.toHaveBeenCalled();
    expect(viewer.select).not.toHaveBeenCalledWith(TOWER);

    // a walk link is followed again (a stale plan blocked the URL's view)
    await go('/digital-twin?node=loc-11&view=walk');
    expect(viewer.enterWalk).toHaveBeenCalledTimes(1);
    expect(page.twin.walk.walking).toBe(true);

    // opening the tower yard later does not replay the old target: the player enters at its spawn
    act(() => page.twin.selectNode('loc-14'));
    await waitFor(() => expect(viewer.loading).toBe(true));
    await act(async () => viewer.finish());
    expect(viewer.enterWalk).toHaveBeenCalledTimes(1);
    expect(viewer.select).not.toHaveBeenCalledWith(TOWER);
    expect(viewer.teleport).toHaveBeenCalledWith(
      expect.objectContaining({ position: [4.5, 6.3, 2.8] })
    );
  });

  it('?view=walk enters walk mode at the scope entry point; Back and Forward follow', async () => {
    const viewer = await mount('/digital-twin?node=loc-10');
    await go('/digital-twin?node=loc-10&view=walk');
    expect(viewer.enterWalk).toHaveBeenCalledWith(
      expect.objectContaining({ position: [-6.6, 0, 3.3] })
    );
    expect(page.twin.walk.walking).toBe(true);

    await go(-1);
    expect(params()).toEqual({ node: 'loc-10' });
    expect(viewer.exitWalk).toHaveBeenCalledTimes(1);
    expect(page.twin.walk.walking).toBe(false);

    await go(1);
    expect(viewer.enterWalk).toHaveBeenCalledTimes(2);
    expect(page.twin.walk.walking).toBe(true);
  });

  it('removes view=walk and says so when there is nowhere to stand', async () => {
    const viewer = await mount('/digital-twin?node=loc-10');
    viewer.canWalk = false;
    await go('/digital-twin?node=loc-10&view=walk');
    await waitFor(() => expect(params()).toEqual({ node: 'loc-10' }));
    expect(page.twin.note?.text).toBe('Walk mode: there is nowhere to stand in this view');
    expect(page.twin.walk.walking).toBe(false);
  });

  it('a target with nowhere to go in 3D leaves a walking player in place', async () => {
    const viewer = await mount('/digital-twin?node=loc-10');
    await go('/digital-twin?node=loc-10&view=walk');
    expect(viewer.enterWalk).toHaveBeenCalledTimes(1);

    // An event from an asset outside the modelled locations.
    act(() => page.twin.teleport({ kind: 'asset', alias: 'UNMODELED_01' }));
    await waitFor(() =>
      expect(page.twin.note?.text).toBe('UNMODELED_01 is not modelled in 3D yet')
    );
    expect(viewer.enterWalk).toHaveBeenCalledTimes(1);
    expect(viewer.teleport).not.toHaveBeenCalled();
    expect(params()).toEqual({ node: 'loc-10', view: 'walk' });
  });

  it('teleports from CUB to a live FAB1 MAU after its room finishes loading', async () => {
    const viewer = await mount('/digital-twin?node=loc-10');
    act(() => page.twin.teleport({ kind: 'asset', alias: 'MAU_01' }));
    await waitFor(() => expect(params().node).toBe('loc-6'));
    expect(viewer.enterWalk).not.toHaveBeenCalled();
    await act(async () => viewer.finish());
    expect(viewer.enterWalk).toHaveBeenCalledWith({
      position: [0, 0, 0],
      yaw: 0,
      near: 'fab1-mau-north/mau-01',
    });
    expect(viewer.select).toHaveBeenLastCalledWith('fab1-mau-north/mau-01');
    expect(page.twin.scopeId).toBe('loc-6');
    expect(params()).toEqual({ node: 'loc-6', view: 'walk' });
    expect(page.twin.note).toBeNull();
  });

  it('panel=plant-overview opens the overview only where the twin holds the plant', async () => {
    await mount('/digital-twin?node=loc-10');
    await go('/digital-twin?panel=plant-overview');
    await waitFor(() => expect(page.twin.overviewOpen).toBe(true));
    expect(params()).toEqual({ node: 'loc-10' });
    cleanup();

    // a user whose locations are the fab only
    await mount(
      '/digital-twin?node=loc-1',
      rows((id) => id <= 7)
    );
    await go('/digital-twin?node=loc-1&panel=plant-overview');
    await waitFor(() =>
      expect(page.twin.note?.text).toBe(
        'The plant overview is not available: the chiller plant is not in your locations'
      )
    );
    expect(page.twin.overviewOpen).toBe(false);
    expect(params()).toEqual({ node: 'loc-1' });
  });
});

describe('useDigitalTwin default view', () => {
  const FAB1 = expect.arrayContaining(['fab1-building/building']);
  const showWithin = (viewer: { entries: { key: string; showWithin?: number }[] }, key: string) =>
    viewer.entries.find((e) => e.key === key)?.showWithin;

  it('opens the campus framed on FAB1 without writing node; Frame returns there', async () => {
    const viewer = await mount('/digital-twin');
    expect(page.twin.scopeId).toBe('site');
    expect(params()).toEqual({});
    expect(viewer.frameEntries).toHaveBeenCalledTimes(1);
    expect(viewer.frameEntries).toHaveBeenCalledWith(FAB1);
    // framed from past the site's proximity limit: FAB1 is drawn in full, the CUB as before
    expect(showWithin(viewer, 'fab1-building/plenum')).toBeUndefined();
    expect(showWithin(viewer, 'fab1-mau-north/mau-01')).toBeUndefined();
    expect(showWithin(viewer, 'central-plant/ch-02')).toBe(60);

    act(() => page.twin.resetView());
    expect(viewer.frameEntries).toHaveBeenCalledTimes(2);
    expect(viewer.resetView).not.toHaveBeenCalled();
    // with a selection the Frame button frames it, as before
    act(() => page.twin.selectNode('central-plant/ch-02'));
    act(() => page.twin.resetView());
    expect(viewer.resetView).toHaveBeenCalledTimes(1);
    expect(viewer.frameEntries).toHaveBeenCalledTimes(2);
  });

  it('an explicit node (a room, or the campus from the tree) is not framed on FAB1', async () => {
    const viewer = await mount('/digital-twin?node=loc-10');
    expect(viewer.frameEntries).not.toHaveBeenCalled();
    cleanup();

    const campus = await mount('/digital-twin?node=site');
    expect(page.twin.scopeId).toBe('site');
    act(() => page.twin.resetView());
    expect(campus.resetView).toHaveBeenCalledTimes(1);
    expect(campus.frameEntries).not.toHaveBeenCalled();
    expect(showWithin(campus, 'fab1-building/plenum')).toBe(60);
    cleanup();

    // a replay link (no node) opens the campus as before
    const replay = await mount('/digital-twin?replay=7');
    expect(page.twin.scopeId).toBe('site');
    act(() => page.twin.resetView());
    expect(replay.resetView).toHaveBeenCalledTimes(1);
    expect(replay.frameEntries).not.toHaveBeenCalled();
    // leaving it: the campus was not loaded as the default view (FAB1 not drawn in full)
    await go('/digital-twin');
    expect(replay.loading).toBe(false);
    act(() => page.twin.resetView());
    expect(replay.resetView).toHaveBeenCalledTimes(2);
    expect(replay.frameEntries).not.toHaveBeenCalled();
  });

  it('walking from the default view leaves its URL clean; event teleports stay in the campus', async () => {
    const viewer = await mount('/digital-twin');
    act(() => page.twin.toggleWalk());
    await waitFor(() => expect(params()).toEqual({ view: 'walk', node: 'site' }));

    // a live event's teleport (G): the player moves inside the campus, no room is loaded
    act(() => page.twin.teleport({ kind: 'asset', alias: 'CH_02' }));
    await waitFor(() => expect(viewer.select).toHaveBeenLastCalledWith('central-plant/ch-02'));
    expect(page.twin.scopeId).toBe('site');
    expect(viewer.loading).toBe(false);

    act(() => page.twin.exitWalk());
    await waitFor(() => expect(params()).toEqual({}));
    act(() => page.twin.selectNode('site'));
    act(() => page.twin.resetView());
    expect(viewer.frameEntries).toHaveBeenCalledTimes(2);
  });

  it('a fab-only user opens FAB1 framed; a CUB-only user the first scene as before', async () => {
    const fab = await mount(
      '/digital-twin',
      rows((id) => id <= 7)
    );
    expect(page.twin.scopeId).toBe('loc-1');
    expect(fab.frameEntries).toHaveBeenCalledWith(FAB1);
    cleanup();

    const cub = await mount(
      '/digital-twin',
      rows((id) => id >= 8)
    );
    expect(page.twin.scopeId).toBe('loc-12');
    expect(cub.frameEntries).not.toHaveBeenCalled();
  });

  it('Back to the default view frames FAB1 again', async () => {
    const viewer = await mount('/digital-twin');
    act(() => page.twin.selectNode('loc-10'));
    await waitFor(() => expect(params()).toEqual({ node: 'loc-10' }));
    await act(async () => viewer.finish());
    expect(viewer.frameEntries).toHaveBeenCalledTimes(1);

    await go(-1);
    await act(async () => viewer.finish());
    expect(page.twin.scopeId).toBe('site');
    expect(params()).toEqual({});
    expect(viewer.frameEntries).toHaveBeenCalledTimes(2);
  });

  it('a fresh ?asset= link opens the room of its target, not framed', async () => {
    const viewer = await mount('/digital-twin?asset=CT_01');
    await waitFor(() => expect(params()).toEqual({ node: 'loc-14' }));
    await act(async () => viewer.finish());
    expect(page.twin.scopeId).toBe('loc-14');
    expect(viewer.select).toHaveBeenLastCalledWith(TOWER);
    expect(viewer.frameEntries).not.toHaveBeenCalled();
  });

  it('a URL target waiting for the equipment list is not framed', async () => {
    const assets = live.assets;
    live.assets = undefined as unknown as typeof assets;
    try {
      const viewer = await mount('/digital-twin?asset=UNMODELED_01');
      expect(page.twin.scopeId).toBe('site');
      expect(params()).toEqual({ asset: 'UNMODELED_01' });
      expect(viewer.frameEntries).not.toHaveBeenCalled();
    } finally {
      live.assets = assets;
    }
  });

  it('a fab-only user: a fresh ?asset= link opens the room of its target', async () => {
    const viewer = await mount(
      '/digital-twin?asset=MAU_01',
      rows((id) => id <= 7)
    );
    await waitFor(() => expect(params()).toEqual({ node: 'loc-6' }));
    await act(async () => viewer.finish());
    expect(viewer.select).toHaveBeenLastCalledWith('fab1-mau-north/mau-01');
    expect(viewer.frameEntries).not.toHaveBeenCalled();
  });
});

describe('useDigitalTwin see-through walls', () => {
  afterEach(() => window.localStorage.removeItem('digitalTwin.seeThroughWalls'));

  it('starts see-through, applies a change to the viewer and remembers it', async () => {
    window.localStorage.removeItem('digitalTwin.seeThroughWalls');
    const viewer = await mount('/digital-twin?node=loc-10');
    expect(page.twin.seeThrough).toBe(true);
    expect(viewer.setSeeThrough).toHaveBeenLastCalledWith(true);

    await act(async () => page.twin.setSeeThrough(false));
    expect(viewer.setSeeThrough).toHaveBeenLastCalledWith(false);
    expect(window.localStorage.getItem('digitalTwin.seeThroughWalls')).toBe('false');
  });

  it('gives a new viewer the remembered solid walls', async () => {
    window.localStorage.setItem('digitalTwin.seeThroughWalls', 'false');
    const viewer = await mount('/digital-twin?node=loc-10');
    expect(page.twin.seeThrough).toBe(false);
    expect(viewer.setSeeThrough).toHaveBeenCalledWith(false);
    expect(viewer.setSeeThrough).not.toHaveBeenCalledWith(true);
  });
});
