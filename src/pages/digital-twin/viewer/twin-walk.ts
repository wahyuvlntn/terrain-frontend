import {
  Box3,
  BufferGeometry,
  DoubleSide,
  Line3,
  Material,
  Matrix3,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  Ray,
  Vector3,
} from 'three';
import { acceleratedRaycast, ExtendedTriangle, MeshBVH } from 'three-mesh-bvh';

// BVH raycasts for every mesh whose geometry has a bounds tree (the walk world builds them, so the
// viewer's picks get faster too); geometry without one keeps three's own raycast
Mesh.prototype.raycast = acceleratedRaycast;

/** First-person body and motion (metres, seconds) */
export const WALK = {
  radius: 0.3,
  height: 1.75,
  eye: 1.62,
  /** obstacles up to this height are stepped onto; the body capsule floats this high above the feet */
  step: 0.4,
  /** how far the feet follow the ground down while walking (stairs, a kerb) instead of falling */
  snap: 0.3,
  walkSpeed: 1.6,
  runSpeed: 3.4,
  gravity: 9.81,
  jumpHeight: 0.45,
  /** a surface is walkable when its normal points up at least this much (about 45°) */
  walkable: 0.7,
  /** falling this far below the floor plane respawns */
  respawnDepth: 10,
  /** a door opens while the player is closer than this to its leaf */
  doorRange: 2.2,
  doorSeconds: 0.6,
  /** longest physics step; a frame is split into substeps of at most this */
  substep: 1 / 120,
  /** longest frame simulated (a slower frame runs in slow motion rather than tunnelling) */
  maxFrame: 0.05,
};

/**
 * Mouse look without pointer lock: a press on the view that moves further than `threshold` (px)
 * is a drag that turns the view; a press that stays put and ends within `clickMs` is a click.
 */
export const DRAG_LOOK = { threshold: 5, clickMs: 600 };

/**
 * Status badges and instrument tag labels while walking: shown only within `range` (m) of the eye
 * and in line of sight, re-checked every `intervalMs`; a hit closer than `margin` (m) to the
 * marker's anchor doesn't hide it (the anchor sits just above its own geometry).
 */
export const WALK_MARKERS = { range: 20, margin: 0.25, intervalMs: 200 };

/**
 * A pointer-lock request that fails although it came with a user gesture, and not right after the
 * user freed the pointer (browsers refuse a quick re-lock), means the browser doesn't grant pointer
 * lock at all (e.g. an embedded browser): mouse look falls back to dragging.
 */
export const LOCK_RELOCK_MS = 1500;
/**
 * Consecutive refusals (see isLockRefusal) after which the browser counts as not granting pointer
 * lock at all: a single failure can be transient (e.g. the window had just lost the focus)
 */
export const LOCK_REFUSALS = 2;

/** the body may touch geometry by this much and still count as fitting */
const FIT_SKIN = 0.02;
/**
 * The ground rays start this far above the step height and pass through surfaces above it, so an
 * obstacle as tall as the step is found and a taller one is never mistaken for a floor below it
 */
const PROBE_LIFT = 0.1;
/** a surface this little above the step height (rounding of modelled heights) is still stepped */
const STEP_TOLERANCE = 0.002;
/** a door leaf's floor check looks this far beyond each face of the closed leaf */
const DOOR_FLOOR_PROBE = 0.5;
/** ground probe rays: centre plus four at 60 % of the radius */
const PROBE_OFFSETS: [number, number][] = [
  [0, 0],
  [0.6 * WALK.radius, 0],
  [-0.6 * WALK.radius, 0],
  [0, 0.6 * WALK.radius],
  [0, -0.6 * WALK.radius],
];
const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);

export type WalkSource = {
  /** model entry key, reported with hits and structure lookups */
  key: string;
  root: Object3D;
  /** building structure (room shell, roof, stair) rather than equipment */
  structure?: boolean;
};

export type WalkCollider = {
  mesh: Mesh;
  bvh: MeshBVH;
  key: string;
  structure: boolean;
  /** every material is see-through (translucent walls, roof slab) */
  transparent: boolean;
  /** world bounds, world matrix and its inverse, frozen when the world is built (static geometry) */
  box: Box3;
  matrix: Matrix4;
  inverse: Matrix4;
  normalMatrix: Matrix3;
};

export type WalkHit = {
  point: Vector3;
  /** world normal of the hit face, turned toward the ray (winding independent) */
  normal: Vector3;
  distance: number;
  /** null = the infinite floor plane */
  collider: WalkCollider | null;
};

export type WalkDoor = {
  object: Object3D;
  /** closed orientation */
  closed: Quaternion;
  /** opening angle in radians about the parent's +Y (dt_open_deg) */
  angle: number;
  /** world centre of the closed leaf: the player's distance to it opens and closes the door */
  center: Vector3;
  /** 0 closed .. 1 open */
  progress: number;
};

export type WalkWorldOptions = {
  /** height of the infinite floor plane (the scope's ground); null = none */
  floorY?: number | null;
  /** falling below this respawns; default floorY − WALK.respawnDepth */
  killY?: number;
  /**
   * Whether a mesh is looked through (WalkCollider.transparent); default: every material is
   * translucent (opacity < 0.5). The viewer passes its see-through walls choice here.
   */
  isTransparent?: (mesh: Mesh) => boolean;
};

