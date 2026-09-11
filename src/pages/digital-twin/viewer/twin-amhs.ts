import { Box3, InstancedMesh, Matrix4, Mesh, Object3D, Quaternion, Vector3 } from 'three';
import { FAB1_AMHS, type Fab1AmhsPort } from '../digital-twin.fab1-layout';

/**
 * Overhead hoist transport (OHT) driven by the simulator: every vehicle of the cleanroom GLB
 * (dt_vehicle = the simulator's vehicle id) follows that vehicle's simulated plan, and the FOUPs on
 * the load ports are the simulated lots. Times are epoch milliseconds; the network (tracks, ports)
 * is the one the simulator dispatches on (FAB1_AMHS, generated with cmd/simulator/fab1_amhs.json).
 */

/** A piece of a vehicle's plan (cmd/simulator OhtSeg): a run S0 -> S1, a hoist cycle at a port, or a wait */
export type AmhsSeg = {
  t0: number;
  t1: number;
  track: string;
  s0: number;
  s1: number;
  hoist?: 'pick' | 'drop';
  port?: string;
  lot?: string;
};
/** An idle vehicle at interbay position s at time t (it circulates on at the fleet speed) */
export type AmhsAnchor = { t: number; s: number };
export type AmhsVehicle = { id: string; before: AmhsAnchor; after: AmhsAnchor; segs: AmhsSeg[] };
/** A FOUP on a load port from `from` until `until` (open ends: always) */
export type AmhsPortLot = {
  port: string;
  lot: string;
  product?: string;
  hot?: boolean;
  from?: number;
  until?: number;
};
export type AmhsState = {
  now: number;
  speed: number;
  hoistS: number;
  vehicles: AmhsVehicle[];
  ports: AmhsPortLot[];
  stockers: Record<string, number>;
  moving: number;
};

/** The app shows the transport this far behind the server clock, so every plan is known before it shows */
export const AMHS_DELAY_MS = 15_000;
/** A changed clock-offset estimate is taken up at most this share of real time (no visible jumps) */
export const AMHS_SLEW = 0.05;
/** ... unless it is this far off (the first estimate) */
const SNAP_MS = 2_000;

type TrackGeo = {
  id: string;
  closed: boolean;
  len: number;
  sIn: number;
  sOut: number;
  /** Blender x, y of the polyline (closed: the first point repeated at the end) */
  xs: number[];
  ys: number[];
  /** length along the polyline at every point */
  cum: number[];
};

export type AmhsNetwork = {
  tracks: Map<string, TrackGeo>;
  ports: Record<string, Fab1AmhsPort>;
  speed: number;
  fleet: number;
};

export const amhsNetwork = (src: typeof FAB1_AMHS = FAB1_AMHS): AmhsNetwork => {
  const tracks = new Map<string, TrackGeo>();
  src.tracks.forEach((t) => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i + 1 < t.points.length; i += 2) {
      xs.push(t.points[i]);
      ys.push(t.points[i + 1]);
    }
    if (t.closed) {
      xs.push(xs[0]);
      ys.push(ys[0]);
    }
    const cum = [0];
    for (let i = 1; i < xs.length; i++)
      cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
    tracks.set(t.id, {
      id: t.id,
      closed: t.closed,
      len: cum[cum.length - 1],
      sIn: t.sIn,
      sOut: t.sOut,
      xs,
      ys,
      cum,
    });
  });
  return { tracks, ports: src.ports, speed: src.speed, fleet: src.fleet };
};

