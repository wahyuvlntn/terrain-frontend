import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';

import { FAB1_AMHS } from '../digital-twin.fab1-layout';
import {
  AMHS_DELAY_MS,
  AmhsDriver,
  type AmhsState,
  type AmhsVehicle,
  amhsNetwork,
  hoistDown,
  portLotsAt,
  trackPoint,
  vehiclePose,
} from './twin-amhs';

/** a 10 x 4 m loop "IB" (anticlockwise from the origin) and a spur "A" off its north rail: from (8, 4) up to (8, 8) and back to (6, 4) */
const NET = amhsNetwork({
  ...FAB1_AMHS,
  speed: 2,
  tracks: [
    { id: 'IB', closed: true, len: 28, sIn: 0, sOut: 0, points: [0, 0, 10, 0, 10, 4, 0, 4] },
    { id: 'A', closed: false, len: 10, sIn: 16, sOut: 18, points: [8, 4, 8, 8, 6, 8, 6, 4] },
  ],
  ports: {
    'TOOL_01:1': { track: 'A', s: 2, x: 8, y: 6, rot: 90 },
    'STK-01:1': { track: 'IB', s: 5, x: 5, y: 0, rot: 180 },
  },
});

const T0 = Date.UTC(2026, 9, 13, 6, 0, 0);
const at = (sec: number) => T0 + sec * 1000;

/** a job: drive 4 m on the loop, onto the spur, pick at TOOL_01:1, carry round the loop, drop at the stocker */
const plan: AmhsVehicle = {
  id: 'V01',
  before: { t: at(0), s: 12 },
  after: { t: at(34.5), s: 5 },
  segs: [
    { t0: at(0), t1: at(2), track: 'IB', s0: 12, s1: 16 },
    { t0: at(2), t1: at(3), track: 'A', s0: 0, s1: 2 },
    {
      t0: at(3),
      t1: at(13),
      track: 'A',
      s0: 2,
      s1: 2,
      hoist: 'pick',
      port: 'TOOL_01:1',
      lot: 'M1',
    },
    { t0: at(13), t1: at(17), track: 'A', s0: 2, s1: 10, lot: 'M1' },
    { t0: at(17), t1: at(24.5), track: 'IB', s0: 18, s1: 33, lot: 'M1' },
    {
      t0: at(24.5),
      t1: at(34.5),
      track: 'IB',
      s0: 5,
      s1: 5,
      hoist: 'drop',
      port: 'STK-01:1',
      lot: 'M1',
    },
  ],
};

describe('AMHS network geometry', () => {
  it('places a point along a track with its heading, and wraps the loop', () => {
    expect(trackPoint(NET, 'IB', 5)).toEqual({ x: 5, y: 0, heading: 0 });
    const up = trackPoint(NET, 'IB', 12);
    expect([up.x, up.y]).toEqual([10, 2]);
    expect(up.heading).toBeCloseTo(Math.PI / 2);
    expect(trackPoint(NET, 'IB', 33)).toEqual(trackPoint(NET, 'IB', 5));
    expect(trackPoint(NET, 'A', 99)).toMatchObject({ x: 6, y: 4 });
  });

  it('matches the generated FAB1 network: every port lies on its track, spurs join the loop', () => {
    const net = amhsNetwork();
    expect(net.tracks.get('IB')?.len).toBeCloseTo(FAB1_AMHS.tracks[0].len, 3);
    Object.entries(net.ports).forEach(([id, p]) => {
      const q = trackPoint(net, p.track, p.s);
      expect(Math.hypot(q.x - p.x, q.y - p.y), id).toBeLessThan(2e-3);
    });
    FAB1_AMHS.tracks
      .filter((t) => t.id !== 'IB')
      .forEach((t) => {
        const spur = net.tracks.get(t.id)!;
        const a = trackPoint(net, 'IB', t.sIn);
        const b = trackPoint(net, 'IB', t.sOut);
        expect(Math.hypot(a.x - spur.xs[0], a.y - spur.ys[0]), t.id).toBeLessThan(2e-3);
        const n = spur.xs.length - 1;
        expect(Math.hypot(b.x - spur.xs[n], b.y - spur.ys[n]), t.id).toBeLessThan(2e-3);
      });
  });
});