/** Default look-through test: every material of the mesh is translucent */
export const translucentMesh = (mesh: Mesh) =>
  (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).every(
    (m: Material) => m.transparent && m.opacity < 0.5
  );

/**
 * How pushOut resolves an overlap. `full`: along the contact normal. `sideways`: horizontally only,
 * just far enough that the capsule no longer overlaps the contact, so an edge above the step height
 * blocks the body instead of lifting it, whatever the speed or frame rate. `airborne`: sideways, but
 * a contact above the body pushes it down (a ceiling stops a jump); nothing lifts the body above
 * its arc (only the ground rays raise the feet, by at most WALK.step).
 */
export type PushMode = 'full' | 'sideways' | 'airborne';

export type WalkInput = {
  /** −1 back … 1 forward */
  forward: number;
  /** −1 left … 1 right */
  strafe: number;
  run?: boolean;
  /** start a jump (ignored in the air) */
  jump?: boolean;
};

const isMesh = (o: Object3D): o is Mesh => (o as Mesh).isMesh === true;
const isDoorLeaf = (o: Object3D) => o.userData?.dt_type === 'door_leaf';
const isSpinning = (o: Object3D) => ['x', 'y', 'z'].includes(String(o.userData?.dt_spin ?? ''));
const smooth = (t: number) => t * t * (3 - 2 * t);

const bvhCache = new WeakMap<BufferGeometry, MeshBVH | null>();

/**
 * The geometry's bounds tree, built once per geometry (clones of one GLB share their geometry, so
 * three chillers build one tree) and set as `geometry.boundsTree` for the accelerated raycast.
 * Null for geometry without triangles.
 */
export const boundsTreeOf = (geometry: BufferGeometry): MeshBVH | null => {
  const cached = bvhCache.get(geometry);
  if (cached !== undefined) return cached;
  const position = geometry.getAttribute('position');
  const count = geometry.index ? geometry.index.count : (position?.count ?? 0);
  let bvh: MeshBVH | null = null;
  if (position && count >= 3) {
    bvh = geometry.boundsTree ?? new MeshBVH(geometry, { verbose: false });
    geometry.boundsTree = bvh;
  }
  bvhCache.set(geometry, bvh);
  return bvh;
};

/**
 * Key events walk mode must leave alone: typing in a field, or anything inside the AI assistant
 * panel (it stays usable while walking).
 */
export const isWalkKeyIgnored = (target: EventTarget | null) => {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  const el = target as HTMLElement;
  if (el.closest('[data-ai-assistant-panel]')) return true;
  return (
    el.isContentEditable === true ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ||
    !!el.closest(
      '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
    )
  );
};

/** focusable controls that operate on keys themselves (the view's own container is none of them) */
const CONTROL_SELECTOR = [
  'button',
  'a[href]',
  'summary',
  ...[
    'button',
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'tab',
    'radio',
    'checkbox',
    'switch',
    'slider',
    'spinbutton',
    'treeitem',
    'gridcell',
  ].map((role) => `[role="${role}"]`),
].join(', ');

/** whether the keyboard put the focus on the element (`:focus-visible`), not a mouse click */
const hasKeyboardFocus = (el: Element) => {
  try {
    return el.matches(':focus-visible');
  } catch {
    return false;
  }
};

/**
 * Keys walk mode leaves to the focused control (a HUD menu item, a dashboard button, a tree item),
 * so keyboard users can operate them while walking: Tab always moves the focus on from a control;
 * Space (press) and the arrow keys (lists, tabs, menus) belong to a control the keyboard focused.
 * After a mouse click on a HUD button, Space still jumps and the arrows still walk.
 * `keyboardFocus` defaults to the target's `:focus-visible`.
 */
export const isKeyForControl = (
  target: EventTarget | null,
  code: string,
  keyboardFocus?: boolean
) => {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  const control = (target as Element).closest(CONTROL_SELECTOR);
  if (!control) return false;
  if (code === 'Tab') return true;
  if (code !== 'Space' && !code.startsWith('Arrow')) return false;
  return keyboardFocus ?? hasKeyboardFocus(target as Element);
};

/**
 * An Esc that closes something open with the focus in it — a drop-down (its combobox is expanded),
 * a list box or a menu — belongs to that widget: walk mode doesn't leave on it.
 */
export const isEscapeForWidget = (target: EventTarget | null) =>
  !!target &&
  typeof (target as Element).closest === 'function' &&
  !!(target as Element).closest(
    '[role="combobox"][aria-expanded="true"], [role="listbox"], [role="menu"]'
  );

/**
 * Key of the structure whose bounds contain the point (feet); rooms win over larger structures
 * (roof, building-wide parts), then the smallest box. Null when none contains it.
 */