const mod = (v: number, m: number) => ((v % m) + m) % m;
const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/** Blender x, y and heading (radians from +x) at `s` metres along a track (a loop wraps) */
export const trackPoint = (net: AmhsNetwork, track: string, s: number) => {
  const t = net.tracks.get(track) ?? net.tracks.get('IB');
  if (!t || t.xs.length < 2) return { x: 0, y: 0, heading: 0 };
  const d = t.closed ? mod(s, t.len) : Math.min(Math.max(s, 0), t.len);
  let lo = 1;
  let hi = t.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (t.cum[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  const i = lo;
  const span = t.cum[i] - t.cum[i - 1] || 1;
  const k = (d - t.cum[i - 1]) / span;
  const dx = t.xs[i] - t.xs[i - 1];
  const dy = t.ys[i] - t.ys[i - 1];
  return { x: t.xs[i - 1] + dx * k, y: t.ys[i - 1] + dy * k, heading: Math.atan2(dy, dx) };
};

export type VehiclePose = {
  track: string;
  s: number;
  /** how far the hoist is down, 0..1 */
  hoist: number;
  /** the lot on the hoist (carried, or being picked / dropped), else null */
  carry: string | null;
};

/** How far the hoist is down (0..1), `e` seconds into a hoist cycle of `dwell` seconds */
export const hoistDown = (e: number, dwell: number) => {
  const lower = Math.min(4, dwell * 0.4);
  if (lower <= 0) return 0;
  if (e < lower) return smooth(e / lower);
  if (e > dwell - lower) return smooth((dwell - e) / lower);
  return 1;
};

/** An idle vehicle's place: it circulates on the interbay loop from its anchor */
const idle = (a: AmhsAnchor, t: number, speed: number, clamp: boolean): VehiclePose => {
  const dt = (t - a.t) / 1000;
  return { track: 'IB', s: a.s + speed * (clamp ? Math.max(0, dt) : dt), hoist: 0, carry: null };
};

/**
 * Where a vehicle is at `t` per its plan: in a segment (run, hoist, wait), or circulating idle on
 * the interbay loop before, between and after its jobs. The FOUP changes hands halfway through a
 * hoist cycle (the port shows it before a pick / after a drop).
 */
export const vehiclePose = (
  v: AmhsVehicle,
  t: number,
  net: AmhsNetwork,
  speed = net.speed
): VehiclePose => {
  const segs = v.segs;
  if (!segs.length) return idle(v.after, t, speed, true);
  if (t < segs[0].t0) return idle(v.before, t, speed, false);
  for (let i = 0; i < segs.length; i++) {
    const g = segs[i];
    if (t < g.t0) {
      // idle between two jobs: from where the earlier one left the loop
      const prev = segs[i - 1];
      const tr = net.tracks.get(prev.track);
      if (prev.track === 'IB' || !tr) return idle({ t: prev.t1, s: prev.s1 }, t, speed, true);
      if (prev.s1 >= tr.len - 1e-6) return idle({ t: prev.t1, s: tr.sOut }, t, speed, true);
      return { track: prev.track, s: prev.s1, hoist: 0, carry: prev.lot ?? null };
    }
    if (t >= g.t1) continue;
    const span = g.t1 - g.t0;
    const e = t - g.t0;
    if (g.hoist) {
      const first = e < span / 2;
      const carry =
        g.hoist === 'pick' ? (first ? null : (g.lot ?? null)) : first ? (g.lot ?? null) : null;
      return { track: g.track, s: g.s0, hoist: hoistDown(e / 1000, span / 1000), carry };
    }
    const k = span > 0 ? e / span : 1;
    return { track: g.track, s: g.s0 + (g.s1 - g.s0) * k, hoist: 0, carry: g.lot ?? null };
  }
  return idle(v.after, t, speed, true);
};

/** The FOUPs on load ports at `t` */
export const portLotsAt = (lots: AmhsPortLot[], t: number) =>
  lots.filter(
    (p) => (p.from === undefined || p.from <= t) && (p.until === undefined || t < p.until)
  );

type HoistPart = { object: Object3D; base: number; drop: number; belt: number; foup: boolean };
type Driven = { id: string; object: Object3D; height: number; parts: HoistPart[] };
type PortFoups = {
  parent: Object3D;
  meshes: { mesh: InstancedMesh; local: Matrix4 }[];
  height: number;
};

const isMesh = (o: Object3D): o is Mesh => (o as Mesh).isMesh === true;

/** the rest-length of a belt part: the height of its meshes' bounds, in its own frame */
const beltLength = (o: Object3D) => {
  const box = new Box3();
  o.traverse((m) => {
    if (!isMesh(m)) return;
    m.geometry.computeBoundingBox();
    if (m.geometry.boundingBox) box.union(m.geometry.boundingBox);
  });
  return box.isEmpty() ? 0 : box.max.y - box.min.y;
};

const _m = new Matrix4();
const _m2 = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3(1, 1, 1);
const _up = new Vector3(0, 1, 0);

/**
 * Drives the dt_vehicle objects of a scope and draws the FOUPs on the load ports (one instanced
 * mesh per FOUP mesh, next to the vehicles). Without a transport state the vehicles stand evenly
 * spaced on the interbay loop with their hoists up and no FOUPs show.
 */
export class AmhsDriver {
  private readonly vehicles: Driven[] = [];
  private readonly foups: PortFoups[] = [];
  private state: AmhsState | null = null;
  /** server minus client clock (ms): the latest estimate and the offset applied, which follows it slowly */
  private target = 0;
  private applied: number | null = null;
  private lastClient = 0;
  private lastShown = Number.NEGATIVE_INFINITY;

  constructor(
    root: Object3D,
    private readonly net: AmhsNetwork = amhsNetwork()
  ) {
    const parents = new Map<Object3D, Driven>();
    root.traverse((o) => {
      const id = o.userData?.dt_vehicle;
      if (typeof id !== 'string') return;
      const parts: HoistPart[] = [];
      o.children.forEach((c) => {
        const belt = c.userData?.dt_hoist_belt === true;
        const drop = Number(c.userData?.dt_hoist ?? 0);
        if (!belt && !(drop > 0)) return;
        parts.push({
          object: c,
          base: c.position.y,
          drop: belt ? 0 : drop,
          belt: belt ? beltLength(c) : 0,
          foup: c.userData?.dt_hoist_foup === true,
        });
      });
      const v: Driven = { id, object: o, height: o.position.y, parts };
      this.vehicles.push(v);
      if (o.parent && !parents.has(o.parent)) parents.set(o.parent, v);
      // a moving vehicle casts no shadow: the shadow map isn't redrawn while it moves
      o.traverse((m) => {
        if (isMesh(m)) m.castShadow = false;
      });
    });
    const capacity = Object.keys(this.net.ports).length;
    parents.forEach((v, parent) => {
      const foup = v.parts.find((p) => p.foup);
      if (!foup) return;
      // the FOUP on a port: its rest place on the hoist, lowered by the hoist's drop
      const height = v.height + foup.base - foup.drop;
      const meshes: PortFoups['meshes'] = [];
      foup.object.updateMatrix();
      foup.object.traverse((m) => {
        if (!isMesh(m)) return;
        const local = new Matrix4();
        for (let p: Object3D | null = m; p && p !== foup.object; p = p.parent) {
          p.updateMatrix();
          local.premultiply(p.matrix);
        }
        const mesh = new InstancedMesh(m.geometry, m.material, capacity);
        mesh.name = 'AMHS_PortFOUPs';
        mesh.count = 0;
        mesh.frustumCulled = false;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        parent.add(mesh);
        meshes.push({ mesh, local });
      });
      this.foups.push({ parent, meshes, height });
    });
    this.step(Date.now());
  }

  get size() {
    return this.vehicles.length;
  }

  /** The simulator's transport state, and the server clock minus the client clock (ms) */
  setState(state: AmhsState | null, offsetMs = 0) {
    this.state = state;
    this.target = offsetMs;
  }

  /**
   * The time the scene shows at client time `clientNow`: the applied clock offset moves towards the
   * estimate by at most AMHS_SLEW of the elapsed time, so the shown time runs on smoothly and never
   * goes back (a client time earlier than the last one starts over).
   */
  displayTime(clientNow: number) {
    if (
      this.applied === null ||
      clientNow < this.lastClient ||
      Math.abs(this.target - this.applied) > SNAP_MS
    ) {
      this.applied = this.target;
      this.lastShown = Number.NEGATIVE_INFINITY;
    } else {
      const step = (clientNow - this.lastClient) * AMHS_SLEW;
      this.applied += Math.min(step, Math.max(-step, this.target - this.applied));
    }
    this.lastClient = clientNow;
    this.lastShown = Math.max(this.lastShown, clientNow + this.applied - AMHS_DELAY_MS);
    return this.lastShown;
  }

  step(clientNow: number) {
    const st = this.state;
    const t = this.displayTime(clientNow);
    const plans = new Map(st?.vehicles.map((v) => [v.id, v]) ?? []);
    const ib = this.net.tracks.get('IB');
    this.vehicles.forEach((d, i) => {
      const plan = plans.get(d.id);
      const pose: VehiclePose = plan
        ? vehiclePose(plan, t, this.net, st?.speed ?? this.net.speed)
        : {
            track: 'IB',
            s: ((ib?.len ?? 0) * i) / Math.max(1, this.vehicles.length),
            hoist: 0,
            carry: null,
          };
      const p = trackPoint(this.net, pose.track, pose.s);
      d.object.position.set(p.x, d.height, -p.y);
      d.object.rotation.set(0, p.heading, 0);
      let down = 0;
      d.parts.forEach((h) => {
        if (h.belt) return;
        h.object.position.y = h.base - h.drop * pose.hoist;
        if (!h.foup) down = h.drop * pose.hoist;
        else h.object.visible = pose.carry !== null;
      });
      d.parts.forEach((h) => {
        if (h.belt > 0) h.object.scale.y = (h.belt + down) / h.belt;
      });
    });
    const lots = st ? portLotsAt(st.ports, t) : [];
    this.foups.forEach((f) => {
      let n = 0;
      lots.forEach((l) => {
        const port = this.net.ports[l.port];
        if (!port) return;
        _p.set(port.x, f.height, -port.y);
        _q.setFromAxisAngle(_up, (port.rot * Math.PI) / 180);
        _m.compose(_p, _q, _s);
        f.meshes.forEach(({ mesh, local }) => {
          mesh.setMatrixAt(n, _m2.multiplyMatrices(_m, local));
        });
        n++;
      });
      f.meshes.forEach(({ mesh }) => {
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
      });
    });
  }

  dispose() {
    this.foups.forEach((f) =>
      f.meshes.forEach(({ mesh }) => {
        mesh.removeFromParent();
        mesh.dispose();
      })
    );
    this.foups.length = 0;
    this.vehicles.length = 0;
  }
}