describe('vehicle poses from the simulated plan', () => {
  it('runs along its segments and circulates idle before and after them', () => {
    expect(vehiclePose(plan, at(-1), NET)).toMatchObject({ track: 'IB', s: 10, carry: null });
    expect(vehiclePose(plan, at(1), NET)).toMatchObject({
      track: 'IB',
      s: 14,
      hoist: 0,
      carry: null,
    });
    expect(vehiclePose(plan, at(15), NET)).toMatchObject({ track: 'A', s: 6, carry: 'M1' });
    expect(vehiclePose(plan, at(45), NET)).toMatchObject({ track: 'IB', s: 26, carry: null });
  });

  it('lowers the hoist for a pick and takes the FOUP halfway through', () => {
    const lowering = vehiclePose(plan, at(4), NET);
    expect(lowering).toMatchObject({ track: 'A', s: 2, carry: null });
    expect(lowering.hoist).toBeGreaterThan(0);
    expect(lowering.hoist).toBeLessThan(1);
    expect(vehiclePose(plan, at(8.5), NET)).toMatchObject({ hoist: 1, carry: 'M1' });
    expect(vehiclePose(plan, at(30), NET)).toMatchObject({ hoist: 1, carry: null });
    expect(vehiclePose(plan, at(25.5), NET).carry).toBe('M1');
  });

  it('idles between jobs from where the earlier one left the loop', () => {
    const two: AmhsVehicle = {
      ...plan,
      segs: [
        { t0: at(0), t1: at(4), track: 'A', s0: 2, s1: 10 },
        { t0: at(10), t1: at(12), track: 'IB', s0: 32, s1: 36 },
      ],
    };
    // left the spur at the loop's s 18 at 4 s, 2 m/s
    expect(vehiclePose(two, at(7), NET)).toMatchObject({ track: 'IB', s: 24 });
  });

  it('keeps the hoist curve smooth and within its cycle', () => {
    expect(hoistDown(0, 10)).toBe(0);
    expect(hoistDown(2, 10)).toBeCloseTo(0.5);
    expect(hoistDown(5, 10)).toBe(1);
    expect(hoistDown(10, 10)).toBe(0);
    expect(hoistDown(1, 0)).toBe(0);
  });

  it('shows a FOUP on a port only within its window', () => {
    const lots = [
      { port: 'TOOL_01:1', lot: 'M1', until: at(8) },
      { port: 'STK-01:1', lot: 'M1', from: at(35), until: at(55) },
      { port: 'TOOL_01:1', lot: 'M2' },
    ];
    expect(portLotsAt(lots, at(0)).map((l) => l.lot)).toEqual(['M1', 'M2']);
    expect(portLotsAt(lots, at(36)).map((l) => l.port)).toEqual(['STK-01:1', 'TOOL_01:1']);
    expect(portLotsAt(lots, at(60)).map((l) => l.lot)).toEqual(['M2']);
  });
});

/** an OHT vehicle as the cleanroom GLB has it: body, belts, gripper and FOUP (dt_hoist) */
const vehicleModel = () => {
  const steel = new MeshStandardMaterial();
  const v = new Group();
  v.userData.dt_vehicle = 'V01';
  v.position.set(-16.2, 2.85, 1.2);
  v.add(new Mesh(new BoxGeometry(0.8, 0.3, 0.5), steel));
  const belts = new Mesh(new BoxGeometry(0.03, 0.12, 0.03), steel);
  belts.userData.dt_hoist_belt = true;
  belts.position.y = -0.09;
  const gripper = new Mesh(new BoxGeometry(0.26, 0.05, 0.22), steel);
  Object.assign(gripper.userData, { dt_hoist: 1.348, dt_hoist_release: 0.1 });
  gripper.position.y = -0.235;
  const foup = new Mesh(new BoxGeometry(0.39, 0.3, 0.31), steel);
  Object.assign(foup.userData, { dt_hoist: 1.348, dt_hoist_foup: true });
  foup.position.y = -0.6;
  v.add(belts, gripper, foup);
  const amhs = new Group();
  amhs.add(v);
  const root = new Group();
  root.add(amhs);
  return { root, amhs, v, belts, gripper, foup };
};