export const structureAtPoint = (entries: { key: string; box: Box3 }[], point: Vector3) => {
  // the feet stand on a floor's top face: test a little above them
  const p = point.clone().setY(point.y + 0.2);
  const volume = (b: Box3) => {
    const s = b.getSize(new Vector3());
    return s.x * s.y * s.z;
  };
  // rooms (room shells, the cleanroom) name the place before other building parts around them
  const isRoom = (key: string) => /room/i.test(key);
  const inside = entries.filter((e) => !e.box.isEmpty() && e.box.containsPoint(p));
  inside.sort(
    (a, b) => Number(isRoom(b.key)) - Number(isRoom(a.key)) || volume(a.box) - volume(b.box)
  );
  return inside[0]?.key ?? null;
};

/** A press on the view while walking with the pointer free (drag-look); see pressMove / pressIsClick */
export type LookPress = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  /** ms (performance.now) when the press started */
  time: number;
  /** moved past DRAG_LOOK.threshold: a drag, never a click again */
  dragging: boolean;
};

export const pressStart = (x: number, y: number, time: number): LookPress => ({
  startX: x,
  startY: y,
  lastX: x,
  lastY: y,
  time,
  dragging: false,
});

/**
 * The pointer moved to (x, y) during a press: the look delta in pixels (the same sign as pointer
 * lock movement: right turns right, down looks down). Zero until the press moves past the
 * threshold; the first drag delta then includes the movement from the start, so no motion is lost.
 */
export const pressMove = (press: LookPress, x: number, y: number): { dx: number; dy: number } => {
  if (!press.dragging && Math.hypot(x - press.startX, y - press.startY) <= DRAG_LOOK.threshold)
    return { dx: 0, dy: 0 };
  press.dragging = true;
  const delta = { dx: x - press.lastX, dy: y - press.lastY };
  press.lastX = x;
  press.lastY = y;
  return delta;
};

/** The press ended at (x, y): a click when it never became a drag, stayed put and was short */
export const pressIsClick = (press: LookPress, x: number, y: number, time: number) =>
  !press.dragging &&
  Math.hypot(x - press.startX, y - press.startY) <= DRAG_LOOK.threshold &&
  time - press.time <= DRAG_LOOK.clickMs;

/**
 * Whether a pointerlockerror means the browser refuses pointer lock for good: the request had a
 * user gesture and came long enough after the user last freed the pointer
 */
export const isLockRefusal = (request: { activation: boolean; sinceUnlockMs: number }) =>
  request.activation && request.sinceUnlockMs > LOCK_RELOCK_MS;

/**
 * Whether a walk-mode marker (status badge, tag label) anchored at `anchor` shows to the eye:
 * within WALK_MARKERS.range and with no collider between (geometry `skip` accepts, such as the
 * marker's own equipment or part, doesn't hide it). Without a world only the range applies.
 */
export const markerVisible = (
  world: WalkWorld | null,
  eye: Vector3,
  anchor: Vector3,
  skip?: (collider: WalkCollider) => boolean,
  range = WALK_MARKERS.range
) =>
  eye.distanceTo(anchor) <= range && !world?.segmentBlocked(eye, anchor, WALK_MARKERS.margin, skip);

/** the body capsule of feet at `feet`: it floats WALK.step above them, so low obstacles are stepped */
const bodySegment = (feet: Vector3, target: Line3) => {
  target.start.set(feet.x, feet.y + WALK.step + WALK.radius, feet.z);
  target.end.set(feet.x, feet.y + WALK.height - WALK.radius, feet.z);
  return target;
};

const _box = new Box3();
const _localBox = new Box3();
const _start = new Vector3();
const _end = new Vector3();
const _triPoint = new Vector3();
const _capPoint = new Vector3();
const _dir = new Vector3();
const _mid = new Vector3();
const _ray = new Ray();
const _q = new Quaternion();
const _fitSegment = new Line3();

/**
 * Static collision world of a scope: triangle-accurate (three-mesh-bvh) colliders for every visible
 * mesh of the sources except spinning parts and door leaves, the infinite floor plane, and the
 * door leaves (animated, never colliding). A door leaf without floor on both sides (a roof gate
 * whose stair isn't in the scope) would lead into a fall: it stays shut and collides.
 */
export class WalkWorld {
  readonly colliders: WalkCollider[] = [];
  readonly doors: WalkDoor[] = [];
  readonly floorY: number | null;
  readonly killY: number;
  /** above every collider */
  private top = 0;
  /** collider world bounds, 6 floats each, for a tight broad-phase loop */
  private bounds = new Float32Array(0);
  private readonly found: number[] = [];
  private current: WalkCollider | null = null;
  private castSegment = new Line3();
  private castRadius = 0;
  private castMode: PushMode = 'full';
  private isTransparent: (mesh: Mesh) => boolean;

