import { DEFAULT_COLOR, STATUS_COLOR, StatusEnum } from '@digital-twin/components';
import {
  Box3,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  GridHelper,
  Group,
  HemisphereLight,
  Intersection,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Ray,
  Raycaster,
  RingGeometry,
  Scene,
  ShadowMaterial,
  Sphere,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
// @ts-ignore
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { TwinNode, TwinNodeKind } from '../digital-twin.types';
import { AmhsDriver, type AmhsState } from './twin-amhs';
import { batchStructure } from './twin-batch';
import { drawScreen, fab1ScreenDefinitions, ScreenRow } from './twin-screens';
import {
  isEscapeForWidget,
  isKeyForControl,
  isLockRefusal,
  isWalkKeyIgnored,
  LOCK_REFUSALS,
  LookPress,
  markerVisible,
  pressIsClick,
  pressMove,
  pressStart,
  structureAtPoint,
  translucentMesh,
  WALK,
  WALK_MARKERS,
  WalkCollider,
  WalkController,
  WalkHit,
  WalkWorld,
} from './twin-walk';

export type TwinModelEntry = {
  /** Unique key of the equipment (location id) — becomes the equipment node id */
  key: string;
  name: string;
  url: string;
  position?: [number, number, number];
  rotationY?: number;
  props?: Record<string, unknown>;
  /**
   * Text replacements applied to the model's dt_* strings, so one GLB can stand for several units
   * (e.g. { 'CHWP-01': 'CHWP-02' } turns the motor tag CHWP-01-M into CHWP-02-M)
   */
  retag?: Record<string, string>;
  /**
   * Context geometry (room shell, roof): rendered and framed with the scope, but not a node —
   * not pickable, hoverable, ghosted or badged, and without screens or rotating parts
   */
  structure?: boolean;
  /**
   * With `structure`: site context around the scope (a neighbouring building, a pipe bridge),
   * rendered but left out of the framing, the ground and the zoom range
   */
  context?: boolean;
};

export type TwinViewerOptions = {
  onSelect?: (id: string | null) => void;
  onHover?: (id: string | null) => void;
  onProgress?: (ratio: number) => void;
  labelClassName?: string;
  /** Class of the live status badge shown above each equipment */
  badgeClassName?: string;
  /** Walk mode started or ended, the pointer lock changed (mouse look on / off) or its look mode */
  onWalkChange?: (state: WalkViewState) => void;
  /**
   * While walking: what the crosshair points at (null = nothing), resolved like a click — the id
   * that E / a click would select (instrument part, else equipment or one level deeper)
   */
  onWalkTarget?: (id: string | null) => void;
  /**
   * While walking, keys the page acts on: T (assistant) and Tab (teleport menu) after the viewer
   * released the pointer; G (teleport to the newest event); F (full screen; called in the key
   * event, so the page can request full screen); Escape only while the pointer is free (the Esc
   * that releases the lock is the browser's) — the page exits walk mode on it. Their default
   * action is prevented, so no character reaches a field the key moves the focus to.
   */
  onWalkKey?: (key: 'T' | 'G' | 'Escape' | 'Tab' | 'F') => void;
};

/**
 * How mouse look works in walk mode: `pointer-lock` (a click on the view captures the mouse; a
 * drag also turns the view while it is free) or `drag` (the browser refused pointer lock in this
 * session: dragging turns the view and a click selects what the cursor points at)
 */
export type WalkLookMode = 'pointer-lock' | 'drag';

/** Walk mode as the viewer reports it */
export type WalkViewState = { walking: boolean; locked: boolean; lookMode: WalkLookMode };

/** Where to stand in walk mode: feet position (world) and heading (radians; 0 looks toward −Z) */
export type WalkSpawn = { position: [number, number, number]; yaw?: number };

export type TwinBadge = {
  /** Equipment node id */
  id: string;
  label: string;
  /** CSS colour of the status dot */
  color: string;
  title?: string;
};

/** Live state of an equipment shown as a tint of its model; running (null) is not tinted */
export type TwinUnitState = 'standby' | 'trip' | 'maintenance' | 'offline';

/**
 * What an equipment's status signal tower (SEMI E129 andon light, dt_signal) shows: running green
 * (amber added on a warning, red on a critical alarm), idle amber, tripped red flashing, planned
 * maintenance blue, offline / unknown dark
 */
export type TwinSignal = 'run' | 'run-warn' | 'run-alarm' | 'idle' | 'down' | 'pm' | 'off';
type SignalColor = 'red' | 'amber' | 'green' | 'blue';
/** the tower lamps' (unlit) GLB materials and the colour each lights in */
const SIGNAL_MATERIALS: Record<string, { color: SignalColor; lit: string }> = {
  FAB_SignalRed: { color: 'red', lit: '#ff3b30' },
  FAB_SignalAmber: { color: 'amber', lit: '#ffb21e' },
  FAB_SignalGreen: { color: 'green', lit: '#2fe07a' },
  FAB_SignalBlue: { color: 'blue', lit: '#3d8dff' },
};
const SIGNAL_LAMPS: Record<TwinSignal, Partial<Record<SignalColor, 'on' | 'flash'>>> = {
  run: { green: 'on' },
  'run-warn': { green: 'on', amber: 'on' },
  'run-alarm': { green: 'on', red: 'on' },
  idle: { amber: 'on' },
  down: { red: 'flash' },
  pm: { blue: 'on' },
  off: {},
};
const LAMP_GLOW = 2.4;
/** a flashing lamp is on / off for this long */
const FLASH_MS = 500;

type MaterialSlot = Material | Material[];
type StateTint = { css: string; fallback: string; intensity: number };

const DEFAULT_VIEW_DIR = new Vector3(-0.62, 0.42, 0.66).normalize();
/** orbit zoom-out limit: never below this, else a multiple of the scope's bounding radius */
const MIN_MAX_DISTANCE = 80;
const MAX_DISTANCE_RADII = 8;
const SELECT_EMISSIVE = new Color('#2f8fff');
const HOVER_EMISSIVE = new Color('#7fc4ff');
/**
 * Status tint per state: the app's status colour (a theme CSS variable; the hex is the default
 * theme's, used when the variable can't be read) and its emissive strength. A trip reads
 * strongest, standby only subtly.
 */
const UNIT_STATE_TINT: Record<TwinUnitState, StateTint> = {
  standby: {
    css: STATUS_COLOR[StatusEnum.enum.IDLE],
    fallback: DEFAULT_COLOR.statusIdlePrimary,
    intensity: 0.1,
  },
  trip: {
    css: STATUS_COLOR[StatusEnum.enum['UNPLANNED DOWN']],
    fallback: DEFAULT_COLOR.statusUnplanned_downPrimary,
    intensity: 0.35,
  },
  maintenance: {
    css: STATUS_COLOR[StatusEnum.enum['PLANNED DOWN']],
    fallback: DEFAULT_COLOR.statusPlanned_downPrimary,
    intensity: 0.25,
  },
  offline: {
    css: STATUS_COLOR[StatusEnum.enum.OFFLINE],
    fallback: DEFAULT_COLOR.statusOfflinePrimary,
    intensity: 0.2,
  },
};
const UNIT_STATES = Object.keys(UNIT_STATE_TINT) as TwinUnitState[];
const FLY_MS = 650;
const ORBIT_FOV = 40;
const WALK_FOV = 70;
/** the crosshair reaches equipment up to this far, refreshed at most this often */
const WALK_REACH = 12;
const WALK_PICK_MS = 80;
/** after exiting walk mode the orbit target is this far ahead of the eye */
const WALK_EXIT_TARGET = 5;
/** status badges float this far above their equipment's bounds */
const BADGE_LIFT = 0.35;
/** walking, a badge above a ceiling hangs this far under it instead */
const BADGE_CEILING_GAP = 0.15;
const UP = new Vector3(0, 1, 0);
const SPAWN_VALID = '#22c55e';
const SPAWN_INVALID = '#ef4444';
const AUTO_LAYOUT_GAP = 1.5;
/** frame interval while only rotating parts change (camera moves still render every frame) */
const ANIM_FRAME_MS = 33;
/** a frame this much early still counts (rAF timestamps jitter: 2 x 16.7 ms must not miss 33 ms) */
const ANIM_FRAME_SLACK_MS = 6;
/** Blender axis of dt_spin -> glTF / three.js local axis (the exporter converts Z-up to Y-up) */
const SPIN_AXES: Record<string, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 0, -1),
  z: new Vector3(0, 1, 0),
};

type Spinner = { object: Object3D; axis: Vector3; rps: number };
type ScopeEntry = { key: string; holder: Group; structure: boolean; context: boolean };
type WalkState = {
  controller: WalkController;
  /** KeyboardEvent.code of the held movement keys */
  keys: Set<string>;
  jump: boolean;
  locked: boolean;
  /** crosshair target (drill-resolved) and when it was last picked */
  targetId: string | null;
  lastPick: number;
  /** a left press on the view while the pointer is free: drag-look or a click */
  press: LookPress | null;
  /** the last pointer-lock request (a failure decides whether the browser refuses the lock) */
  lockRequest: { at: number; activation: boolean } | null;
  /** when the badges and tag labels were last checked, and the next one to check */
  markersAt: number;
  markerCursor: number;
};
/** a status badge or tag label checked in walk mode; `skip` = colliders that don't hide it */
type WalkMarker = { object: CSS2DObject; skip: (collider: WalkCollider) => boolean };
type SpawnMarker = { group: Group; pad: Group; materials: MeshBasicMaterial[] };

const isMesh = (o: Object3D): o is Mesh => (o as Mesh).isMesh === true;
/** whether `o` is `ancestor` or lies inside it */
const isWithin = (o: Object3D | null, ancestor: Object3D) => {
  for (let p = o; p; p = p.parent) if (p === ancestor) return true;
  return false;
};
const _markerAnchor = new Vector3();
const _markerNdc = new Vector3();
const _occluderRay = new Ray();
const _occluderHit = new Vector3();

/** names of real glazing: it stays transparent when the walls are solid */
const GLASS_NAME = /glass|glaz|vision|window/i;
/**
 * A translucent structure material (wall, slab, trim, door, louvre, deck) that the see-through
 * walls choice turns solid. Glass stays glass.
 */
export const isSeeThroughMaterial = (m: Material) =>
  m.transparent && m.opacity < 0.95 && !GLASS_NAME.test(m.name);
/** in solid mode, the occluders of the selection are re-checked at most this often while moving */
const OCCLUDER_MS = 60;

/**
 * The browser refused pointer lock in this tab: walk mode looks around by dragging. Remembered for
 * the session (sessionStorage, and in memory when storage is unavailable).
 */
const LOCK_REFUSED_KEY = 'digitalTwin.pointerLockRefused';
let lockRefused: boolean | null = null;
const isLockRefused = () => {
  if (lockRefused === null) {
    try {
      lockRefused = window.sessionStorage.getItem(LOCK_REFUSED_KEY) === 'true';
    } catch {
      lockRefused = false;
    }
  }
  return lockRefused;
};
const rememberLockRefused = () => {
  lockRefused = true;
  try {
    window.sessionStorage.setItem(LOCK_REFUSED_KEY, 'true');
  } catch {
    // storage unavailable: remembered until the page reloads
  }
};
/**
 * When the pointer lock was last freed (performance.now). Module-wide, not per walk: browsers
 * refuse a re-lock for about a second after the user left it with Esc, also when walk mode was
 * left and entered again in between.
 */