const state = (vehicles: AmhsVehicle[], ports: AmhsState['ports'] = []): AmhsState => ({
  now: at(0),
  speed: 2,
  hoistS: 10,
  vehicles,
  ports,
  stockers: {},
  moving: 0,
});

describe('AmhsDriver', () => {
  it('parks the fleet on the loop with the hoists up while there is no transport state', () => {
    const { root, v, foup } = vehicleModel();
    const d = new AmhsDriver(root, NET);
    expect(d.size).toBe(1);
    d.step(at(0));
    expect(v.position.x).toBeCloseTo(0);
    expect(v.position.y).toBeCloseTo(2.85);
    expect(v.position.z).toBeCloseTo(0);
    expect(foup.visible).toBe(false);
  });

  it('moves the vehicle and its hoist on the plan, AMHS_DELAY_MS behind the server clock', () => {
    const { root, v, foup, gripper, belts } = vehicleModel();
    const d = new AmhsDriver(root, NET);
    // the server clock runs 500 ms ahead of the client
    d.setState(state([plan]), 500);
    const client = (sec: number) => at(sec) + AMHS_DELAY_MS - 500;
    d.step(client(13.5));
    expect(v.position.x).toBeCloseTo(8);
    expect(v.position.y).toBeCloseTo(2.85);
    expect(v.position.z).toBeCloseTo(-7);
    expect(v.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(foup.visible).toBe(true);
    expect(gripper.position.y).toBeCloseTo(-0.235);
    d.step(client(8));
    expect(gripper.position.y).toBeCloseTo(-0.235 - 1.348);
    expect(foup.position.y).toBeCloseTo(-0.6 - 1.348);
    expect(belts.scale.y).toBeGreaterThan(10);
  });

  it('draws the FOUPs on the load ports at the port height, oriented with the unit', () => {
    const { root, amhs } = vehicleModel();
    const d = new AmhsDriver(root, NET);
    d.setState(
      state(
        [],
        [
          { port: 'TOOL_01:1', lot: 'M2' },
          { port: 'STK-01:1', lot: 'M3', from: at(30) },
        ]
      )
    );
    d.step(at(10) + AMHS_DELAY_MS);
    const mesh = amhs.children.find((c) => c instanceof InstancedMesh) as InstancedMesh;
    expect(mesh.count).toBe(1);
    const m = new Matrix4();
    mesh.getMatrixAt(0, m);
    const p = new Vector3().setFromMatrixPosition(m);
    expect(p.x).toBeCloseTo(8);
    expect(p.y).toBeCloseTo(2.85 - 0.6 - 1.348);
    expect(p.z).toBeCloseTo(-6);
    d.step(at(31) + AMHS_DELAY_MS);
    expect(mesh.count).toBe(2);
    d.dispose();
    expect(amhs.children.some((c) => c instanceof InstancedMesh)).toBe(false);
  });

  it('finds nothing to drive in a model without vehicles', () => {
    const d = new AmhsDriver(new Object3D(), NET);
    expect(d.size).toBe(0);
  });
});

describe('AmhsDriver clock', () => {
  it('eases into a changed clock offset: the shown time runs on smoothly and never goes back', () => {
    const d = new AmhsDriver(new Object3D(), NET);
    d.setState(state([]), 0);
    const t0 = at(0);
    expect(d.displayTime(t0)).toBe(t0 - AMHS_DELAY_MS);
    // a new estimate 400 ms lower: no jump back, at most 5 % of the elapsed time per frame
    d.setState(state([]), -400);
    let prev = d.displayTime(t0);
    for (let k = 1; k <= 300; k++) {
      const shown = d.displayTime(t0 + k * 33);
      expect(shown - prev).toBeGreaterThan(33 * 0.94);
      expect(shown - prev).toBeLessThan(33 * 1.06);
      prev = shown;
    }
    // after ~8 s it has taken the estimate up
    expect(prev).toBeCloseTo(t0 + 300 * 33 - 400 - AMHS_DELAY_MS, 0);
  });
});