  private readonly pushCast = {
    intersectsBounds: (box: Box3) => box.intersectsBox(_localBox),
    intersectsTriangle: (tri: ExtendedTriangle) => {
      this.toWorld(tri);
      const segment = this.castSegment;
      const radius = this.castRadius;
      const d = tri.closestPointToSegment(segment, _triPoint, _capPoint);
      if (d >= radius) return false;
      if (d > 1e-6) {
        _dir.subVectors(_capPoint, _triPoint).divideScalar(d);
      } else {
        // the axis touches the face: push along its normal, toward the body's middle
        tri.getNormal(_dir);
        segment.getCenter(_mid);
        if (_dir.dot(_mid.sub(tri.a)) < 0) _dir.negate();
      }
      let push = radius - d;
      if (this.castMode === 'sideways' || (this.castMode === 'airborne' && _dir.y >= 0)) {
        // horizontally, to where the capsule just touches the contact point (exact for an edge)
        const h = Math.hypot(_dir.x, _dir.z);
        // straight above or below the axis: no way out sideways (the ground rays own the height)
        if (h < 1e-6) return false;
        const dy = _dir.y * d;
        push = Math.sqrt(radius * radius - dy * dy) - h * d;
        _dir.set(_dir.x / h, 0, _dir.z / h);
      }
      segment.start.addScaledVector(_dir, push);
      segment.end.addScaledVector(_dir, push);
      return false;
    },
  };

  private readonly fitCast = {
    intersectsBounds: (box: Box3) => box.intersectsBox(_localBox),
    intersectsTriangle: (tri: ExtendedTriangle) => {
      this.toWorld(tri);
      return tri.closestPointToSegment(_fitSegment) < WALK.radius - FIT_SKIN;
    },
  };

  constructor(sources: WalkSource[], opts: WalkWorldOptions = {}) {
    this.floorY = opts.floorY ?? null;
    this.killY = opts.killY ?? (this.floorY ?? 0) - WALK.respawnDepth;
    this.isTransparent = opts.isTransparent ?? translucentMesh;
    const leaves: { source: WalkSource; object: Object3D }[] = [];
    sources.forEach((source) => {
      source.root.updateWorldMatrix(true, true);
      this.collect(source, source.root, leaves);
    });
    this.index();
    // doors need the static world to tell where they lead
    let locked = false;
    leaves.forEach(({ source, object }) => {
      const angle = (Number(object.userData.dt_open_deg ?? 90) * Math.PI) / 180;
      const box = new Box3().setFromObject(object);
      if (Number.isFinite(angle) && angle !== 0 && !box.isEmpty() && this.opensOntoFloor(box)) {
        this.doors.push({
          object,
          closed: object.quaternion.clone(),
          angle,
          center: box.getCenter(new Vector3()),
          progress: 0,
        });
      } else {
        this.collect(source, object, null);
        locked = true;
      }
    });
    if (locked) this.index();
  }

  /**
   * Re-evaluate which colliders are looked through (the see-through walls choice changed); the
   * collision geometry itself is unchanged.
   */
  refreshTransparency(isTransparent: (mesh: Mesh) => boolean = this.isTransparent) {
    this.isTransparent = isTransparent;
    this.colliders.forEach((c) => {
      c.transparent = isTransparent(c.mesh);
    });
  }

  /** colliders of `o` and below; door leaves go to `leaves` (null: they collide like any part) */
  private collect(
    source: WalkSource,
    o: Object3D,
    leaves: { source: WalkSource; object: Object3D }[] | null
  ) {
    // moving parts (spinners, track vehicles) never collide: the world is frozen when built
    if (!o.visible || isSpinning(o) || typeof o.userData?.dt_vehicle === 'string') return;
    if (leaves && isDoorLeaf(o)) {
      leaves.push({ source, object: o });
      return;
    }
    if (isMesh(o)) this.addCollider(source, o);
    o.children.forEach((child) => this.collect(source, child, leaves));
  }

  /** the broad-phase bounds and the world's top, after colliders were added */
  private index() {
    this.top = this.colliders.reduce((y, c) => Math.max(y, c.box.max.y), this.floorY ?? 0) + 1;
    this.bounds = new Float32Array(this.colliders.length * 6);
    this.colliders.forEach((c, i) => {
      this.bounds.set(
        [c.box.min.x, c.box.min.y, c.box.min.z, c.box.max.x, c.box.max.y, c.box.max.z],
        i * 6
      );
    });
  }

  /**
   * Whether a closed door leaf (world bounds) has walkable floor on both sides, no further below
   * its foot than the player can climb back (WALK.step + WALK.jumpHeight)
   */
  private opensOntoFloor(leaf: Box3) {
    const center = leaf.getCenter(new Vector3());
    const size = leaf.getSize(new Vector3());
    // the leaf is thin across the passage
    const acrossX = size.x < size.z;
    const reach = (acrossX ? size.x : size.z) / 2 + DOOR_FLOOR_PROBE;
    const foot = leaf.min.y;
    return [-1, 1].every((side) => {
      const x = center.x + (acrossX ? side * reach : 0);
      const z = center.z + (acrossX ? 0 : side * reach);
      return !!this.groundBelow(x, z, foot + WALK.step, foot - WALK.step - WALK.jumpHeight);
    });
  }

  private addCollider(source: WalkSource, mesh: Mesh) {
    const bvh = boundsTreeOf(mesh.geometry);
    if (!bvh) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const matrix = mesh.matrixWorld.clone();
    this.colliders.push({
      mesh,
      bvh,
      key: source.key,
      structure: !!source.structure,
      transparent: this.isTransparent(mesh),
      box: (mesh.geometry.boundingBox as Box3).clone().applyMatrix4(matrix),
      matrix,
      inverse: matrix.clone().invert(),
      normalMatrix: new Matrix3().getNormalMatrix(matrix),
    });
  }