let lastUnlockAt = Number.NEGATIVE_INFINITY;
/** consecutive pointer-lock failures that looked like a refusal (see LOCK_REFUSALS) */
let lockFailures = 0;
/** whether the current task runs in a user gesture (unknown: assume it does) */
const hasUserActivation = () =>
  (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive ??
  true;

const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
]);
/** heading of a view direction (0 = toward −Z) */
const yawOf = (dir: Vector3) => Math.atan2(-dir.x, -dir.z);
const asArray = (m: MaterialSlot) => (Array.isArray(m) ? m : [m]);
const humanize = (name: string) =>
  name
    .replace(/^Group_/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2');
/** "Condenser Tubes Pass 1" under the "Condenser" group reads as "Tubes Pass 1" */
const partName = (name: string, groupName: string) => {
  const full = humanize(name);
  return full.startsWith(`${groupName} `) ? full.slice(groupName.length + 1) : full;
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const dtProps = (o: Object3D, retag?: Record<string, string>) => {
  const pairs = Object.entries(retag ?? {});
  return Object.fromEntries(
    Object.entries(o.userData ?? {})
      .filter(([k]) => k.startsWith('dt_'))
      .map(([k, v]) => [
        k,
        typeof v === 'string' ? pairs.reduce((s, [from, to]) => s.split(from).join(to), v) : v,
      ])
  );
};
/** A CSS colour as a three.js colour; `var(--x)` is read from the document, so it follows the theme. */
const cssColor = (css: string, fallback: string) => {
  const variable = /^var\((--[^,)]+)/.exec(css);
  const value = variable
    ? getComputedStyle(document.documentElement).getPropertyValue(variable[1]).trim()
    : css;
  // three.js parses #rgb, #rrggbb, rgb() and hsl(); an alpha byte is dropped, anything else falls back
  const style = /^#[\da-f]{8}$/i.test(value) ? value.slice(0, 7) : value;
  const color = new Color(fallback);
  if (/^(#([\da-f]{3}){1,2}|(rgb|hsl)a?\(.*\))$/i.test(style)) color.setStyle(style);
  return color;
};

/**
 * Framework-agnostic three.js engine for the digital twin page.
 * Loads one "scope" (a location's equipment models plus its structure models: room shells, roof)
 * at a time and exposes a drill-down hierarchy over the equipment: equipment > subsystem group >
 * part, built from the GLB node tree + dt_* extras. Structures are only context geometry.
 */
export class TwinViewer {
  private readonly container: HTMLElement;
  private readonly opts: TwinViewerOptions;
  private readonly renderer: WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(ORBIT_FOV, 1, 0.05, 300);
  private readonly controls: OrbitControls;
  private readonly loader = new GLTFLoader();
  private readonly pmrem: PMREMGenerator;
  private readonly envTexture: Texture;
  private readonly raycaster = new Raycaster();
  private readonly resizeObserver: ResizeObserver;
  private readonly modelRoot = new Group();
  private readonly ground: Mesh;
  private readonly grid: GridHelper;
  private readonly sun: DirectionalLight;

  private readonly gltfCache = new Map<string, Promise<GLTF>>();
  /** structure models with their static meshes batched (twin-batch), cloned per scope load */
  private readonly batchedScenes = new Map<string, Object3D>();
  /** OHT vehicles (dt_vehicle) driven by the simulated transport, per model of the scope */
  private amhs: AmhsDriver[] = [];
  private amhsState: AmhsState | null = null;
  private amhsOffset = 0;
  private readonly nodes = new Map<string, TwinNode>();
  private readonly objects = new Map<string, Object3D>();
  private readonly objectIds = new WeakMap<Object3D, string>();
  private readonly originals = new Map<Mesh, MaterialSlot>();
  private readonly transparentMeshes = new WeakSet<Mesh>();
  /** Meshes of dt_spin parts: no shadow, since the shadow map isn't redrawn while they turn */
  private readonly spinMeshes = new WeakSet<Mesh>();
  private readonly selectCache = new Map<Material, Material>();
  private readonly hoverCache = new Map<Material, Material>();
  /** status tint: one clone cache and one (theme-resolved) colour per state */
  private readonly stateCaches = Object.fromEntries(
    UNIT_STATES.map((s) => [s, new Map<Material, Material>()])
  ) as Record<TwinUnitState, Map<Material, Material>>;
  private readonly stateColors = Object.fromEntries(
    UNIT_STATES.map((s) => [s, new Color(UNIT_STATE_TINT[s].fallback)])
  ) as Record<TwinUnitState, Color>;
  private readonly screens = new Map<
    string,
    { canvas: HTMLCanvasElement; texture: CanvasTexture; title: string }
  >();
  private readonly labels: CSS2DObject[] = [];
  private readonly badges = new Map<
    string,
    { object: CSS2DObject; dot: HTMLElement; text: HTMLElement }
  >();
  private readonly anchors = new Map<string, Vector3>();
  private readonly renderListeners = new Set<() => void>();
  /** rotating parts per equipment, with the current and target speed factor (0 stopped .. 1 running) */
  private readonly spinners = new Map<
    string,
    { parts: Spinner[]; speed: number; target: number }
  >();
  /** rotating parts of structures (rooftop exhaust fans): they always turn */
  private structureSpinners: Spinner[] = [];
  /** status signal tower lamps per equipment, by colour */
  private readonly signalLamps = new Map<string, Partial<Record<SignalColor, Mesh[]>>>();
  /** the material a lamp mesh shows (lit, flashing or its unlit original), over hover / tint */
  private readonly lampMaterials = new Map<Mesh, Material>();
  private readonly litLamps = new Map<Material, MeshStandardMaterial>();
  private readonly flashLamps = new Map<Material, MeshStandardMaterial>();
  /** signals of the scope's equipment; kept across scope loads like the status tint */
  private signals: Record<string, TwinSignal | null> = {};
  private flashOn = true;
  private flashing = false;
  private readonly ghostMaterial = new MeshBasicMaterial({
    color: '#8b97a8',
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
  });
  private readonly ghostHoverMaterial = new MeshBasicMaterial({
    color: '#7fc4ff',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  private equipmentIds: string[] = [];
  /** tinted equipment (id -> state); kept across scope loads, so a reload shows the tint at once */
  private unitStates: Record<string, TwinUnitState> = {};
  private selectedId: string | null = null;
  private hoverId: string | null = null;
  private isolate = true;
  private labelsVisible = false;
  private loadToken = 0;
  private frame = 0;
  private lastTick = 0;
  private lastRender = 0;
  private needsRender = true;
  private disposed = false;
  private pointerDown: { x: number; y: number; t: number } | null = null;
  private fly: { from: [Vector3, Vector3]; to: [Vector3, Vector3]; start: number } | null = null;
  /** the scope's model holders (equipment and structures) */
  private readonly entries: ScopeEntry[] = [];
  /** structure bounds for structureAt, measured on first use per scope */
  private structureBoxes: { key: string; box: Box3 }[] | null = null;
  /** collision world of the scope: built on first walk-mode use, dropped with the scope */
  private walkWorld: WalkWorld | null = null;
  private walk: WalkState | null = null;
  /** walk mode's badge / label list (rebuilt after the badges, labels or tag visibility change) */
  private walkMarkerList: WalkMarker[] | null = null;
  /** orbit-view (local) positions of the badges walk mode moved under a ceiling */
  private readonly badgeHomes = new Map<CSS2DObject, Vector3>();
  /** the Esc being handled closes an open drop-down (see handleWalkKeyCapture) */
  private escapeForWidget = false;
  private spawnMarker: SpawnMarker | null = null;
  /**
   * See-through walls: structure walls, slabs, trims and doors keep their translucent materials
   * (default). Off: they are drawn solid (glass stays glass); solid structures then block picks and
   * the walk-mode line of sight, and in the orbit view the ones between the camera and the
   * selection fade so it stays visible.
   */
  private seeThrough = true;
  /** the scope's structure meshes (walls, floors, roof, stairs, doors) with their GLB materials */
  private readonly structureOriginals = new Map<Mesh, MaterialSlot>();
  /** the structure meshes with see-through (translucent, not glass) materials */
  private readonly seeThroughMeshes = new Set<Mesh>();
  /** solid clone per see-through material, faded clone per opaque one (GLB materials are shared) */
  private readonly solidCache = new Map<Material, Material>();
  private readonly fadeCache = new Map<Material, Material>();
  /** solid mode, orbit view: structure meshes faded because they hide the selection */
  private fadedMeshes = new Set<Mesh>();
  /** world bounds of structure meshes (static while orbiting), measured on first use */
  private readonly meshBoxes = new WeakMap<Mesh, Box3>();
  /** the selection and camera the faded set was computed for, and when */
  private occluderKey = '';
  private occluderAt = 0;

  constructor(container: HTMLElement, opts: TwinViewerOptions = {}) {
    this.container = container;
    this.opts = opts;

    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    // shadows only change with the scene (see updateShadows), not with the camera; spinning parts
    // cast none. The first frame still needs a pass, or an empty map darkens the ground.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.outline = 'none';
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    // z-index 0 makes the layer its own stacking context: CSS2DRenderer numbers every label's
    // z-index, which would otherwise paint labels and badges over the overlay card and panels
    Object.assign(this.labelRenderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '0',
    });
    container.appendChild(this.labelRenderer.domElement);

    this.pmrem = new PMREMGenerator(this.renderer);
    this.envTexture = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.75;

    this.scene.add(new HemisphereLight('#ffffff', '#3d4450', 0.9));
    this.sun = new DirectionalLight('#ffffff', 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);

    this.ground = new Mesh(new PlaneGeometry(1, 1), new ShadowMaterial({ opacity: 0.22 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.grid = new GridHelper(1, 1, '#8a94a3', '#8a94a3');
    const gridMats = asArray(this.grid.material);
    gridMats.forEach((m) =>
      Object.assign(m, { transparent: true, opacity: 0.18, depthWrite: false })
    );
    this.scene.add(this.ground, this.grid, this.modelRoot);

    this.loader.setMeshoptDecoder(MeshoptDecoder);

    this.camera.position.copy(DEFAULT_VIEW_DIR).multiplyScalar(8);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 0.25;
    this.controls.maxDistance = MIN_MAX_DISTANCE;
    this.controls.addEventListener('change', this.requestRender);
    this.controls.addEventListener('start', this.cancelFly);

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.handlePointerDown);
    el.addEventListener('pointerup', this.handlePointerUp);
    el.addEventListener('pointercancel', this.handlePointerCancel);
    el.addEventListener('pointermove', this.handlePointerMove);
    el.addEventListener('pointerleave', this.handlePointerLeave);
    el.addEventListener('dblclick', this.handleDoubleClick);
    el.addEventListener('webglcontextlost', this.handleContextLost);

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
  }

  // ------------------------------------------------------------------ public API

  /**
   * Replace the rendered scope with the given equipment and structure models. Resolves with the
   * equipment nodes (structures are context geometry, not nodes).
   */
  async loadScope(entries: TwinModelEntry[]): Promise<TwinNode[]> {
    const token = ++this.loadToken;
    const total = entries.length || 1;
    const progress = new Array(entries.length).fill(0);
    const gltfs = await Promise.all(
      entries.map((e, i) => {
        const loading = this.loadGltf(e.url, (r) => {
          progress[i] = r;
          this.opts.onProgress?.(progress.reduce((a, b) => a + b, 0) / total);
        });
        // structures are optional context: a missing room / roof GLB must not fail the equipment
        return e.structure
          ? loading.catch((err: unknown) => {
              console.warn(`Digital twin: structure model ${e.url} not loaded`, err);
              return null;
            })
          : loading;
      })
    );
    if (token !== this.loadToken || this.disposed) return [];

    this.clearScope();
    // equipment without a position is laid out in a row; structures without one stay at the origin
    const autoLayout = entries.filter((e) => !e.structure).length > 1;
    let cursorX = 0;
    const equipment: TwinNode[] = [];
    entries.forEach((entry, i) => {
      const gltf = gltfs[i];
      if (!gltf) return;
      const holder = new Group();
      holder.name = entry.key;
      holder.add((entry.structure ? this.batchedScene(entry.url, gltf) : gltf.scene).clone(true));
      if (entry.rotationY) holder.rotation.y = (entry.rotationY * Math.PI) / 180;
      if (entry.position) {
        holder.position.fromArray(entry.position);
      } else if (autoLayout && !entry.structure) {
        const size = new Box3().setFromObject(holder).getSize(new Vector3());
        holder.position.x = cursorX + size.x / 2;
        cursorX += size.x + AUTO_LAYOUT_GAP;
      }
      this.modelRoot.add(holder);
      this.entries.push({
        key: entry.key,
        holder,
        structure: !!entry.structure,
        context: !!(entry.structure && entry.context),
      });
      // structures stay out of nodes / objects / originals: nothing picks, tints or ghosts them
      if (!entry.structure) equipment.push(this.registerEquipment(entry, holder));
    });
    this.equipmentIds = equipment.map((n) => n.id);
    this.entries.forEach(({ holder }) => {
      const driver = new AmhsDriver(holder);
      if (!driver.size) return driver.dispose();
      driver.setState(this.amhsState, this.amhsOffset);
      driver.step(Date.now());
      this.amhs.push(driver);
    });
    this.entries.forEach(({ holder, structure }) => {
      if (!structure) return;
      holder.traverse((o) => {
        const axis = SPIN_AXES[String(o.userData?.dt_spin ?? '')];
        if (!axis) return;
        this.structureSpinners.push({ object: o, axis, rps: Number(o.userData.dt_spin_rps ?? 1) });
        o.traverse((m) => {
          if (isMesh(m)) m.castShadow = false;
        });
      });
    });
    this.applySignals();
    this.entries.forEach(({ holder, structure }) => {
      if (!structure) return;
      holder.traverse((o) => {
        if (!isMesh(o)) return;
        this.structureOriginals.set(o, o.material);
        if (asArray(o.material).some(isSeeThroughMaterial)) this.seeThroughMeshes.add(o);
      });
    });
    this.applyStructureMode();

    this.fitStage();
    this.applyVisualState();
    if (this.walk) this.rebuildWalk();
    else this.focus(null, false);
    this.opts.onProgress?.(1);
    return equipment;
  }

  getNode(id: string) {
    return this.nodes.get(id);
  }

  getSelected() {
    return this.selectedId;
  }

  /**
   * Select a node (or null for the whole scope). Does not echo back through onSelect. While
   * walking the camera stays with the player (no fly-to).
   */
  select(id: string | null, opts: { focus?: boolean } = {}) {
    const next = id && this.nodes.has(id) ? id : null;
    this.selectedId = next;
    this.applyVisualState();
    if (opts.focus ?? true) this.focus(next);
  }

  /** Parent of the current selection inside the model hierarchy (null = scope root) */
  parentOfSelection() {
    const node = this.selectedId ? this.nodes.get(this.selectedId) : undefined;
    return node?.parentId ?? null;
  }

  resetView() {
    this.focus(this.selectedId);
  }

  setIsolate(enabled: boolean) {
    this.isolate = enabled;
    this.occluderKey = '';
    this.applyVisualState();
  }

  setLabelsVisible(visible: boolean) {
    this.labelsVisible = visible;
    this.labels.forEach((l) => (l.visible = visible));
    // walking: only the ones in range and in sight
    this.walkMarkerList = null;
    this.updateWalkMarkers(performance.now(), true);
    this.requestRender();
  }

  /**
   * See-through walls on (the default: walls, slabs, roofs, trims and doors are translucent) or off
   * (they are drawn solid; glass stays transparent). Off, solid structures block picking, the
   * walk-mode crosshair and landing preview, and in the orbit view the structures between the
   * camera and the selection fade, so selected equipment inside a room stays visible (with
   * see-through walls that happens while isolate is on).
   */
  setSeeThrough(enabled: boolean) {
    if (this.seeThrough === enabled) return;
    this.seeThrough = enabled;
    this.fadedMeshes = new Set();
    this.occluderKey = '';
    this.applyStructureMode();
    this.walkWorld?.refreshTransparency(this.isLookThrough);
    if (this.walk) this.updateWalkTarget(performance.now(), true);
  }

  getSeeThrough() {
    return this.seeThrough;
  }

  /** Redraw one of the equipment's screens (HMI_Screen, VFD_Display) — hook for live data */
  setScreenRows(
    equipmentKey: string,
    screenName: string,
    rows: ScreenRow[],
    status?: string,
    statusColor?: string
  ) {
    const screen = this.screens.get(`${equipmentKey}/${screenName}`);
    if (!screen) return;
    drawScreen(screen.canvas, screen.title, rows, status, statusColor);
    screen.texture.needsUpdate = true;
    this.requestRender();
  }

  /**
   * Screen position (container pixels) of a node's anchor — the top centre of its bounds —
   * for HTML overlays that point at it. `visible` is false when it is behind the camera.
   */
  projectNode(id: string): { x: number; y: number; visible: boolean } | null {
    const obj = this.objects.get(id);
    if (!obj) return null;
    let anchor = this.anchors.get(id);
    if (!anchor) {
      const box = new Box3().setFromObject(obj);
      if (box.isEmpty()) return null;
      const c = box.getCenter(new Vector3());
      anchor = new Vector3(c.x, box.max.y, c.z);
      this.anchors.set(id, anchor);
    }
    const p = anchor.clone().project(this.camera);
    const { clientWidth: w, clientHeight: h } = this.container;
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, visible: p.z < 1 && p.z > -1 };
  }

  /** Called after every rendered frame (camera moves, selection, resize). */
  addRenderListener(listener: () => void) {
    this.renderListeners.add(listener);
    this.requestRender();
    return () => {
      this.renderListeners.delete(listener);
    };
  }

  /**
   * Which equipment is in motion and how fast: true / 1 = the parts' dt_spin_rps, a number = that
   * fraction of it (e.g. a fan at 60 % speed), false / 0 = stopped. The parts ramp to the new rate
   * (spin up, coast down).
   */
  setEquipmentMotion(motion: Record<string, boolean | number>) {
    this.spinners.forEach((s, id) => {
      const rate = Number(motion[id] ?? 0);
      s.target = Number.isFinite(rate) ? Math.min(Math.max(rate, 0), 2) : 0;
    });
    this.requestRender();
  }

  /**
   * Live state of the scope's equipment (replaces the previous set): an equipment that isn't
   * running is tinted in its status colour; null or a missing id = no tint. Structures and the
   * unlit screens are never tinted, and shadows are unaffected.
   */
  setEquipmentStates(states: Record<string, TwinUnitState | null>) {
    const recoloured = this.refreshStateColors();
    const next: Record<string, TwinUnitState> = {};
    Object.entries(states).forEach(([id, state]) => {
      if (state && UNIT_STATE_TINT[state]) next[id] = state;
    });
    const prev = this.unitStates;
    const changed =
      Object.keys(next).length !== Object.keys(prev).length ||
      Object.entries(next).some(([id, state]) => prev[id] !== state);
    this.unitStates = next;
    if (changed) this.applyVisualState();
    else if (recoloured) this.requestRender();
  }

  /**
   * The simulated overhead transport (null: none, the vehicles stand parked) and the server clock
   * minus the client clock in ms; kept across scope loads. The vehicles show it AMHS_DELAY_MS behind.
   */
  setAmhs(state: AmhsState | null, offsetMs = 0) {
    this.amhsState = state;
    this.amhsOffset = offsetMs;
    this.amhs.forEach((d) => d.setState(state, offsetMs));
  }

  /** whether the scope has simulated OHT vehicles */
  hasAmhs() {
    return this.amhs.length > 0;
  }

  /**
   * Status signal towers of the scope's equipment (replaces the previous set; a missing id is
   * dark). The lamps keep their colours under the hover, selection and status tints.
   */
  setEquipmentSignals(signals: Record<string, TwinSignal | null>) {
    this.signals = signals;
    if (this.applySignals()) this.applyVisualState();
  }

  /** Point every tower lamp at its lit / flashing / unlit material; true when one changed */
  private applySignals() {
    let changed = false;
    let flashing = false;
    this.signalLamps.forEach((lamps, id) => {
      const on = SIGNAL_LAMPS[this.signals[id] ?? 'off'] ?? {};
      (Object.keys(lamps) as SignalColor[]).forEach((color) => {
        const mode = on[color];
        if (mode === 'flash') flashing = true;
        lamps[color]?.forEach((mesh) => {
          const orig = this.originals.get(mesh);
          if (!orig || Array.isArray(orig)) return;
          const next = mode ? this.lampMaterial(orig, mode === 'flash') : orig;
          if (this.lampMaterials.get(mesh) !== next) {
            this.lampMaterials.set(mesh, next);
            changed = true;
          }
        });
      });
    });
    this.flashing = flashing;
    return changed;
  }

  private lampMaterial(orig: Material, flash: boolean) {
    const cache = flash ? this.flashLamps : this.litLamps;
    let m = cache.get(orig);
    if (!m) {
      const lit = new Color(SIGNAL_MATERIALS[orig.name]?.lit ?? '#ffffff');
      m = new MeshStandardMaterial({
        name: `${orig.name}:lit`,
        color: lit,
        emissive: lit,
        emissiveIntensity: flash && !this.flashOn ? 0 : LAMP_GLOW,
        roughness: 0.3,
      });
      m.userData = { lit, dim: (orig as MeshStandardMaterial).color?.clone() ?? new Color('#333') };
      if (flash && !this.flashOn) m.color.copy(m.userData.dim);
      cache.set(orig, m);
    }
    return m;
  }

  /** Flash the lamps of tripped equipment; true when they changed this frame */
  private stepFlash(now: number) {
    if (!this.flashing) return false;
    const on = Math.floor(now / FLASH_MS) % 2 === 0;
    if (on === this.flashOn) return false;
    this.flashOn = on;
    this.flashLamps.forEach((m) => {
      m.emissiveIntensity = on ? LAMP_GLOW : 0;
      m.color.copy(on ? m.userData.lit : m.userData.dim);
    });
    return true;
  }

  /** Live status badges above the equipment of the scope (replaces the previous set). */
  setEquipmentBadges(badges: TwinBadge[]) {
    const keep = new Set(badges.map((b) => b.id));
    const count = this.badges.size;
    let changed = false;
    this.badges.forEach((b, id) => {
      if (!keep.has(id)) {
        b.object.element.remove();
        b.object.removeFromParent();
        this.badges.delete(id);
        changed = true;
      }
    });
    badges.forEach((badge) => {
      const obj = this.objects.get(badge.id);
      if (!obj) return;
      let entry = this.badges.get(badge.id);
      if (!entry) {
        const el = document.createElement('div');
        el.className = this.opts.badgeClassName ?? '';
        el.style.pointerEvents = 'auto';
        const dot = document.createElement('span');
        const text = document.createElement('span');
        el.append(dot, text);
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.selectFromView(badge.id);
        });
        const object = new CSS2DObject(el);
        const box = new Box3().setFromObject(obj);
        const top = new Vector3(
          (box.min.x + box.max.x) / 2,
          box.max.y + BADGE_LIFT,
          (box.min.z + box.max.z) / 2
        );
        object.position.copy(obj.worldToLocal(top));
        obj.add(object);
        entry = { object, dot, text };
        this.badges.set(badge.id, entry);
      }
      entry.dot.style.background = badge.color;
      entry.text.textContent = badge.label;
      entry.object.element.title = badge.title ?? badge.label;
    });
    // walking: new badges show only in range and in sight
    if (changed || this.badges.size !== count) {
      this.walkMarkerList = null;
      this.updateWalkMarkers(performance.now(), true);
    }
    this.requestRender();
  }

  // ------------------------------------------------------------------ walk mode (first person)

  /**
   * Enter first-person walk mode at `spawn` (default: defaultSpawn()), or move there when already
   * walking. False when there is nothing to stand on (no scope loaded, or no free spot found).
   * Orbit controls are off and isolate ghosting is suspended while walking; the camera has a 70°
   * field of view and renders every frame. W A S D / arrows, Shift (run), Space (jump), E (select)
   * and mouse look are handled here through document listeners that live only while walking;
   * events from fields and from the AI assistant panel are left alone. A click on the view locks
   * the pointer for mouse look; a click or E while locked selects the crosshair target through
   * onSelect and releases the pointer, so the dashboard can be used. While the pointer is free a
   * drag on the view turns it; once the browser refused pointer lock (lookMode `drag`) a click
   * selects what the cursor points at instead. Status badges and tag labels show only within
   * 20 m and in line of sight.
   */
  enterWalk(spawn?: WalkSpawn): boolean {
    if (this.disposed) return false;
    const world = this.ensureWalkWorld();
    const start = spawn ?? this.defaultSpawn();
    if (!world || !start) return false;
    if (!this.walk) {
      this.walk = {
        controller: new WalkController(world),
        keys: new Set(),
        jump: false,
        locked: false,
        targetId: null,
        lastPick: 0,
        press: null,
        lockRequest: null,
        markersAt: 0,
        markerCursor: 0,
      };
      this.fly = null;
      this.controls.enabled = false;
      this.camera.fov = WALK_FOV;
      this.camera.rotation.order = 'YXZ';
      this.camera.updateProjectionMatrix();
      this.renderer.domElement.style.cursor = 'crosshair';
      if (this.hoverId) {
        this.hoverId = null;
        this.opts.onHover?.(null);
      }
      // a focused button (the Walk button itself) would take Space; fields keep their focus
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body && !isWalkKeyIgnored(active))
        active.blur();
      document.addEventListener('keydown', this.handleWalkKeyCapture, true);
      document.addEventListener('keydown', this.handleWalkKeyDown);
      document.addEventListener('keyup', this.handleWalkKeyUp);
      document.addEventListener('mousemove', this.handleWalkMouseMove);
      document.addEventListener('mousedown', this.handleWalkMouseDown);
      document.addEventListener('pointerlockchange', this.handlePointerLockChange);
      document.addEventListener('pointerlockerror', this.handlePointerLockError);
      window.addEventListener('blur', this.handleWalkBlur);
      this.applyVisualState();
    }
    const { controller } = this.walk;
    controller.place(new Vector3().fromArray(start.position), start.yaw ?? this.viewYaw());
    this.applyWalkCamera();
    this.updateWalkTarget(performance.now(), true);
    this.updateWalkMarkers(performance.now(), true);
    this.emitWalkChange();
    this.requestRender();
    return true;
  }

  /**
   * Back to orbit: the orbit camera starts at the eye, looking at a point about 5 m ahead, and
   * flies on to frame the selection when there is one (with isolate on, everything else turns
   * translucent around it). Open doors close by themselves.
   */
  exitWalk() {
    const walk = this.walk;
    if (!walk) return;
    // the lock change arrives after the listeners are gone
    if (walk.locked) lastUnlockAt = performance.now();
    this.unlockPointer();
    this.removeWalkListeners();
    this.walk = null;
    const eye = walk.controller.eye;
    // level or slightly down, so the orbit's polar limit doesn't swing the camera up
    const pitch = Math.min(walk.controller.pitch, -0.035);
    const yaw = walk.controller.yaw;
    const ahead = new Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    );
    this.camera.fov = ORBIT_FOV;
    this.camera.rotation.order = 'XYZ';
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(eye);
    this.controls.target.copy(eye).addScaledVector(ahead, WALK_EXIT_TARGET);
    this.controls.enabled = true;
    this.controls.update();
    this.renderer.domElement.style.cursor = 'default';
    this.hoverId = null;
    this.clearSpawnPreview();
    // badges (back above their equipment) and tag labels as in the orbit view
    this.restoreBadgeAnchors();
    this.badges.forEach((b) => (b.object.visible = true));
    this.labels.forEach((l) => (l.visible = this.labelsVisible));
    this.applyVisualState();
    // a selection made while walking may be behind or below the eye: bring it into view
    if (this.selectedId) this.focus(this.selectedId);
    if (walk.targetId) this.opts.onWalkTarget?.(null);
    this.emitWalkChange();
  }

  isWalking() {
    return !!this.walk;
  }

  /** How mouse look works in walk mode (see WalkLookMode) */
  getLookMode(): WalkLookMode {
    return isLockRefused() ? 'drag' : 'pointer-lock';
  }

  /**
   * Landing preview while the walk button is dragged over the view: the spot under the pointer,
   * valid when walkable (normal up) with room for the body, drawn as a marker (green valid, red
   * invalid). Translucent walls are looked through. Null, without a marker, when the pointer hits
   * nothing. The first call on a scope builds its collision world (a short pause on big scopes).
   */
  previewSpawn(clientX: number, clientY: number): (WalkSpawn & { valid: boolean }) | null {
    const world = this.ensureWalkWorld();
    const hit = world ? this.viewHit(world, this.ndcOf(clientX, clientY)) : null;
    if (!world || !hit) {
      this.clearSpawnPreview();
      return null;
    }
    // the infinite floor counts only where the ground is drawn
    const valid =
      hit.normal.y > WALK.walkable &&
      (!!hit.collider || this.onGround(hit.point)) &&
      world.fits(hit.point);
    this.showSpawnMarker(hit, valid);
    return { position: hit.point.toArray(), yaw: this.viewYaw(), valid };
  }

  clearSpawnPreview() {
    if (!this.spawnMarker?.group.visible) return;
    this.spawnMarker.group.visible = false;
    this.requestRender();
  }

  /**
   * Land at the spot under the pointer: enter walk mode there (or teleport when walking). False,
   * without moving, when the spot isn't valid.
   */
  spawnAt(clientX: number, clientY: number): boolean {
    const spot = this.previewSpawn(clientX, clientY);
    this.clearSpawnPreview();
    if (!spot?.valid) return false;
    const spawn: WalkSpawn = { position: spot.position, yaw: spot.yaw };
    if (!this.walk) return this.enterWalk(spawn);
    this.teleport(spawn);
    return true;
  }

  /** Move the player (feet) to `spawn`, at rest and level; enters walk mode when not walking */
  teleport(spawn: WalkSpawn) {
    if (!this.walk) {
      this.enterWalk(spawn);
      return;
    }
    const { controller } = this.walk;
    controller.place(new Vector3().fromArray(spawn.position), spawn.yaw ?? controller.yaw);
    this.applyWalkCamera();
    this.updateWalkTarget(performance.now(), true);
    this.updateWalkMarkers(performance.now(), true);
    this.requestRender();
  }

  /**
   * A free floor spot about 1.5 m in front of a loaded node's bounding box, facing it: the side
   * toward the player / camera first, then the others, further out and sideways; never behind a
   * wall. Null when the node isn't in the scope or no spot is free.
   */
  spawnNear(nodeId: string): WalkSpawn | null {
    const obj = this.objects.get(nodeId);
    const world = obj ? this.ensureWalkWorld() : null;
    if (!obj || !world) return null;
    const box = new Box3().setFromObject(obj);
    if (box.isEmpty()) return null;
    const from = this.walk ? this.walk.controller.feet : this.camera.position;
    // the node's own equipment doesn't block the view of it
    const spot = world.spawnNear(box, from, this.chainOf(obj)[0]);
    return spot ? { position: spot.position.toArray(), yaw: spot.yaw } : null;
  }

  /**
   * A free floor spot (structure floors and the ground, not equipment tops) near what the view
   * centre shows, heading the way the camera looks. Null when there is none.
   */
  defaultSpawn(): WalkSpawn | null {
    const world = this.ensureWalkWorld();
    if (!world) return null;
    const hit = this.viewHit(world, new Vector2(0, 0));
    // looking past the drawn ground (the horizon): start from the scope instead
    let center = hit && (hit.collider || this.onGround(hit.point)) ? hit.point : undefined;
    if (!center) {
      const box = this.scopeBox();
      if (box.isEmpty()) return null;
      center = box.getCenter(new Vector3()).setY(box.min.y);
    }
    const spot = world.freeSpotNear(center, center.y + 1);
    return spot ? { position: spot.toArray(), yaw: this.viewYaw() } : null;
  }

  /**
   * Capture the mouse for mouse look (walking only; must run in a user gesture). Does nothing once
   * the browser refused pointer lock in this session (look around by dragging instead).
   */
  lockPointer() {
    const walk = this.walk;
    if (!walk || this.disposed || isLockRefused()) return;
    const el = this.renderer.domElement;
    if (document.pointerLockElement === el) return;
    walk.lockRequest = { at: performance.now(), activation: hasUserActivation() };
    try {
      const pending = el.requestPointerLock() as unknown;
      if (pending instanceof Promise) pending.catch(() => undefined);
    } catch {
      // refused (no user gesture, or too soon after Esc): stays unlocked, the next click retries
    }
  }

  unlockPointer() {
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
  }

  /** Feet position (world), heading and pitch (radians) of the player; null when not walking */
  getWalkPose(): { position: [number, number, number]; yaw: number; pitch: number } | null {
    if (!this.walk) return null;
    const { feet, yaw, pitch } = this.walk.controller;
    return { position: feet.toArray(), yaw, pitch };
  }

  /**
   * Key (TwinModelEntry.key) of the structure model whose bounds contain the point (feet), rooms
   * before larger structures such as the roof; null when none does
   */
  structureAt(position: [number, number, number]): string | null {
    if (!this.structureBoxes)
      this.structureBoxes = this.entries
        .filter((e) => e.structure)
        .map((e) => ({ key: e.key, box: new Box3().setFromObject(e.holder) }));
    return structureAtPoint(this.structureBoxes, new Vector3().fromArray(position));
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.handlePointerDown);
    el.removeEventListener('pointerup', this.handlePointerUp);
    el.removeEventListener('pointercancel', this.handlePointerCancel);
    el.removeEventListener('pointermove', this.handlePointerMove);
    el.removeEventListener('pointerleave', this.handlePointerLeave);
    el.removeEventListener('dblclick', this.handleDoubleClick);
    el.removeEventListener('webglcontextlost', this.handleContextLost);
    if (this.walk) {
      this.unlockPointer();
      this.removeWalkListeners();
      this.walk = null;
    }
    if (this.spawnMarker) {
      this.spawnMarker.group.traverse((o) => isMesh(o) && o.geometry.dispose());
      this.spawnMarker.materials.forEach((m) => m.dispose());
      this.spawnMarker = null;
    }
    this.controls.dispose();
    this.clearScope();
    this.gltfCache.forEach((p) =>
      p
        .then((gltf) =>
          gltf.scene.traverse((o) => {
            if (!isMesh(o)) return;
            o.geometry.dispose();
            asArray(o.material).forEach((m) => m.dispose());
          })
        )
        .catch(() => undefined)
    );
    [this.ghostMaterial, this.ghostHoverMaterial].forEach((m) => m.dispose());
    this.batchedScenes.forEach((scene) =>
      scene.traverse((o) => {
        if (isMesh(o) && o.userData.dt_batched) o.geometry.dispose();
      })
    );
    this.batchedScenes.clear();
    [this.solidCache, this.fadeCache].forEach((cache) => {
      cache.forEach((m) => m.dispose());
      cache.clear();
    });
    this.ground.geometry.dispose();
    (this.ground.material as Material).dispose();
    this.grid.dispose();
    this.envTexture.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    el.remove();
    this.labelRenderer.domElement.remove();
  }

  // ------------------------------------------------------------------ loading

  /**
   * A structure model's scene with its static meshes batched per subsystem group and material
   * (one draw call each instead of one per wall reveal or stair tread), built once per GLB
   */
  private batchedScene(url: string, gltf: GLTF) {
    let scene = this.batchedScenes.get(url);
    if (!scene) {
      scene = gltf.scene.clone(true);
      batchStructure(scene);
      this.batchedScenes.set(url, scene);
    }
    return scene;
  }

  private loadGltf(url: string, onProgress: (ratio: number) => void) {
    let cached = this.gltfCache.get(url);
    if (!cached) {
      cached = this.loader
        .loadAsync(url, (e) => e.total && onProgress(e.loaded / e.total))
        .then((gltf) => {
          this.prepareMaterials(gltf);
          return gltf;
        });
      cached.catch(() => this.gltfCache.delete(url));
      this.gltfCache.set(url, cached);
    } else {
      onProgress(1);
    }
    return cached;
  }

  /** One-off material fixes for real-time: no transmission pass, blended surfaces don't write depth. */
  private prepareMaterials(gltf: GLTF) {
    gltf.scene.traverse((o) => {
      if (!isMesh(o)) return;
      let transparent = false;
      asArray(o.material).forEach((m) => {
        const pm = m as MeshPhysicalMaterial;
        if (pm.isMeshPhysicalMaterial && pm.transmission > 0) {
          pm.transmission = 0;
          pm.transparent = true;
          pm.opacity = Math.min(pm.opacity, 0.35);
        }
        if (m.transparent) {
          m.depthWrite = false;
          transparent = true;
        }
      });
      o.castShadow = !transparent;
      o.receiveShadow = true;
    });
  }

  private registerEquipment(entry: TwinModelEntry, holder: Group): TwinNode {
    // glTF scene > asset root empty (carries the equipment dt_* props) > subsystem groups > parts
    const sceneRoot = holder.children[0];
    const assetRoot = sceneRoot.children.length === 1 ? sceneRoot.children[0] : sceneRoot;
    const equipment: TwinNode = {
      id: entry.key,
      name: entry.name,
      kind: 'equipment',
      props: { ...dtProps(assetRoot, entry.retag), ...entry.props },
      children: [],
    };
    this.addNode(equipment, holder);

    const groups: Object3D[] = [];
    holder.traverse((o) => {
      if (o.userData?.dt_group) groups.push(o);
    });
    groups.forEach((g) => {
      const group: TwinNode = {
        id: `${entry.key}/${g.name}`,
        name: String(g.userData.dt_name ?? humanize(g.name)),
        kind: 'group',
        parentId: equipment.id,
        props: dtProps(g, entry.retag),
        children: [],
      };
      this.addNode(group, g);
      equipment.children.push(group);
      g.children.forEach((partObj) => {
        const props = dtProps(partObj, entry.retag);
        const part: TwinNode = {
          id: `${entry.key}/${partObj.name}`,
          name: String(props.dt_name ?? partName(partObj.name, group.name)),
          kind: 'part',
          parentId: group.id,
          props,
          children: [],
        };
        this.addNode(part, partObj);
        group.children.push(part);
        if (part.props.dt_component === 'instrument' && part.props.dt_tag)
          this.addLabel(part, partObj);
      });
      group.children.sort((a, b) => a.name.localeCompare(b.name));
    });
    equipment.children.sort((a, b) => a.name.localeCompare(b.name));

    const spinning: Spinner[] = [];
    holder.traverse((o) => {
      const axis = SPIN_AXES[String(o.userData?.dt_spin ?? '')];
      if (axis) spinning.push({ object: o, axis, rps: Number(o.userData.dt_spin_rps ?? 1) });
      if (!isMesh(o)) return;
      this.originals.set(o, o.material);
      if (asArray(o.material).some((m) => m.transparent)) this.transparentMeshes.add(o);
    });
    spinning.forEach(({ object }) =>
      object.traverse((o) => {
        if (!isMesh(o)) return;
        this.spinMeshes.add(o);
        o.castShadow = false;
      })
    );
    if (spinning.length) this.spinners.set(entry.key, { parts: spinning, speed: 0, target: 0 });
    const lamps: Partial<Record<SignalColor, Mesh[]>> = {};
    holder.traverse((o) => {
      if (!o.userData?.dt_signal) return;
      o.traverse((m) => {
        if (!isMesh(m) || Array.isArray(m.material)) return;
        const color = SIGNAL_MATERIALS[m.material.name]?.color;
        if (color) (lamps[color] ??= []).push(m);
      });
    });
    if (Object.keys(lamps).length) this.signalLamps.set(entry.key, lamps);
    this.attachScreens(entry, holder);
    return equipment;
  }

  private addNode(node: TwinNode, obj: Object3D) {
    this.nodes.set(node.id, node);
    this.objects.set(node.id, obj);
    this.objectIds.set(obj, node.id);
  }

  private addLabel(part: TwinNode, obj: Object3D) {
    const el = document.createElement('div');
    el.className = this.opts.labelClassName ?? '';
    el.textContent = String(part.props.dt_tag);
    el.style.pointerEvents = 'auto';
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.selectFromView(part.id);
    });
    const label = new CSS2DObject(el);
    obj.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(obj);
    const anchor = new Vector3(
      (box.min.x + box.max.x) / 2,
      box.max.y + 0.05,
      (box.min.z + box.max.z) / 2
    );
    label.position.copy(obj.worldToLocal(anchor));
    label.visible = this.labelsVisible;
    obj.add(label);
    this.labels.push(label);
  }

  /**
   * Give the HMI / VFD display faces a canvas texture so live values can be drawn on them later.
   * Every equipment has at most one face per slot (`HMI_Screen`, `VFD_Display`); the mesh name
   * in the GLB says which slot it is (the cooling tower names its faces `CT_*`, the CDA compressor
   * `CDA_*`).
   */
  private attachScreens(entry: TwinModelEntry, holder: Group) {
    const name = String(entry.props?.dt_tag ?? entry.name);
    const hmi = { slot: 'HMI_Screen', w: 640, h: 400 };
    const vfd = { slot: 'VFD_Display', w: 256, h: 136 };
    const defs: Record<
      string,
      { slot: string; w: number; h: number; title: string; rows: ScreenRow[] }
    > = {
      HMI_Screen: {
        ...hmi,
        title: `${name} · Unit controller`,
        rows: [
          ['Leaving CHW', '-- °C'],
          ['Entering CHW', '-- °C'],
          ['Capacity', '-- %'],
          ['Cond. pressure', '-- kPa'],
        ],
      },
      VFD_Display: { ...vfd, title: 'VFD-01', rows: [['Output', '-- Hz']] },
      CT_CP_Screen: {
        ...hmi,
        title: `${name} · Tower controller`,
        rows: [
          ['Cold water', '-- °C'],
          ['Hot water', '-- °C'],
          ['Approach', '-- K'],
          ['Wet bulb', '-- °C'],
        ],
      },
      CT_VFD_Display: { ...vfd, title: 'Fan VFD', rows: [['Fan', '-- %']] },
      CDA_CP_Screen: {
        ...hmi,
        title: `${name} · Controller`,
        rows: [
          ['Delivery', '-- bar(g)'],
          ['Load', '-- %'],
          ['Dew point', '-- °C'],
          ['HP element', '-- °C'],
        ],
      },
      CDA_VSD_Display: { ...vfd, title: 'VSD', rows: [['Motor', '-- A']] },
      ...fab1ScreenDefinitions(name),
    };
    Object.entries(defs).forEach(([meshName, def]) => {
      if (this.screens.has(`${entry.key}/${def.slot}`)) return;
      const obj = holder.getObjectByName(meshName);
      const mesh = obj && (isMesh(obj) ? obj : (obj.children.find(isMesh) as Mesh | undefined));
      if (!mesh) return;
      const canvas = document.createElement('canvas');
      canvas.width = def.w;
      canvas.height = def.h;
      drawScreen(canvas, def.title, def.rows, 'NO DATA LINK');
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = false;
      texture.anisotropy = 4;
      const material = new MeshBasicMaterial({ map: texture, toneMapped: false });
      mesh.material = material;
      this.originals.set(mesh, material);
      this.screens.set(`${entry.key}/${def.slot}`, { canvas, texture, title: def.title });
    });
  }

  private clearScope() {
    this.fly = null;
    this.labels.splice(0).forEach((l) => {
      l.element.remove();
      l.removeFromParent();
    });
    this.badges.forEach((b) => {
      b.object.element.remove();
      b.object.removeFromParent();
    });
    this.badges.clear();
    this.anchors.clear();
    this.spinners.clear();
    this.structureSpinners = [];
    this.amhs.forEach((d) => d.dispose());
    this.amhs = [];
    this.signalLamps.clear();
    this.lampMaterials.clear();
    [this.litLamps, this.flashLamps].forEach((cache) => {
      cache.forEach((m) => m.dispose());
      cache.clear();
    });
    this.flashing = false;
    this.screens.forEach(({ texture }) => texture.dispose());
    this.screens.clear();
    this.originals.forEach((slot) =>
      asArray(slot).forEach((m) => {
        if (m instanceof MeshBasicMaterial && m.map instanceof CanvasTexture) m.dispose();
      })
    );
    [this.selectCache, this.hoverCache, ...Object.values(this.stateCaches)].forEach((cache) => {
      cache.forEach((m) => m.dispose());
      cache.clear();
    });
    this.modelRoot.clear();
    this.nodes.clear();
    this.objects.clear();
    this.originals.clear();
    this.equipmentIds = [];
    this.selectedId = null;
    this.hoverId = null;
    this.entries.length = 0;
    this.structureBoxes = null;
    this.walkWorld = null;
    this.walkMarkerList = null;
    this.badgeHomes.clear();
    this.structureOriginals.clear();
    this.seeThroughMeshes.clear();
    this.fadedMeshes = new Set();
    this.occluderKey = '';
  }

  /** Bounds of the scope itself: equipment and structures, without the site context around it */
  private scopeBox() {
    const box = new Box3();
    this.entries.forEach((e) => {
      if (!e.context) box.expandByObject(e.holder);
    });
    return box.isEmpty() ? new Box3().setFromObject(this.modelRoot) : box;
  }

  /** Size the ground, grid, shadow camera and zoom range to the loaded scope (equipment + structures). */
  private fitStage() {
    this.updateShadows();
    const box = this.scopeBox();
    if (box.isEmpty()) return;
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const span = Math.max(size.x, size.z) * 2.2 + 4;
    this.ground.position.set(center.x, box.min.y - 0.001, center.z);
    this.ground.scale.set(span, span, 1);
    this.grid.position.set(center.x, box.min.y, center.z);
    this.grid.scale.setScalar(Math.ceil(span));
    const sized = new GridHelper(1, Math.ceil(span));
    this.grid.geometry.dispose();
    this.grid.geometry = sized.geometry;
    asArray(sized.material).forEach((m) => m.dispose());

    const radius = box.getBoundingSphere(new Sphere()).radius;
    // a whole building (~33 x 18 m) must fit when zooming out, a single pump must not drift away
    this.controls.maxDistance = Math.max(MIN_MAX_DISTANCE, radius * MAX_DISTANCE_RADII);
    this.sun.position.set(
      center.x - radius * 1.2,
      center.y + radius * 2.4,
      center.z + radius * 1.6
    );
    this.sun.target.position.copy(center);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -radius * 1.3;
    cam.right = cam.top = radius * 1.3;
    cam.near = 0.1;
    cam.far = radius * 6;
    cam.updateProjectionMatrix();
    this.camera.far = Math.max(300, radius * 20);
    this.camera.updateProjectionMatrix();
  }

  /** Re-render the shadow map with the next frame; it is not updated every frame. */
  private updateShadows() {
    this.renderer.shadowMap.needsUpdate = true;
    this.requestRender();
  }

  // ------------------------------------------------------------------ selection & visuals

  private depthOf(kind: TwinNodeKind) {
    return kind === 'equipment' ? 0 : kind === 'group' ? 1 : 2;
  }

  /** ids from equipment down to the part owning `obj` */
  private chainOf(obj: Object3D) {
    const chain: string[] = [];
    let o: Object3D | null = obj;
    while (o) {
      const id = this.objectIds.get(o);
      if (id) chain.unshift(id);
      o = o.parent;
    }
    return chain;
  }

  /** Drill-down: a click goes one level deeper than the current selection along the hit's chain. */
  private resolveDrill(obj: Object3D): string | null {
    const chain = this.chainOf(obj);
    if (!chain.length) return null;
    const selNode = this.selectedId ? this.nodes.get(this.selectedId) : undefined;
    if (!selNode) return chain[0];
    const idx = chain.indexOf(selNode.id);
    if (idx >= 0) return chain[Math.min(idx + 1, chain.length - 1)];
    return chain[Math.min(this.depthOf(selNode.kind), chain.length - 1)];
  }

  private ndcOf(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private pick(clientX: number, clientY: number): Object3D | null {
    this.raycaster.setFromCamera(this.ndcOf(clientX, clientY), this.camera);
    return this.pickHit()?.object ?? null;
  }

  /** The equipment mesh hit along the raycaster's current ray (opaque before translucent) */
  private pickHit(): Intersection | null {
    const hitIn = (roots: Object3D[]) => {
      const hits = this.raycaster
        .intersectObjects(roots, true)
        .filter((h) => isMesh(h.object) && this.originals.has(h.object));
      return hits.find((h) => !this.transparentMeshes.has(h.object as Mesh)) ?? hits[0] ?? null;
    };
    const focusObj =
      this.isGhosting() && this.selectedId ? this.objects.get(this.selectedId) : undefined;
    // equipment only: structures (translucent walls, roof) never catch or block a pick
    const equipmentRoots = this.equipmentIds.flatMap((id) => {
      const obj = this.objects.get(id);
      return obj ? [obj] : [];
    });
    const hit = (focusObj && hitIn([focusObj])) || hitIn(equipmentRoots);
    // solid walls (orbit view): what they hide can't be picked (walk mode checks its own world)
    if (hit && !this.walk && !this.seeThrough && this.hiddenByStructure(hit.distance)) return null;
    return hit;
  }

  /** Solid mode: a solid (not faded) structure surface lies on the raycaster's ray before `distance` */
  private hiddenByStructure(distance: number) {
    const blockers: Mesh[] = [];
    this.structureOriginals.forEach((_, mesh) => {
      if (mesh.visible && !this.fadedMeshes.has(mesh)) blockers.push(mesh);
    });
    const far = this.raycaster.far;
    this.raycaster.far = Math.max(0, distance - 0.01);
    const blocked = this.raycaster
      .intersectObjects(blockers, false)
      .some((h) => asArray((h.object as Mesh).material).some((m) => !m.transparent));
    this.raycaster.far = far;
    return blocked;
  }

  // ------------------------------------------------------------------ see-through walls

  /**
   * Structure materials for the see-through choice: translucent originals, their solid clones, or
   * (solid mode, hiding the selection) faded.
   */
  private applyStructureMode() {
    this.structureOriginals.forEach((orig, mesh) => {
      const seeThrough = this.seeThroughMeshes.has(mesh);
      let material = orig;
      if (this.fadedMeshes.has(mesh))
        material = seeThrough ? orig : this.mapSlot(orig, this.fadeCache);
      else if (!this.seeThrough && seeThrough) material = this.mapSlot(orig, this.solidCache);
      if (mesh.material !== material) mesh.material = material;
    });
    this.requestRender();
  }

  /** A material slot with its see-through materials made solid (solidCache), or all of it faded */
  private mapSlot(slot: MaterialSlot, cache: Map<Material, Material>): MaterialSlot {
    const solid = cache === this.solidCache;
    const map = (m: Material) => {
      if (solid && !isSeeThroughMaterial(m)) return m;
      let c = cache.get(m);
      if (!c) {
        c = m.clone();
        if (solid) Object.assign(c, { transparent: false, opacity: 1, depthWrite: true });
        else Object.assign(c, { transparent: true, opacity: 0.16, depthWrite: false });
        cache.set(m, c);
      }
      return c;
    };
    return Array.isArray(slot) ? slot.map(map) : map(slot);
  }

  /** Walk mode: whether a mesh is looked through (the crosshair, the landing preview) */
  private isLookThrough = (mesh: Mesh) => {
    const original = this.structureOriginals.get(mesh);
    if (!original) return translucentMesh(mesh);
    return this.seeThrough && asArray(original).every((m) => m.transparent && m.opacity < 0.5);
  };

  private meshBox(mesh: Mesh) {
    let box = this.meshBoxes.get(mesh);
    if (!box) {
      box = new Box3().setFromObject(mesh);
      this.meshBoxes.set(mesh, box);
    }
    return box;
  }

  /**
   * Orbit view with a selection: fade the structure meshes between the camera and the selection
   * (its centre and near its top), so selected equipment inside a room or below a slab shows. With
   * solid walls always; with see-through walls while isolate is on (only opaque parts such as
   * floors, stairs and columns then change). Re-checked when the selection or the camera changed,
   * at most every OCCLUDER_MS.
   */
  private updateOccluders(now: number) {
    const obj = this.selectedId ? this.objects.get(this.selectedId) : undefined;
    if (this.walk || !obj || (this.seeThrough && !this.isolate)) {
      if (this.fadedMeshes.size) {
        this.fadedMeshes = new Set();
        this.occluderKey = '';
        this.applyStructureMode();
      }
      return;
    }
    const eye = this.camera.position;
    const key = `${this.selectedId}|${eye.x.toFixed(2)},${eye.y.toFixed(2)},${eye.z.toFixed(2)}`;
    if (key === this.occluderKey || now - this.occluderAt < OCCLUDER_MS) return;
    this.occluderKey = key;
    this.occluderAt = now;
    const box = new Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const center = box.getCenter(new Vector3());
    const top = new Vector3(center.x, box.max.y - (box.max.y - box.min.y) * 0.1, center.z);
    const next = new Set<Mesh>();
    const far = this.raycaster.far;
    [center, top].forEach((target) => {
      const dist = eye.distanceTo(target) - 0.05;
      if (dist <= 0) return;
      _occluderRay.origin.copy(eye);
      _occluderRay.direction.subVectors(target, eye).normalize();
      this.raycaster.ray.copy(_occluderRay);
      this.raycaster.far = dist;
      this.structureOriginals.forEach((_, mesh) => {
        if (next.has(mesh) || !mesh.visible) return;
        const p = _occluderRay.intersectBox(this.meshBox(mesh), _occluderHit);
        if (!p || p.distanceTo(eye) > dist) return;
        // the bounds of one mesh can span a whole room: its faces must cross the line
        if (this.raycaster.intersectObject(mesh, false).length) next.add(mesh);
      });
    });
    this.raycaster.far = far;
    const same =
      next.size === this.fadedMeshes.size && [...next].every((m) => this.fadedMeshes.has(m));
    if (same) return;
    this.fadedMeshes = next;
    this.applyStructureMode();
  }

  private isGhosting() {
    // walking: everything stays solid around the player
    if (this.walk) return false;
    const node = this.selectedId ? this.nodes.get(this.selectedId) : undefined;
    return this.isolate && !!node && (node.kind !== 'equipment' || this.equipmentIds.length > 1);
  }

  private meshesOf(id: string | null) {
    const set = new Set<Mesh>();
    const obj = id ? this.objects.get(id) : undefined;
    obj?.traverse((o) => isMesh(o) && set.add(o));
    return set;
  }

  private tinted(
    slot: MaterialSlot,
    cache: Map<Material, Material>,
    color: Color,
    intensity: number,
    /** how far unlit materials (the live screens) blend toward the colour; 0 leaves them as they are */
    unlitMix = 0.35
  ): MaterialSlot {
    const map = (m: Material) => {
      if (!unlitMix && !(m instanceof MeshStandardMaterial)) return m;
      let c = cache.get(m);
      if (!c) {
        c = m.clone();
        if (c instanceof MeshStandardMaterial) {
          c.emissive = color.clone();
          c.emissiveIntensity = intensity;
        } else if (c instanceof MeshBasicMaterial) {
          c.color = c.color.clone().lerp(color, unlitMix);
        }
        cache.set(m, c);
      }
      return c;
    };
    return Array.isArray(slot) ? slot.map(map) : map(slot);
  }

  /** Re-read the status colours from the theme; recolours the cached tint clones when one changed. */
  private refreshStateColors() {
    let changed = false;
    UNIT_STATES.forEach((state) => {
      const color = cssColor(UNIT_STATE_TINT[state].css, UNIT_STATE_TINT[state].fallback);
      const current = this.stateColors[state];
      if (current.equals(color)) return;
      current.copy(color);
      this.stateCaches[state].forEach((m) => {
        if (m instanceof MeshStandardMaterial) m.emissive.copy(color);
      });
      changed = true;
    });
    return changed;
  }

  private applyVisualState() {
    const ghosting = this.isGhosting();
    const selNode = this.selectedId ? this.nodes.get(this.selectedId) : undefined;
    const selected = this.meshesOf(this.selectedId);
    const hovered =
      this.hoverId && this.hoverId !== this.selectedId
        ? this.meshesOf(this.hoverId)
        : new Set<Mesh>();
    const stateOf = new Map<Mesh, TwinUnitState>();
    Object.entries(this.unitStates).forEach(([id, state]) =>
      this.meshesOf(id).forEach((m) => stateOf.set(m, state))
    );
    let shadowsChanged = false;
    this.originals.forEach((orig, mesh) => {
      const inSelection = selected.has(mesh);
      const state = stateOf.get(mesh);
      const lamp = this.lampMaterials.get(mesh);
      let material: MaterialSlot = orig;
      if (ghosting && !inSelection) {
        material = hovered.has(mesh) ? this.ghostHoverMaterial : this.ghostMaterial;
      } else if (lamp) {
        // a signal tower lamp shows its state through every tint
        material = lamp;
      } else if (hovered.has(mesh)) {
        material = this.tinted(orig, this.hoverCache, HOVER_EMISSIVE, 0.28);
      } else if (inSelection && selNode?.kind === 'part') {
        // when the rest is ghosted the part keeps its true colours; otherwise tint it
        if (!ghosting) material = this.tinted(orig, this.selectCache, SELECT_EMISSIVE, 0.35);
      } else if (state) {
        // equipment that isn't running: standby / trip / maintenance / offline colour
        const { intensity } = UNIT_STATE_TINT[state];
        material = this.tinted(
          orig,
          this.stateCaches[state],
          this.stateColors[state],
          intensity,
          0
        );
      }
      mesh.material = material;
      const castShadow =
        !this.transparentMeshes.has(mesh) &&
        !this.spinMeshes.has(mesh) &&
        material !== this.ghostMaterial &&
        material !== this.ghostHoverMaterial;
      if (mesh.castShadow !== castShadow) {
        mesh.castShadow = castShadow;
        shadowsChanged = true;
      }
    });
    if (shadowsChanged) this.updateShadows();
    this.requestRender();
  }

  private selectFromView(id: string | null) {
    if (id === this.selectedId) {
      // clicking the selection again is still a selection (e.g. to reopen its dashboard)
      this.opts.onSelect?.(id);
      return;
    }
    this.select(id, { focus: true });
    this.opts.onSelect?.(id);
  }

  // ------------------------------------------------------------------ camera

  private focus(id: string | null, animate = true) {
    // the walk camera follows the player only
    if (this.walk) return;
    const obj = (id && this.objects.get(id)) || this.modelRoot;
    const box = obj === this.modelRoot ? this.scopeBox() : new Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new Sphere());
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const dist = (sphere.radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.05;
    const dir = this.camera.position.clone().sub(this.controls.target);
    if (dir.lengthSq() < 1e-6 || obj === this.modelRoot) dir.copy(DEFAULT_VIEW_DIR);
    dir.normalize();
    if (dir.y < 0.15) dir.setY(0.15).normalize();
    const toTarget = sphere.center.clone();
    const toPos = sphere.center
      .clone()
      .addScaledVector(dir, Math.max(dist, this.controls.minDistance * 2));
    if (!animate) {
      this.controls.target.copy(toTarget);
      this.camera.position.copy(toPos);
      this.controls.update();
      this.requestRender();
      return;
    }
    this.fly = {
      from: [this.camera.position.clone(), this.controls.target.clone()],
      to: [toPos, toTarget],
      start: performance.now(),
    };
  }

  private cancelFly = () => {
    this.fly = null;
  };

  // ------------------------------------------------------------------ walk internals

  private ensureWalkWorld(): WalkWorld | null {
    if (this.walkWorld) return this.walkWorld;
    if (!this.entries.length) return null;
    this.modelRoot.updateMatrixWorld(true);
    // the scope's ground (fitStage) is the infinite floor
    const floorY = this.ground.position.y;
    this.walkWorld = new WalkWorld(
      this.entries.map((e) => ({ key: e.key, root: e.holder, structure: e.structure })),
      { floorY, killY: floorY - WALK.respawnDepth, isTransparent: this.isLookThrough }
    );
    return this.walkWorld;
  }

  /**
   * A new scope loaded while walking: collide with it and stand on it, moved to the nearest free
   * floor spot when the body is inside something only this scope has (e.g. the neighbour of an
   * equipment that was rendered on its own); leave when it is empty.
   */
  private rebuildWalk() {
    const walk = this.walk;
    if (!walk) return;
    const world = this.ensureWalkWorld();
    if (!world) {
      this.exitWalk();
      return;
    }
    const { controller } = walk;
    if (!controller.moveToWorld(world)) {
      // nothing free around the player: the scope's entry spot (the page may pick its own)
      const spawn = this.defaultSpawn();
      if (spawn)
        controller.place(new Vector3().fromArray(spawn.position), spawn.yaw ?? controller.yaw);
    }
    this.applyWalkCamera();
    this.updateWalkMarkers(performance.now(), true);
    if (walk.targetId) {
      walk.targetId = null;
      this.opts.onWalkTarget?.(null);
    }
  }

  /** First surface along the camera ray through `ndc`; translucent walls are looked through. */
  private viewHit(world: WalkWorld, ndc: Vector2): WalkHit | null {
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(ndc, this.camera);
    const { origin, direction } = this.raycaster.ray;
    return world.raycast(
      origin,
      direction,
      this.camera.far,
      (h) => !(h.collider?.structure && h.collider.transparent && h.normal.y <= WALK.walkable)
    );
  }

  /** Whether a point lies over the drawn ground square of the scope */
  private onGround(p: Vector3) {
    const { position, scale } = this.ground;
    return Math.abs(p.x - position.x) <= scale.x / 2 && Math.abs(p.z - position.z) <= scale.y / 2;
  }

  /** Heading the view looks along (walk: the player's) */
  private viewYaw() {
    if (this.walk) return this.walk.controller.yaw;
    return yawOf(this.controls.target.clone().sub(this.camera.position));
  }

  private showSpawnMarker(hit: WalkHit, valid: boolean) {
    if (!this.spawnMarker) {
      const material = (opacity: number) =>
        new MeshBasicMaterial({
          transparent: true,
          opacity,
          depthWrite: false,
          side: DoubleSide,
          toneMapped: false,
        });
      const materials = [material(0.3), material(0.95), material(0.14)];
      const pad = new Group();
      pad.add(
        new Mesh(new CircleGeometry(WALK.radius, 32), materials[0]),
        new Mesh(new RingGeometry(WALK.radius * 0.8, WALK.radius, 40), materials[1])
      );
      // the body that will stand there
      const body = new Mesh(
        new CylinderGeometry(WALK.radius, WALK.radius, WALK.height, 24, 1, true),
        materials[2]
      );
      body.position.y = WALK.height / 2;
      body.name = 'body';
      const group = new Group();
      group.add(pad, body);
      group.traverse((o) => {
        o.renderOrder = 10;
      });
      // in the scene, not the model root: never picked, framed or collided with
      this.scene.add(group);
      this.spawnMarker = { group, pad, materials };
    }
    const { group, pad, materials } = this.spawnMarker;
    materials.forEach((m) => m.color.set(valid ? SPAWN_VALID : SPAWN_INVALID));
    group.position.copy(hit.point);
    pad.position.copy(hit.normal).multiplyScalar(0.01);
    pad.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), hit.normal);
    const body = group.getObjectByName('body');
    if (body) body.visible = hit.normal.y > WALK.walkable;
    group.visible = true;
    this.requestRender();
  }

  private applyWalkCamera() {
    const c = this.walk?.controller;
    if (!c) return;
    this.camera.position.set(c.feet.x, c.viewY, c.feet.z);
    this.camera.rotation.set(c.pitch, c.yaw, 0, 'YXZ');
    this.camera.updateMatrixWorld();
  }

  private stepWalk(walk: WalkState, dt: number, now: number) {
    const held = (...codes: string[]) => codes.some((c) => walk.keys.has(c));
    walk.controller.step(dt, {
      forward: Number(held('KeyW', 'ArrowUp')) - Number(held('KeyS', 'ArrowDown')),
      strafe: Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft')),
      run: held('ShiftLeft', 'ShiftRight'),
      jump: walk.jump,
    });
    walk.jump = false;
    this.applyWalkCamera();
    this.updateWalkTarget(now);
    this.updateWalkMarkers(now);
  }

  /**
   * What a walk-mode pick along the view ray through `ndc` (the crosshair, or the cursor in
   * drag-look mode) selects: equipment within WALK_REACH, not hidden behind an opaque structure,
   * drill-resolved like the crosshair
   */
  private walkPick(ndc: Vector2): string | null {
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.far = WALK_REACH;
    const hit = this.pickHit();
    this.raycaster.far = Infinity;
    if (!hit) return null;
    const { origin, direction } = this.raycaster.ray;
    const hidden = !!this.walkWorld?.raycast(
      origin,
      direction,
      hit.distance,
      (h) => !!h.collider?.structure && !h.collider.transparent
    );
    return hidden ? null : this.resolveWalkTarget(hit.object);
  }

  /**
   * What the crosshair points at, re-picked at most every WALK_PICK_MS (or now with `force`); the
   * hover tint follows it.
   */
  private updateWalkTarget(now: number, force = false) {
    const walk = this.walk;
    if (!walk || (!force && now - walk.lastPick < WALK_PICK_MS)) return;
    walk.lastPick = now;
    const id = this.walkPick(new Vector2(0, 0));
    if (id === walk.targetId) return;
    walk.targetId = id;
    this.hoverId = id;
    this.applyVisualState();
    this.opts.onWalkTarget?.(id);
  }

  /** Crosshair drill: an instrument part directly, else the equipment, one level deeper once selected */
  private resolveWalkTarget(obj: Object3D): string | null {
    const chain = this.chainOf(obj);
    if (!chain.length) return null;
    const last = this.nodes.get(chain[chain.length - 1]);
    if (last?.kind === 'part' && last.props.dt_component === 'instrument') return last.id;
    const idx = this.selectedId ? chain.indexOf(this.selectedId) : -1;
    return idx >= 0 ? chain[Math.min(idx + 1, chain.length - 1)] : chain[0];
  }

  /** E / a locked click: select the crosshair target (its dashboard opens) and free the pointer */
  private selectWalkTarget() {
    if (!this.walk) return;
    this.updateWalkTarget(performance.now(), true);
    const id = this.walk.targetId;
    if (!id) return;
    this.select(id, { focus: false });
    this.opts.onSelect?.(id);
    this.unlockPointer();
    this.updateWalkTarget(performance.now(), true);
  }

  /** Drag-look mode: a click selects what the mouse cursor points at, as E does for the crosshair */
  private selectAtPointer(clientX: number, clientY: number) {
    if (!this.walk) return;
    const id = this.walkPick(this.ndcOf(clientX, clientY));
    if (!id) return;
    this.select(id, { focus: false });
    this.opts.onSelect?.(id);
    this.updateWalkTarget(performance.now(), true);
  }

  /**
   * the badges and (when shown) tag labels walk mode checks, with what can't hide each; badges
   * above a ceiling move under it (see lowerBadge)
   */
  private walkMarkers(world: WalkWorld | null): WalkMarker[] {
    if (this.walkMarkerList) return this.walkMarkerList;
    const list: WalkMarker[] = [];
    // a badge's own equipment, a label's own part
    this.badges.forEach(({ object }, id) => {
      if (world) this.lowerBadge(object, world);
      list.push({ object, skip: (c: WalkCollider) => c.key === id });
    });
    if (this.labelsVisible)
      this.labels.forEach((object) => {
        const part = object.parent;
        list.push({ object, skip: (c: WalkCollider) => !!part && isWithin(c.mesh, part) });
      });
    // without a world (between scopes) build it again once there is one
    if (world) this.walkMarkerList = list;
    return list;
  }

  /**
   * Walking: a badge whose anchor lies above a ceiling (the CHW loop reaches the plant room's
   * slab soffit, so its badge would float over the roof deck) hangs just under that ceiling, where
   * the players in the room see it and those on the roof don't. restoreBadgeAnchors puts it back.
   */
  private lowerBadge(object: CSS2DObject, world: WalkWorld) {
    const parent = object.parent;
    if (!parent) return;
    let home = this.badgeHomes.get(object);
    if (!home) {
      home = object.position.clone();
      this.badgeHomes.set(object, home);
    }
    parent.updateWorldMatrix(true, false);
    const anchor = parent.localToWorld(home.clone());
    // from just under the equipment's top up to the anchor
    const from = anchor.clone().setY(anchor.y - BADGE_LIFT - BADGE_CEILING_GAP);
    const ceiling = world.raycast(from, UP, anchor.y - from.y, (h) => !!h.collider?.structure);
    if (ceiling) anchor.setY(Math.max(from.y, ceiling.point.y - BADGE_CEILING_GAP));
    object.position.copy(parent.worldToLocal(anchor));
  }

  /** Badges back at their orbit-view anchors (leaving walk mode; the next walk lowers them again) */
  private restoreBadgeAnchors() {
    this.badgeHomes.forEach((home, object) => object.position.copy(home));
    this.badgeHomes.clear();
    this.walkMarkerList = null;
  }

  /**
   * Walking: status badges and tag labels show only within WALK_MARKERS.range of the eye and in
   * line of sight, each re-checked once per WALK_MARKERS.intervalMs with the work spread over the
   * frames (all at once with `force`: walk mode entered, a teleport, new markers). A marker out of
   * the view is hidden without a ray; it shows within one interval once the view turns to it.
   * Exiting walk mode shows them as before.
   */
  private updateWalkMarkers(now: number, force = false) {
    const walk = this.walk;
    if (!walk) return;
    const world = this.walkWorld;
    const markers = this.walkMarkers(world);
    const elapsed = Math.max(0, now - walk.markersAt);
    walk.markersAt = now;
    const n = markers.length;
    if (!n) return;
    const count = force ? n : Math.min(n, Math.ceil((n * elapsed) / WALK_MARKERS.intervalMs));
    const eye = this.camera.position;
    const anchor = _markerAnchor;
    for (let i = 0; i < count; i++) {
      const { object, skip } = markers[(walk.markerCursor + i) % n];
      object.getWorldPosition(anchor);
      object.visible = this.inWalkView(anchor) && markerVisible(world, eye, anchor, skip);
    }
    walk.markerCursor = (walk.markerCursor + count) % n;
  }

  /** whether a world point projects into the view (with a margin, so edge markers don't pop) */
  private inWalkView(point: Vector3) {
    const p = _markerNdc.copy(point).project(this.camera);
    return p.z > -1 && p.z < 1 && Math.abs(p.x) <= 1.2 && Math.abs(p.y) <= 1.2;
  }

  private emitWalkChange() {
    this.opts.onWalkChange?.({
      walking: !!this.walk,
      locked: !!this.walk?.locked,
      lookMode: this.getLookMode(),
    });
  }

  private removeWalkListeners() {
    document.removeEventListener('keydown', this.handleWalkKeyCapture, true);
    document.removeEventListener('keydown', this.handleWalkKeyDown);
    document.removeEventListener('keyup', this.handleWalkKeyUp);
    document.removeEventListener('mousemove', this.handleWalkMouseMove);
    document.removeEventListener('mousedown', this.handleWalkMouseDown);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('pointerlockerror', this.handlePointerLockError);
    window.removeEventListener('blur', this.handleWalkBlur);
  }

  /**
   * Before the page's widgets see an Esc: whether it will close an open drop-down (the widget
   * closes it in its own handler, so by the time the key bubbles up it no longer looks open)
   */
  private handleWalkKeyCapture = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.escapeForWidget = isEscapeForWidget(e.target);
  };

  private handleWalkKeyDown = (e: KeyboardEvent) => {
    const walk = this.walk;
    if (!walk || isWalkKeyIgnored(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    // Tab, Space and the arrows on a focused HUD / dashboard control operate that control
    if (isKeyForControl(e.target, e.code)) return;
    if (MOVE_KEYS.has(e.code)) {
      walk.keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
      return;
    }
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (!e.repeat) walk.jump = true;
        break;
      case 'KeyE':
        e.preventDefault();
        if (!e.repeat) this.selectWalkTarget();
        break;
      case 'KeyT':
      case 'Tab':
        // the assistant and the teleport menu need the mouse; no "t" lands in a focused composer
        e.preventDefault();
        if (e.repeat) break;
        this.unlockPointer();
        this.opts.onWalkKey?.(e.code === 'Tab' ? 'Tab' : 'T');
        break;
      case 'KeyG':
        e.preventDefault();
        if (!e.repeat) this.opts.onWalkKey?.('G');
        break;
      case 'KeyF':
        // the page toggles full screen in this key event (a user gesture)
        e.preventDefault();
        if (!e.repeat) this.opts.onWalkKey?.('F');
        break;
      case 'Escape':
        // while locked the browser takes Esc to free the pointer; that key press is not an exit,
        // nor is the Esc that closes an open drop-down of a dashboard
        if (!walk.locked && performance.now() - lastUnlockAt > 250 && !this.escapeForWidget)
          this.opts.onWalkKey?.('Escape');
        break;
    }
  };

  private handleWalkKeyUp = (e: KeyboardEvent) => {
    this.walk?.keys.delete(e.code);
  };

  private handleWalkMouseMove = (e: MouseEvent) => {
    const walk = this.walk;
    if (!walk?.locked) return;
    // some browsers report one huge jump right after locking
    if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;
    walk.controller.look(e.movementX, e.movementY);
  };

  private handleWalkMouseDown = (e: MouseEvent) => {
    if (!this.walk?.locked || e.button !== 0) return;
    e.preventDefault();
    this.selectWalkTarget();
  };

  private handlePointerLockChange = () => {
    const walk = this.walk;
    if (!walk) return;
    const locked = document.pointerLockElement === this.renderer.domElement;
    if (locked === walk.locked) return;
    walk.locked = locked;
    walk.press = null;
    if (locked) {
      walk.lockRequest = null;
      lockFailures = 0;
    } else {
      lastUnlockAt = performance.now();
      walk.keys.clear();
    }
    this.renderer.domElement.style.cursor = locked ? 'none' : 'crosshair';
    this.emitWalkChange();
  };

  /**
   * A refused pointer lock: drag-look mode for the rest of the session once the browser refused
   * LOCK_REFUSALS requests in a row (a success in between starts the count again)
   */
  private handlePointerLockError = () => {
    const walk = this.walk;
    const request = walk?.lockRequest;
    if (!walk || !request) return;
    walk.lockRequest = null;
    if (
      !isLockRefusal({
        activation: request.activation,
        sinceUnlockMs: request.at - lastUnlockAt,
      })
    )
      return;
    lockFailures++;
    if (lockFailures < LOCK_REFUSALS) return;
    rememberLockRefused();
    this.emitWalkChange();
  };

  private handleWalkBlur = () => {
    const walk = this.walk;
    if (!walk) return;
    walk.keys.clear();
    // the button's release goes to another window: the drag ends here
    this.endWalkPress();
  };

  /** Drop a drag-look press (released, cancelled or lost) and restore the cursor */
  private endWalkPress() {
    const walk = this.walk;
    if (!walk?.press) return;
    walk.press = null;
    this.renderer.domElement.style.cursor = walk.locked ? 'none' : 'crosshair';
  }

  // ------------------------------------------------------------------ loop & events

  private requestRender = () => {
    this.needsRender = true;
  };

  /** Advance the rotating parts; true while anything still turns. */
  private spin(dt: number) {
    let moving = false;
    this.spinners.forEach((s) => {
      s.speed += (s.target - s.speed) * Math.min(1, dt * 1.2);
      if (s.target === 0 && s.speed < 0.003) s.speed = 0;
      if (s.speed === 0) return;
      moving = true;
      s.parts.forEach((p) => p.object.rotateOnAxis(p.axis, s.speed * p.rps * Math.PI * 2 * dt));
    });
    this.structureSpinners.forEach((p) => p.object.rotateOnAxis(p.axis, p.rps * Math.PI * 2 * dt));
    return moving || this.structureSpinners.length > 0;
  }

  private tick = (now: number) => {
    this.frame = requestAnimationFrame(this.tick);
    const dt = this.lastTick ? Math.min(0.1, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;
    const spinning = this.spin(dt);
    if (this.stepFlash(now)) this.needsRender = true;
    const tracking = this.amhs.length > 0;
    const animFrame = now - this.lastRender >= ANIM_FRAME_MS - ANIM_FRAME_SLACK_MS;
    if (tracking && animFrame) {
      // the frame's own timestamp on the wall clock: evenly spaced, unlike Date.now() here
      const clock = performance.timeOrigin + now;
      this.amhs.forEach((d) => d.step(clock));
    }
    const walk = this.walk;
    if (walk) this.stepWalk(walk, dt, now);
    // doors open around the player and close once nobody walks
    const doors = this.walkWorld?.doors.length
      ? this.walkWorld.updateDoors(dt, walk ? walk.controller.feet : null)
      : null;
    if (doors?.settled) this.updateShadows();
    if (this.fly) {
      const t = Math.min(1, (now - this.fly.start) / FLY_MS);
      const k = easeInOut(t);
      this.camera.position.lerpVectors(this.fly.from[0], this.fly.to[0], k);
      this.controls.target.lerpVectors(this.fly.from[1], this.fly.to[1], k);
      if (t >= 1) this.fly = null;
      this.needsRender = true;
    }
    // (the orbit controls would pull the walk camera back to their target)
    const moved = !walk && this.controls.update();
    this.updateOccluders(now);
    if (
      walk ||
      doors?.moving ||
      moved ||
      this.needsRender ||
      ((spinning || tracking) && animFrame)
    ) {
      this.needsRender = false;
      this.lastRender = now;
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
      this.renderListeners.forEach((listener) => listener());
    }
  };

  private resize = () => {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  };

  private handlePointerDown = (e: PointerEvent) => {
    const walk = this.walk;
    if (walk) {
      // walking with the pointer free: a left press drags the view round or is a click
      // (while locked the document's mousedown selects)
      if (walk.locked || e.button !== 0) return;
      walk.press = pressStart(e.clientX, e.clientY, performance.now());
      try {
        this.renderer.domElement.setPointerCapture(e.pointerId);
      } catch {
        // no capture: a release outside the view is missed, and the next move without the
        // button held ends the drag (handlePointerMove)
      }
      return;
    }
    this.pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private handlePointerUp = (e: PointerEvent) => {
    const walk = this.walk;
    if (walk) {
      const press = walk.press;
      walk.press = null;
      if (!press) return;
      if (press.dragging)
        this.renderer.domElement.style.cursor = walk.locked ? 'none' : 'crosshair';
      if (
        e.button !== 0 ||
        walk.locked ||
        !pressIsClick(press, e.clientX, e.clientY, performance.now())
      )
        return;
      // a click takes the mouse for looking around; without pointer lock it selects what the
      // cursor points at (a click while locked selects the crosshair target, see mousedown)
      if (isLockRefused()) this.selectAtPointer(e.clientX, e.clientY);
      else this.lockPointer();
      return;
    }
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || e.button !== 0) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || performance.now() - down.t > 600)
      return;
    const obj = this.pick(e.clientX, e.clientY);
    if (obj) this.selectFromView(this.resolveDrill(obj));
  };

  private handlePointerCancel = () => {
    this.pointerDown = null;
    this.endWalkPress();
  };

  private handlePointerMove = (e: PointerEvent) => {
    const walk = this.walk;
    if (walk) {
      // walking: drag-look while the pointer is free (the crosshair hovers, not the pointer)
      const press = walk.press;
      if (!press || walk.locked) return;
      // the release went elsewhere (another window, a context menu): a plain hover never turns
      if ((e.buttons & 1) === 0) {
        this.endWalkPress();
        return;
      }
      const { dx, dy } = pressMove(press, e.clientX, e.clientY);
      if (!press.dragging) return;
      walk.controller.look(dx, dy);
      this.renderer.domElement.style.cursor = 'grabbing';
      return;
    }
    if (this.pointerDown) return;
    const obj = this.pick(e.clientX, e.clientY);
    const id = obj ? this.resolveDrill(obj) : null;
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'default';
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.applyVisualState();
    this.opts.onHover?.(id);
  };

  private handlePointerLeave = () => {
    if (this.walk || !this.hoverId) return;
    this.hoverId = null;
    this.applyVisualState();
    this.opts.onHover?.(null);
  };

  private handleDoubleClick = () => {
    if (this.walk) return;
    this.focus(this.selectedId);
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.frame);
  };
}