  /** a shapecast triangle is in the collider's local frame: move it to the world */
  private toWorld(tri: ExtendedTriangle) {
    const m = (this.current as WalkCollider).matrix;
    tri.a.applyMatrix4(m);
    tri.b.applyMatrix4(m);
    tri.c.applyMatrix4(m);
    tri.needsUpdate = true;
  }

  /** indices of the colliders whose bounds meet the box (reused array) */
  private query(box: Box3) {
    const b = this.bounds;
    const found = this.found;
    found.length = 0;
    const { min, max } = box;
    for (let i = 0, n = this.colliders.length; i < n; i++) {
      const o = i * 6;
      if (
        b[o] <= max.x &&
        b[o + 3] >= min.x &&
        b[o + 1] <= max.y &&
        b[o + 4] >= min.y &&
        b[o + 2] <= max.z &&
        b[o + 5] >= min.z
      )
        found.push(i);
    }
    return found;
  }

  /** slab test of a ray against collider i's bounds */
  private rayMeetsBounds(i: number, origin: Vector3, inv: Vector3, far: number) {
    const b = this.bounds;
    const o = i * 6;
    let t0 = 0;
    let t1 = far;
    for (let axis = 0; axis < 3; axis++) {
      const p = axis === 0 ? origin.x : axis === 1 ? origin.y : origin.z;
      const d = axis === 0 ? inv.x : axis === 1 ? inv.y : inv.z;
      let near = (b[o + axis] - p) * d;
      let farT = (b[o + axis + 3] - p) * d;
      if (Number.isNaN(near) || Number.isNaN(farT)) {
        // parallel to the slab (0 × ∞): inside it or not at all
        if (p < b[o + axis] || p > b[o + axis + 3]) return false;
        continue;
      }
      if (near > farT) [near, farT] = [farT, near];
      t0 = Math.max(t0, near);
      t1 = Math.min(t1, farT);
      if (t0 > t1) return false;
    }
    return true;
  }

  /**
   * Every hit of a ray (direction normalised) within `far`, nearest first, including the floor
   * plane for rays going down. Faces count from both sides.
   */
  raycastAll(origin: Vector3, direction: Vector3, far: number): WalkHit[] {
    const hits: WalkHit[] = [];
    const inv = new Vector3(1 / direction.x, 1 / direction.y, 1 / direction.z);
    _end.copy(origin).addScaledVector(direction, far);
    for (let i = 0, n = this.colliders.length; i < n; i++) {
      if (!this.rayMeetsBounds(i, origin, inv, far)) continue;
      const c = this.colliders[i];
      // the segment in the collider's frame keeps its length ratio under any affine transform
      _start.copy(origin).applyMatrix4(c.inverse);
      _ray.origin.copy(_start);
      _ray.direction.copy(_end).applyMatrix4(c.inverse).sub(_start);
      const localFar = _ray.direction.length();
      if (localFar < 1e-9) continue;
      _ray.direction.divideScalar(localFar);
      c.bvh.raycast(_ray, DoubleSide, 0, localFar).forEach((hit) => {
        const normal = (hit.face?.normal ?? UP).clone().applyMatrix3(c.normalMatrix).normalize();
        if (normal.dot(direction) > 0) normal.negate();
        hits.push({
          point: hit.point.clone().applyMatrix4(c.matrix),
          normal,
          distance: (hit.distance / localFar) * far,
          collider: c,
        });
      });
    }
    if (this.floorY !== null && direction.y < -1e-9) {
      const t = (this.floorY - origin.y) / direction.y;
      if (t >= 0 && t <= far)
        hits.push({
          point: origin.clone().addScaledVector(direction, t),
          normal: UP.clone(),
          distance: t,
          collider: null,
        });
    }
    return hits.sort((a, b) => a.distance - b.distance);
  }

  /** nearest hit the predicate accepts (default: any) */
  raycast(origin: Vector3, direction: Vector3, far: number, accept?: (hit: WalkHit) => boolean) {
    return this.raycastAll(origin, direction, far).find((h) => !accept || accept(h)) ?? null;
  }

  /**
   * Whether a collider lies on the segment `from` → `to`, short of `to` by `margin` (line of
   * sight). Colliders `skip` accepts are ignored; the floor plane never blocks. Stops at the first
   * blocking face, so it is cheaper than a raycast.
   */
  segmentBlocked(
    from: Vector3,
    to: Vector3,
    margin = 0,
    skip?: (collider: WalkCollider) => boolean
  ): boolean {
    const direction = _dir.subVectors(to, from);
    const far = direction.length() - margin;
    if (far <= 1e-6) return false;
    direction.normalize();
    const inv = new Vector3(1 / direction.x, 1 / direction.y, 1 / direction.z);
    const end = new Vector3().copy(from).addScaledVector(direction, far);
    for (let i = 0, n = this.colliders.length; i < n; i++) {
      if (!this.rayMeetsBounds(i, from, inv, far)) continue;
      const c = this.colliders[i];
      if (skip?.(c)) continue;
      _start.copy(from).applyMatrix4(c.inverse);
      _ray.origin.copy(_start);
      _ray.direction.copy(end).applyMatrix4(c.inverse).sub(_start);
      const localFar = _ray.direction.length();
      if (localFar < 1e-9) continue;
      _ray.direction.divideScalar(localFar);
      if (c.bvh.raycastFirst(_ray, DoubleSide, 0, localFar)) return true;
    }
    return false;
  }

  /**
   * Highest walkable surface between `top` and `bottom` straight below (x, z). The ray starts a
   * little above `top` and passes through anything higher, so a surface right at `top` is found
   * even when the ray would otherwise start inside its solid.
   */
  groundBelow(x: number, z: number, top: number, bottom: number): WalkHit | null {
    if (top <= bottom) return null;
    const start = top + PROBE_LIFT;
    const limit = top + STEP_TOLERANCE;
    return this.raycast(
      new Vector3(x, start, z),
      DOWN,
      start - bottom,
      (h) => h.point.y <= limit && isWalkable(h)
    );
  }

  /**
   * Pushes a capsule (segment ± radius) out of the colliders it overlaps, one pass (three-mesh-bvh's
   * character example), resolving each contact as `mode` says. Moves `segment` and returns the
   * total offset.
   */
  pushOut(
    segment: Line3,
    radius: number,
    target = new Vector3(),
    mode: PushMode = 'full'
  ): Vector3 {
    _start.copy(segment.start);
    _box.makeEmpty().expandByPoint(segment.start).expandByPoint(segment.end).expandByScalar(radius);
    this.castSegment = segment;
    this.castRadius = radius;
    this.castMode = mode;
    this.query(_box).forEach((i) => {
      const c = this.colliders[i];
      this.current = c;
      _localBox.copy(_box).applyMatrix4(c.inverse);
      c.bvh.shapecast(this.pushCast);
    });
    this.current = null;
    return target.subVectors(segment.start, _start);
  }

  /**
   * True when the body standing at `feet` overlaps no collider (the step zone below it may) and
   * is not enclosed by a solid (e.g. inside a chiller shell, where no face is near the body)
   */
  fits(feet: Vector3): boolean {
    bodySegment(feet, _fitSegment);
    _box
      .makeEmpty()
      .expandByPoint(_fitSegment.start)
      .expandByPoint(_fitSegment.end)
      .expandByScalar(WALK.radius);
    const blocked = this.query(_box).some((i) => {
      const c = this.colliders[i];
      this.current = c;
      _localBox.copy(_box).applyMatrix4(c.inverse);
      return c.bvh.shapecast(this.fitCast);
    });
    this.current = null;
    return !blocked && !this.insideSolid(_fitSegment.getCenter(new Vector3()));
  }

  /**
   * Whether a point is enclosed by a collider mesh: an odd number of its faces above the point
   * (parity, winding independent). Hits on one mesh closer than 0.1 mm count once (a ray through
   * a triangle edge meets both triangles). A collider can only enclose points inside its bounds:
   * an open overhead panel may have one hit above a point far below it.
   */
  insideSolid(point: Vector3): boolean {
    const far = this.top - point.y;
    if (far <= 0) return false;
    // nudged off the grid lines that box faces split on
    const origin = new Vector3(point.x + 1.37e-4, point.y, point.z + 2.11e-4);
    const counts = new Map<WalkCollider, { n: number; last: number }>();
    this.raycastAll(origin, UP, far).forEach(({ collider, distance }) => {
      if (!collider || !collider.box.containsPoint(point)) return;
      const entry = counts.get(collider);
      if (!entry) counts.set(collider, { n: 1, last: distance });
      else if (distance - entry.last > 1e-4) {
        entry.n++;
        entry.last = distance;
      }
    });
    return [...counts.values()].some((c) => c.n % 2 === 1);
  }

  /**
   * Feet position on the floor below (x, z) under `top` where the body fits: the highest walkable
   * structure surface or the floor plane (equipment tops above it are skipped). Null when that
   * floor has no room for the body.
   */
  floorAt(x: number, z: number, top: number): Vector3 | null {
    const bottom = (this.floorY ?? top - 60) - 0.05;
    if (top <= bottom) return null;
    const floor = this.raycastAll(new Vector3(x, top, z), DOWN, top - bottom).find(
      (h) => isWalkable(h) && (!h.collider || h.collider.structure)
    );
    return floor && this.fits(floor.point) ? floor.point : null;
  }

  /** Free floor spot nearest to `center` (rings of candidates out to `maxRadius`), searched below `top` */
  freeSpotNear(center: Vector3, top: number, maxRadius = 12): Vector3 | null {
    const spacing = 0.75;
    for (let r = 0; r <= maxRadius; r += spacing) {
      const count = r === 0 ? 1 : Math.max(6, Math.round((2 * Math.PI * r) / spacing));
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2;
        const spot = this.floorAt(center.x + Math.cos(a) * r, center.z + Math.sin(a) * r, top);
        if (spot) return spot;
      }
    }
    return null;
  }

  /**
   * A free floor spot about 1.5 m in front of a bounding box, facing its centre. Sides facing
   * `from` (the viewer) come first, long faces (the usual front of plant equipment) before end
   * faces; then further out and sideways. The first spot with nothing between the eye and the box
   * wins (colliders of `ownKey`, the target itself, don't count); else the first one with no wall
   * or slab between (pipes may be in the way); a box too large for any of that (a whole loop)
   * falls back to the free spot nearest its centre.
   */
  spawnNear(
    box: Box3,
    from: Vector3 | null,
    ownKey?: string
  ): { position: Vector3; yaw: number } | null {
    const center = box.getCenter(new Vector3());
    const half = box.getSize(new Vector3()).multiplyScalar(0.5);
    // search the floor from a little above the box's foot (a tall box must not find the roof)
    const top = Math.max(box.min.y + 0.3, Math.min(box.max.y, box.min.y + 2));
    const toward = from ? from.clone().sub(center).setY(0).normalize() : new Vector3();
    const widest = Math.max(half.x, half.z) || 1;
    const score = (side: Vector3) =>
      side.dot(toward) + (0.5 * (side.x !== 0 ? half.z : half.x)) / widest;
    const sides = [
      new Vector3(1, 0, 0),
      new Vector3(-1, 0, 0),
      new Vector3(0, 0, 1),
      new Vector3(0, 0, -1),
    ].sort((a, b) => score(b) - score(a));
    const facing = (feet: Vector3) => Math.atan2(-(center.x - feet.x), -(center.z - feet.z));
    const behindWall = (h: WalkHit) => !!h.collider?.structure;
    const blocked = (h: WalkHit) => !!h.collider && h.collider.key !== ownKey;
    let fallback: Vector3 | null = null;
    for (const distance of [1.5, 2.25, 3]) {
      for (const side of sides) {
        const tangent = new Vector3(-side.z, 0, side.x);
        const reach = Math.abs(side.x) * half.x + Math.abs(side.z) * half.z + distance;
        for (const lateral of [0, -0.75, 0.75, -1.5, 1.5]) {
          const x = center.x + side.x * reach + tangent.x * lateral;
          const z = center.z + side.z * reach + tangent.z * lateral;
          const feet = this.floorAt(x, z, top);
          if (!feet || !this.seesBox(feet, box, center, behindWall)) continue;
          if (this.seesBox(feet, box, center, blocked))
            return { position: feet, yaw: facing(feet) };
          fallback ??= feet;
        }
      }
    }
    const spot = fallback ?? this.freeSpotNear(new Vector3(center.x, box.min.y, center.z), top);
    return spot ? { position: spot, yaw: facing(spot) } : null;
  }

  /** nothing the predicate counts lies between the eye at `feet` and the box */
  private seesBox(feet: Vector3, box: Box3, center: Vector3, obstacle: (h: WalkHit) => boolean) {
    const eye = feet.clone().setY(feet.y + WALK.eye);
    const dir = center.clone().sub(eye);
    const length = dir.length();
    if (length < 1e-6) return true;
    dir.divideScalar(length);
    const entry = new Ray(eye, dir).intersectBox(box, new Vector3());
    const reach = entry ? entry.distanceTo(eye) : length;
    return !this.raycast(eye, dir, Math.max(0, reach - 0.05), obstacle);
  }

  /**
   * Opens the doors within WALK.doorRange of the player (null = nobody: all close) and closes the
   * others, over WALK.doorSeconds. `moving` while any door turns; `settled` when one stopped in
   * this call (refresh the shadows).
   */
  updateDoors(dt: number, player: Vector3 | null) {
    let moving = false;
    let settled = false;
    this.doors.forEach((door) => {
      const near =
        !!player &&
        Math.hypot(player.x - door.center.x, player.z - door.center.z) < WALK.doorRange &&
        Math.abs(player.y - door.center.y) < 2.5;
      const target = near ? 1 : 0;
      if (door.progress === target) return;
      const delta = dt / WALK.doorSeconds;
      door.progress =
        target > door.progress
          ? Math.min(target, door.progress + delta)
          : Math.max(target, door.progress - delta);
      door.object.quaternion
        .copy(door.closed)
        .premultiply(_q.setFromAxisAngle(UP, smooth(door.progress) * door.angle));
      door.object.updateMatrixWorld();
      if (door.progress === target) settled = true;
      else moving = true;
    });
    return { moving, settled };
  }
}

const isWalkable = (hit: WalkHit) => hit.normal.y > WALK.walkable;

/**
 * First-person character on a WalkWorld: a capsule (radius 0.3, height 1.75) floating WALK.step above
 * the feet, which a few ground rays snap onto the floor, so obstacles up to 0.4 m (stairs) are
 * stepped and anything higher blocks (contacts push the body sideways only, see PushMode). Gravity,
 * jump (clears about jumpHeight + step), ceiling stop, respawn below the world.
 */
export class WalkController {
  world: WalkWorld;
  /** feet position (world) */
  readonly feet = new Vector3();
  /** radians; 0 looks toward −Z */
  yaw = 0;
  /** radians, positive looks up */
  pitch = 0;
  velocityY = 0;
  grounded = false;
  /** eye height eased over steps, so stairs don't jerk the view */
  viewY = WALK.eye;
  respawns = 0;
  private readonly spawnFeet = new Vector3();
  private spawnYaw = 0;
  private readonly segment = new Line3();
  private readonly delta = new Vector3();

  constructor(world: WalkWorld) {
    this.world = world;
  }

  /** eye position (world) */
  get eye() {
    return new Vector3(this.feet.x, this.viewY, this.feet.z);
  }

  /** Stand at `feet` facing `yaw`, level, at rest; also the respawn point */
  place(feet: Vector3, yaw = this.yaw) {
    this.spawnFeet.copy(feet);
    this.spawnYaw = yaw;
    this.reset(feet, yaw);
  }

  /** Re-seat the feet on the ground below / just above them (e.g. after the world changed) */
  settle() {
    this.velocityY = 0;
    const ground = this.probeGround(WALK.snap);
    this.grounded = ground !== null;
    if (ground !== null) this.feet.y = ground;
    this.viewY = this.feet.y + WALK.eye;
  }

  /**
   * Carry the player into another world (a new scope) where they stand: the feet re-seat on its
   * ground, or, when the body doesn't fit there (inside equipment only the new world has), the
   * player moves to the nearest free floor spot, keeping the heading; that spot is the new respawn
   * point. False when no spot is free (the caller picks one).
   */
  moveToWorld(world: WalkWorld): boolean {
    this.world = world;
    if (world.fits(this.feet)) {
      this.settle();
      return true;
    }
    const spot = world.freeSpotNear(this.feet, this.feet.y + 1);
    if (!spot) {
      this.settle();
      return false;
    }
    this.place(spot, this.yaw);
    return true;
  }

  /** Mouse look: pixel deltas */
  look(dx: number, dy: number, sensitivity = 0.0022) {
    this.yaw = (this.yaw - dx * sensitivity) % (Math.PI * 2);
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * sensitivity));
  }

  step(dt: number, input: WalkInput) {
    const frame = Math.min(Math.max(dt, 0), WALK.maxFrame);
    if (frame <= 0) return;
    const n = Math.max(1, Math.ceil(frame / WALK.substep - 1e-9));
    const h = frame / n;

    let f = Math.max(-1, Math.min(1, input.forward || 0));
    let s = Math.max(-1, Math.min(1, input.strafe || 0));
    const len = Math.hypot(f, s);
    if (len > 1) {
      f /= len;
      s /= len;
    }
    const speed = input.run ? WALK.runSpeed : WALK.walkSpeed;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // forward = (−sin, 0, −cos), right = (cos, 0, −sin)
    const vx = (-sin * f + cos * s) * speed;
    const vz = (-cos * f - sin * s) * speed;
    let jump = !!input.jump;

    for (let i = 0; i < n; i++) {
      if (jump && this.grounded) {
        this.velocityY = Math.sqrt(2 * WALK.gravity * WALK.jumpHeight);
        this.grounded = false;
      }
      jump = false;
      const wasGrounded = this.grounded;
      if (!wasGrounded) this.velocityY -= WALK.gravity * h;
      this.feet.x += vx * h;
      this.feet.y += this.velocityY * h;
      this.feet.z += vz * h;

      // standing: sideways only (the ground rays own the height); in the air a ceiling may push
      // down, but no edge lifts the body, so a jump clears at most jumpHeight + step
      const delta = this.world.pushOut(
        bodySegment(this.feet, this.segment),
        WALK.radius,
        this.delta,
        wasGrounded ? 'sideways' : 'airborne'
      );
      if (delta.y < -1e-6 && this.velocityY > 0) this.velocityY = 0; // head hit a ceiling
      this.feet.add(delta);

      if (this.velocityY <= 0) {
        const ground = this.probeGround(wasGrounded ? WALK.snap : 0.02);
        this.grounded = ground !== null;
        if (ground !== null) {
          this.feet.y = ground;
          this.velocityY = 0;
        }
      } else {
        this.grounded = false;
      }
    }

    if (this.feet.y < this.world.killY) {
      this.respawns++;
      this.reset(this.spawnFeet, this.spawnYaw);
      return;
    }
    const target = this.feet.y + WALK.eye;
    if (this.grounded && Math.abs(target - this.viewY) < 0.6)
      this.viewY += (target - this.viewY) * Math.min(1, frame * 14);
    else this.viewY = target;
  }

  private reset(feet: Vector3, yaw: number) {
    this.feet.copy(feet);
    this.yaw = yaw;
    this.pitch = 0;
    this.settle();
  }

  /**
   * Highest walkable ground under the probe rays from WALK.step above the feet (higher surfaces
   * are no step) down to `below` under them, or null
   */
  private probeGround(below: number): number | null {
    let best = -Infinity;
    const top = this.feet.y + WALK.step;
    PROBE_OFFSETS.forEach(([ox, oz]) => {
      const hit = this.world.groundBelow(
        this.feet.x + ox,
        this.feet.z + oz,
        top,
        this.feet.y - below
      );
      if (hit && hit.point.y > best) best = hit.point.y;
    });
    return best > -Infinity ? best : null;
  }
}
