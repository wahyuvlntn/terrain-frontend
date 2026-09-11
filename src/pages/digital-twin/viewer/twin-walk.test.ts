import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';

import {
  DRAG_LOOK,
  isEscapeForWidget,
  isKeyForControl,
  isLockRefusal,
  isWalkKeyIgnored,
  LOCK_RELOCK_MS,
  markerVisible,
  pressIsClick,
  pressMove,
  pressStart,
  structureAtPoint,
  WALK,
  WALK_MARKERS,
  WalkController,
  WalkInput,
  WalkWorld,
  WalkWorldOptions,
} from './twin-walk';

const material = new MeshBasicMaterial();
const geometries = new Map<string, BufferGeometry>();
/** an axis-aligned solid box by its bounds (one geometry per size, shared like GLB clones) */
const box = (min: [number, number, number], max: [number, number, number]) => {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const key = size.join('x');
  let geometry = geometries.get(key);
  if (!geometry) {
    geometry = new BoxGeometry(size[0], size[1], size[2]);
    geometries.set(key, geometry);
  }
  const mesh = new Mesh(geometry, material);
  mesh.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  return mesh;
};
/** a 40 × 40 m slab whose top is y = 0 */
const floor = () => box([-20, -0.2, -20], [20, 0, 20]);

const worldOf = (objects: Object3D[], opts: WalkWorldOptions = { floorY: null, killY: -10 }) => {
  const root = new Group();
  if (objects.length) root.add(...objects);
  return new WalkWorld([{ key: 'scene/room', root, structure: true }], opts);
};

const FRAME = 1 / 60;
const run = (
  c: WalkController,
  seconds: number,
  input: WalkInput | ((c: WalkController) => WalkInput),
  each?: (c: WalkController) => void
) => {
  for (let t = 0; t < seconds; t += FRAME) {
    c.step(FRAME, typeof input === 'function' ? input(c) : input);
    each?.(c);
  }
};
const FORWARD: WalkInput = { forward: 1, strafe: 0 };
const STAND: WalkInput = { forward: 0, strafe: 0 };

const start = (world: WalkWorld, at = new Vector3(0, 0, 0), yaw = 0) => {
  const c = new WalkController(world);
  c.place(at, yaw);
  return c;
};

describe('WalkController', () => {
  it('walks on a floor at walking and running speed', () => {
    const c = start(worldOf([floor()]));
    expect(c.grounded).toBe(true);
    run(c, 2, FORWARD);
    expect(c.feet.y).toBeCloseTo(0, 5);
    expect(c.feet.z).toBeCloseTo(-2 * WALK.walkSpeed, 1);
    expect(c.feet.x).toBeCloseTo(0, 5);

    // yaw 90° looks toward −X; strafing right then goes toward −Z
    c.place(new Vector3(0, 0, 0), Math.PI / 2);
    run(c, 1, { forward: 1, strafe: 0, run: true });
    expect(c.feet.x).toBeCloseTo(-WALK.runSpeed, 1);
    run(c, 1, { forward: 0, strafe: 1 });
    expect(c.feet.z).toBeCloseTo(-WALK.walkSpeed, 1);
  });

  it('is blocked by a wall', () => {
    const c = start(worldOf([floor(), box([-5, 0, -2.2], [5, 3, -2])]));
    run(c, 4, { forward: 1, strafe: 0, run: true });
    expect(c.feet.z).toBeGreaterThan(-2 + WALK.radius - 0.02);
    expect(c.feet.z).toBeLessThan(-2 + WALK.radius + 0.02);
    expect(c.feet.y).toBeCloseTo(0, 5);
    // sliding along it still works
    run(c, 1, { forward: 1, strafe: 1 });
    expect(c.feet.x).toBeGreaterThan(0.8);
  });

  it('climbs 0.185 m stairs and comes back down', () => {
    const riser = 0.185;
    const going = 0.28;
    const steps = Array.from({ length: 8 }, (_, i) =>
      box([-0.6, 0, -1 - (i + 1) * going], [0.6, (i + 1) * riser, -1 - i * going])
    );
    const top = 8 * riser;
    const landing = box([-0.6, 0, -1 - 8 * going - 2], [0.6, top, -1 - 8 * going]);
    const c = start(worldOf([floor(), ...steps, landing]));
    let maxDrop = 0;
    let lastY = 0;
    run(c, 3, FORWARD, (w) => {
      maxDrop = Math.max(maxDrop, lastY - w.feet.y);
      lastY = w.feet.y;
    });
    expect(c.feet.y).toBeCloseTo(top, 5);
    expect(c.grounded).toBe(true);
    expect(maxDrop).toBeLessThan(0.01);
    // the view eases over the risers but ends at eye height
    run(c, 1, STAND);
    expect(c.viewY).toBeCloseTo(top + WALK.eye, 2);
    // down again, staying on the treads (no free fall)
    c.yaw = Math.PI;
    let airborne = 0;
    run(c, 3, FORWARD, (w) => {
      if (!w.grounded) airborne++;
    });
    expect(c.feet.y).toBeCloseTo(0, 5);
    expect(airborne).toBe(0);
  });

  it('steps onto a 0.35 m kerb but not onto a 0.6 m box', () => {
    const kerb = start(worldOf([floor(), box([-2, 0, -6], [2, 0.35, -1.5])]));
    run(kerb, 2, FORWARD);
    expect(kerb.feet.y).toBeCloseTo(0.35, 5);

    const c = start(worldOf([floor(), box([-2, 0, -3], [2, 0.6, -1.5])]));
    run(c, 3, { forward: 1, strafe: 0, run: true });
    expect(c.feet.y).toBeCloseTo(0, 5);
    expect(c.feet.z).toBeGreaterThan(-1.5 + 0.25);
  });

  it('steps up to 0.4 m and is blocked above it, walking or running, at any frame rate', () => {
    // a 4 m wide block whose near face is at z = −1.5, longer than 3 s of running
    const near = -1.5;
    const far = -14;
    [0.4, 0.405, 0.41, 0.42, 0.45, 0.48, 0.5, 0.6].forEach((height) => {
      [30, 60, 144].forEach((fps) => {
        [false, true].forEach((running) => {
          const c = start(worldOf([floor(), box([-2, 0, far], [2, height, near])]));
          let inside = 0;
          for (let t = 0; t < 3; t += 1 / fps) {
            c.step(1 / fps, { forward: 1, strafe: 0, run: running });
            // feet below the top within the block's footprint: walking through it
            if (c.feet.z < near && c.feet.z > far && c.feet.y < height - 0.01) inside++;
          }
          const label = `${height} m at ${fps} fps${running ? ', running' : ''}`;
          expect(inside, label).toBe(0);
          if (height <= WALK.step + 0.001) {
            expect(c.feet.y, label).toBeCloseTo(height, 2);
            expect(c.feet.z, label).toBeLessThan(near - 1);
          } else {
            expect(c.feet.y, label).toBeCloseTo(0, 5);
            expect(c.feet.z, label).toBeGreaterThan(near);
          }
        });
      });
    });
  });

  it('jumps onto a 0.75 m box but never over a 1.1 m parapet', () => {
    // pressing Space whenever grounded while running at it
    const hop = (c: WalkController): WalkInput => ({
      forward: 1,
      strafe: 0,
      run: true,
      jump: c.grounded,
    });
    [60, 144].forEach((fps) => {
      const ledge = start(worldOf([floor(), box([-3, 0, -12], [3, 0.75, -1.5])]));
      let stood = 0;
      for (let t = 0; t < 3; t += 1 / fps) {
        ledge.step(1 / fps, hop(ledge));
        if (ledge.grounded) stood = Math.max(stood, ledge.feet.y);
      }
      expect(stood, `ledge at ${fps} fps`).toBeCloseTo(0.75, 2);

      [0.2, 1].forEach((thickness) => {
        const parapet = box([-3, 0, -2 - thickness], [3, 1.1, -2]);
        const c = start(worldOf([floor(), parapet]));
        let highest = 0;
        for (let t = 0; t < 6; t += 1 / fps) {
          c.step(1 / fps, hop(c));
          highest = Math.max(highest, c.feet.y);
        }
        const label = `${thickness} m parapet at ${fps} fps`;
        expect(highest, label).toBeLessThan(0.5);
        expect(c.feet.z, label).toBeGreaterThan(-2);
      });
    });
  });

  it('jumps about 0.45 m and lands', () => {
    const c = start(worldOf([floor()]));
    let apex = 0;
    run(c, FRAME, { ...STAND, jump: true });
    run(c, 1.5, STAND, (w) => {
      apex = Math.max(apex, w.feet.y);
    });
    expect(apex).toBeGreaterThan(0.4);
    expect(apex).toBeLessThan(0.5);
    expect(c.grounded).toBe(true);
    expect(c.feet.y).toBeCloseTo(0, 5);
    // a ceiling stops the jump
    const low = start(worldOf([floor(), box([-2, 2.0, -2], [2, 2.2, 2])]));
    let lowApex = 0;
    run(low, FRAME, { ...STAND, jump: true });
    run(low, 1.5, STAND, (w) => {
      lowApex = Math.max(lowApex, w.feet.y);
    });
    expect(lowApex).toBeLessThan(2.0 - WALK.height + 0.05);
  });

  it('falls off a platform and respawns', () => {
    const c = start(worldOf([box([-1, -0.2, -1], [1, 0, 1])]));
    let lowest = 0;
    // walk off the edge, stop once respawned
    run(
      c,
      4,
      (w) => (w.respawns ? STAND : FORWARD),
      (w) => {
        lowest = Math.min(lowest, w.feet.y);
      }
    );
    expect(lowest).toBeLessThan(-9);
    expect(c.respawns).toBe(1);
    // back at the spawn point, standing
    run(c, FRAME, STAND);
    expect(c.feet.distanceTo(new Vector3(0, 0, 0))).toBeLessThan(0.05);
    expect(c.grounded).toBe(true);
  });

  it('lands on the infinite floor plane', () => {
    const c = start(worldOf([], { floorY: -0.5 }), new Vector3(3, 2, 3));
    expect(c.grounded).toBe(false);
    run(c, 2, FORWARD);
    expect(c.grounded).toBe(true);
    expect(c.feet.y).toBeCloseTo(-0.5, 5);
    expect(c.feet.z).toBeLessThan(0);
  });

  it('walks through spinning parts and door leaves', () => {
    const fan = box([-2, 0, -2.2], [2, 3, -2]);
    fan.userData = { dt_spin: 'z', dt_spin_rps: 1 };
    const leaf = box([-2, 0, -4.2], [2, 3, -4]);
    leaf.userData = { dt_type: 'door_leaf', dt_open_deg: 95 };
    const world = worldOf([floor(), fan, leaf]);
    expect(world.doors).toHaveLength(1);
    const c = start(world);
    run(c, 4, FORWARD);
    expect(c.feet.z).toBeLessThan(-5);
  });

  it('moves out of equipment that only the new world has when the scope changes', () => {
    const empty = worldOf([floor()], { floorY: -0.2 });
    const c = start(empty, new Vector3(0.2, 0, -0.5), 0.7);
    // the same floor with a chiller where the player stands
    const crowded = new WalkWorld(
      [
        { key: 'scene/room', root: new Group().add(floor()), structure: true },
        { key: 'scene/ch-01', root: box([-2, 0, -1], [2, 2.5, 1]) },
      ],
      { floorY: -0.2 }
    );
    expect(crowded.fits(c.feet)).toBe(false);
    expect(c.moveToWorld(crowded)).toBe(true);
    expect(c.world).toBe(crowded);
    expect(crowded.fits(c.feet)).toBe(true);
    expect(c.feet.y).toBeCloseTo(0, 5);
    expect(c.yaw).toBeCloseTo(0.7, 5);
    // the nearest free spot: just off the chiller's long side
    expect(c.feet.distanceTo(new Vector3(0.2, 0, -0.5))).toBeLessThan(1.6);
    // where the body fits, the pose is kept
    const kept = start(empty, new Vector3(5, 0, 5), 1.2);
    expect(kept.moveToWorld(crowded)).toBe(true);
    expect(kept.feet.distanceTo(new Vector3(5, 0, 5))).toBeLessThan(1e-6);
    expect(kept.yaw).toBeCloseTo(1.2, 5);
  });
});

describe('WalkWorld', () => {
  it('looks through translucent walls by default and refreshes when the walls turn solid', () => {
    const glassy = new MeshBasicMaterial({ transparent: true, opacity: 0.18 });
    const wall = new Mesh(new BoxGeometry(4, 3, 0.2), glassy);
    wall.position.set(0, 1.5, -3);
    const solid = box([-1, 0, 2], [1, 1, 3]);
    const world = worldOf([wall, solid]);
    const flag = (mesh: Mesh) => world.colliders.find((c) => c.mesh === mesh)?.transparent;
    expect(flag(wall)).toBe(true);
    expect(flag(solid)).toBe(false);

    world.refreshTransparency(() => false);
    expect(flag(wall)).toBe(false);
    // a world built with the predicate starts that way
    const solidWorld = worldOf([wall.clone()], { floorY: null, isTransparent: () => false });
    expect(solidWorld.colliders.every((c) => !c.transparent)).toBe(true);
  });

  it('allows floor spots below an open overhead panel with a single ray hit', () => {
    const panel = new Mesh(new PlaneGeometry(8, 8), material);
    panel.rotation.x = -Math.PI / 2;
    panel.position.set(0, 4, 0);
    const world = worldOf([floor(), panel]);
    // This sheet has one face above the capsule centre, but cannot enclose space below it.
    expect(world.raycastAll(new Vector3(0.3, 1, 0.4), new Vector3(0, 1, 0), 4)).toHaveLength(1);
    expect(world.insideSolid(new Vector3(0.3, 1, 0.4))).toBe(false);
    expect(world.fits(new Vector3(0.3, 0, 0.4))).toBe(true);
    expect(world.floorAt(0.3, 0.4, 2)?.y).toBeCloseTo(0, 5);
  });

  it('still detects points enclosed by a transformed closed collider', () => {
    const housing = box([-2, 0, -2], [2, 3, 2]);
    const holder = new Group();
    holder.position.set(65, 12.6, 0);
    holder.rotation.y = Math.PI / 6;
    holder.add(housing);
    const world = worldOf([holder]);
    expect(world.insideSolid(new Vector3(65, 14, 0))).toBe(true);
    // Within the horizontal footprint but below the housing is not enclosed.
    expect(world.insideSolid(new Vector3(65, 10, 0))).toBe(false);
    expect(world.insideSolid(new Vector3(70, 14, 0))).toBe(false);
    expect(world.fits(new Vector3(65, 12.6, 0))).toBe(false);
  });

  it('opens a door near the player and closes it away', () => {
    // hinge at x = −0.5, leaf 1 m wide toward +x
    const holder = new Group();
    holder.position.set(-0.5, 0, -3);
    const leaf = new Mesh(new BoxGeometry(1, 2.1, 0.05), material);
    leaf.geometry.translate(0.5, 1.05, 0);
    leaf.userData = { dt_type: 'door_leaf', dt_open_deg: 95, dt_name: 'Door' };
    holder.add(leaf);
    const world = worldOf([floor(), holder]);
    const door = world.doors[0];
    const angle = () => (2 * Math.acos(Math.min(1, Math.abs(leaf.quaternion.w))) * 180) / Math.PI;

    let settled = 0;
    const tick = (seconds: number, player: Vector3 | null) => {
      for (let t = 0; t < seconds; t += FRAME)
        if (world.updateDoors(FRAME, player).settled) settled++;
    };
    tick(1, new Vector3(0, 0, 0)); // 3 m away
    expect(angle()).toBeCloseTo(0, 5);
    tick(0.3, new Vector3(0, 0, -1.2)); // 1.8 m from the leaf: opening
    expect(door.progress).toBeGreaterThan(0.3);
    expect(door.progress).toBeLessThan(0.7);
    tick(0.5, new Vector3(0, 0, -1.2));
    expect(angle()).toBeCloseTo(95, 3);
    expect(leaf.quaternion.y).toBeGreaterThan(0); // about +Y
    expect(settled).toBe(1);
    tick(1, new Vector3(0, 0, 6));
    expect(angle()).toBeCloseTo(0, 3);
    expect(settled).toBe(2);
    // nobody walking: every door closes
    tick(1, new Vector3(0, 0, -2.5));
    tick(1, null);
    expect(door.progress).toBe(0);
  });

  it('keeps a gate shut and solid when it would open onto a fall', () => {
    // a roof deck (top y = 0) ending at z = −3, its gate across the gap, the ground 1.4 m below
    const deck = () => box([-6, -0.3, -3], [6, 0, 6]);
    const gate = () => {
      const leaf = box([-0.5, 0.05, -3.05], [0.5, 1.1, -2.98]);
      leaf.userData = { dt_type: 'door_leaf', dt_open_deg: 95 };
      return leaf;
    };
    const roofOnly = worldOf([deck(), gate()], { floorY: -1.4 });
    expect(roofOnly.doors).toHaveLength(0);
    const c = start(roofOnly);
    run(c, 4, FORWARD);
    expect(c.grounded).toBe(true);
    expect(c.feet.y).toBeCloseTo(0, 5);
    expect(c.feet.z).toBeGreaterThan(-3);

    // with the stair's top landing beyond it, the gate swings as usual
    const landing = box([-1, -0.3, -9], [1, 0, -3.05]);
    const withStair = worldOf([deck(), gate(), landing], { floorY: -1.4 });
    expect(withStair.doors).toHaveLength(1);
    const d = start(withStair);
    run(d, 4, FORWARD);
    expect(d.feet.z).toBeLessThan(-4);
    expect(d.feet.y).toBeCloseTo(0, 5);
    // a door at floor level (ground plane just under the room floor) opens too
    const groundDoor = worldOf([box([-6, -0.25, -3], [6, 0, 6]), gate()], { floorY: -0.25 });
    expect(groundDoor.doors).toHaveLength(1);
  });

  it('finds free floor spots and spawns in front of equipment', () => {
    const chiller = box([-2, 0, -1], [2, 2.5, 1]);
    const world = new WalkWorld(
      [
        {
          key: 'scene/room',
          root: (() => {
            const g = new Group();
            g.add(floor(), box([-6, 0, -6.2], [6, 4, -6]));
            return g;
          })(),
          structure: true,
        },
        { key: 'scene/ch-01', root: chiller },
      ],
      { floorY: -0.2 }
    );
    expect(world.fits(new Vector3(0, 0, 0))).toBe(false);
    expect(world.fits(new Vector3(0, 0, 3))).toBe(true);
    // inside the chiller footprint -> the nearest spot outside it
    const spot = world.freeSpotNear(new Vector3(0, 2.5, 0), 3.5) as Vector3;
    expect(spot).not.toBeNull();
    expect(spot.y).toBeCloseTo(0, 5);
    expect(world.fits(spot)).toBe(true);
    expect(
      Math.abs(spot.z) > 1 + WALK.radius - 0.05 || Math.abs(spot.x) > 2 + WALK.radius - 0.05
    ).toBe(true);

    // viewer south of it (+z): stand 1.5 m south, facing north (−Z = yaw 0)
    const south = world.spawnNear(new Box3().setFromObject(chiller), new Vector3(0, 1.6, 8));
    expect(south?.position.z).toBeCloseTo(2.5, 5);
    expect(south?.position.x).toBeCloseTo(0, 5);
    expect(south?.yaw).toBeCloseTo(0, 5);
    // viewer north: the north side is behind the wall at z −6 ... −1 − 1.5 = −2.5 is still in front
    const north = world.spawnNear(new Box3().setFromObject(chiller), new Vector3(0, 1.6, -5));
    expect(north?.position.z).toBeCloseTo(-2.5, 5);
    expect(Math.abs(north?.yaw ?? 0)).toBeCloseTo(Math.PI, 5);
  });

  it('prefers a spot with a clear view of the equipment, never one behind a wall', () => {
    const room = new Group();
    // floor, and a wall west of the chiller
    room.add(floor(), box([-6.2, 0, -10], [-6, 4, 10]));
    const chiller = box([-2, 0, -1], [2, 2.5, 1]);
    // a pipe rack hiding the chiller from its south side
    const rack = box([-3.5, 0.6, 1.7], [3.5, 2.6, 1.9]);
    const world = new WalkWorld(
      [
        { key: 'scene/room', root: room, structure: true },
        { key: 'scene/ch-01', root: chiller },
        { key: 'scene/rack', root: rack },
      ],
      { floorY: -0.2 }
    );
    const target = new Box3().setFromObject(chiller);
    // viewer south: the south spots only see the rack; the east side sees the chiller
    const spot = world.spawnNear(target, new Vector3(0, 1.6, 8), 'scene/ch-01');
    expect(spot?.position.x).toBeCloseTo(3.5, 5);
    // looking toward −X
    expect(spot?.yaw).toBeCloseTo(Math.PI / 2, 5);
    // viewer west of the wall: never spawns behind it
    const west = world.spawnNear(target, new Vector3(-12, 1.6, 0), 'scene/ch-01');
    expect(west?.position.x).toBeGreaterThan(-6 + WALK.radius);
  });

  it('names the structure the player stands in, rooms first', () => {
    const entries = [
      { key: 'cub-roof/roof', box: new Box3(new Vector3(-12, 6, -13), new Vector3(20, 7.4, 4)) },
      {
        key: 'central-plant/room',
        box: new Box3(new Vector3(-12, -0.25, -13), new Vector3(8, 6, 4)),
      },
      {
        key: 'cub-building/hall',
        box: new Box3(new Vector3(-30, -1, -30), new Vector3(30, 9, 30)),
      },
    ];
    expect(structureAtPoint(entries, new Vector3(0, 0, 0))).toBe('central-plant/room');
    expect(structureAtPoint(entries, new Vector3(0, 6.3, 0))).toBe('cub-roof/roof');
    expect(structureAtPoint(entries, new Vector3(25, 0, 0))).toBe('cub-building/hall');
    expect(structureAtPoint(entries, new Vector3(50, 0, 0))).toBeNull();
    // a cleanroom floor over a sub-fab whose pipes reach just above that floor
    const fab = [
      {
        key: 'fab1-subfab-etch/services',
        box: new Box3(new Vector3(48, 3, -9), new Vector3(62, 4.45, -1)),
      },
      {
        key: 'fab1-building/cleanroom',
        box: new Box3(new Vector3(47, 4.2, -12), new Vector3(83, 8.1, 12)),
      },
    ];
    expect(structureAtPoint(fab, new Vector3(55, 4.23, -2))).toBe('fab1-building/cleanroom');
  });

  it('ignores keys typed into fields and the assistant panel', () => {
    document.body.innerHTML = `
      <input id="i" /><textarea id="t"></textarea><div contenteditable="true"><b id="ce">x</b></div>
      <div data-ai-assistant-panel><button id="ai">send</button></div>
      <button id="b">walk</button>`;
    const el = (id: string) => document.getElementById(id);
    expect(isWalkKeyIgnored(el('i'))).toBe(true);
    expect(isWalkKeyIgnored(el('t'))).toBe(true);
    expect(isWalkKeyIgnored(el('ce'))).toBe(true);
    expect(isWalkKeyIgnored(el('ai'))).toBe(true);
    expect(isWalkKeyIgnored(el('b'))).toBe(false);
    expect(isWalkKeyIgnored(document.body)).toBe(false);
    expect(isWalkKeyIgnored(null)).toBe(false);
  });

  it('leaves Tab, Space and the arrows to a focused HUD or dashboard control', () => {
    document.body.innerHTML = `
      <div id="view" tabindex="0"><canvas id="canvas"></canvas></div>
      <div role="dialog"><button id="item"><span id="label">CUB Roof</span></button>
        <ul role="listbox"><li role="option" id="option" tabindex="-1">8 h</li></ul></div>`;
    const el = (id: string) => document.getElementById(id);
    // Tab moves the focus on from any control, however it got there
    expect(isKeyForControl(el('item'), 'Tab', false)).toBe(true);
    expect(isKeyForControl(el('label'), 'Tab', false)).toBe(true);
    // Space presses and the arrows navigate a control the keyboard focused …
    expect(isKeyForControl(el('item'), 'Space', true)).toBe(true);
    expect(isKeyForControl(el('option'), 'ArrowDown', true)).toBe(true);
    // … while after a mouse click Space still jumps and the arrows walk
    expect(isKeyForControl(el('item'), 'Space', false)).toBe(false);
    expect(isKeyForControl(el('option'), 'ArrowDown', false)).toBe(false);
    // letters stay walk keys; the view, the canvas and the page take every walk key
    expect(isKeyForControl(el('item'), 'KeyW', true)).toBe(false);
    ['view', 'canvas'].forEach((id) => {
      expect(isKeyForControl(el(id), 'Tab', true)).toBe(false);
      expect(isKeyForControl(el(id), 'Space', true)).toBe(false);
    });
    expect(isKeyForControl(document.body, 'Tab')).toBe(false);
    expect(isKeyForControl(null, 'Tab')).toBe(false);
  });

  it('leaves the Esc that closes an open drop-down to it', () => {
    document.body.innerHTML = `
      <div role="combobox" aria-expanded="true" id="open"><span id="inner">1 h</span></div>
      <div role="combobox" aria-expanded="false" id="closed"></div>
      <div role="listbox"><div role="option" id="option">8 h</div></div>
      <button aria-expanded="true" id="menu-button">Teleport</button>`;
    const el = (id: string) => document.getElementById(id);
    expect(isEscapeForWidget(el('open'))).toBe(true);
    expect(isEscapeForWidget(el('inner'))).toBe(true);
    expect(isEscapeForWidget(el('option'))).toBe(true);
    expect(isEscapeForWidget(el('closed'))).toBe(false);
    // a HUD button whose panel is open: Esc closes the panel through walk mode
    expect(isEscapeForWidget(el('menu-button'))).toBe(false);
    expect(isEscapeForWidget(document.body)).toBe(false);
    expect(isEscapeForWidget(null)).toBe(false);
  });

  it('keeps a frame cheap on a large mesh', () => {
    // ~1 M triangle terrain-like floor plus 1,500 separate equipment-sized boxes
    const ground = new PlaneGeometry(200, 200, 700, 700);
    ground.rotateX(-Math.PI / 2);
    const big = new Mesh(ground, material);
    const parts: Object3D[] = [big];
    for (let i = 0; i < 1500; i++) {
      const x = ((i * 37) % 100) - 50 + 0.5;
      const z = Math.floor(i / 25) * 1.6 - 48;
      if (Math.hypot(x, z) < 6) continue;
      parts.push(box([x, 0, z], [x + 0.6, 0.3 + (i % 7) * 0.3, z + 0.6]));
    }
    const t0 = performance.now();
    const world = worldOf(parts, { floorY: -0.01 });
    const buildMs = performance.now() - t0;

    const c = start(world);
    const frames = 600;
    const t1 = performance.now();
    for (let i = 0; i < frames; i++) {
      c.yaw += 0.01;
      c.step(FRAME, { forward: 1, strafe: 0, run: true });
    }
    const frameMs = (performance.now() - t1) / frames;
    console.info(
      `walk collision: ${world.colliders.length} colliders, ${(ground.index?.count ?? 0) / 3} + ` +
        `${(parts.length - 1) * 12} triangles; BVH build ${buildMs.toFixed(0)} ms, ` +
        `${frameMs.toFixed(3)} ms per 60 Hz frame (${Math.ceil(FRAME / WALK.substep)} substeps)`
    );
    expect(c.grounded).toBe(true);
    expect(frameMs).toBeLessThan(4);
  });
});

describe('drag-look (pointer lock refused)', () => {
  it('turns the view only once a press moves past the threshold, without losing the motion', () => {
    const press = pressStart(100, 100, 0);
    // a jitter within the threshold is still a click
    expect(pressMove(press, 103, 102)).toEqual({ dx: 0, dy: 0 });
    expect(press.dragging).toBe(false);
    // past it: the first delta covers the whole move from the press
    expect(pressMove(press, 100 + DRAG_LOOK.threshold + 5, 96)).toEqual({
      dx: DRAG_LOOK.threshold + 5,
      dy: -4,
    });
    expect(press.dragging).toBe(true);
    // then frame-to-frame deltas, also back within the threshold (a drag stays a drag)
    expect(pressMove(press, 102, 98)).toEqual({ dx: -(DRAG_LOOK.threshold + 3), dy: 2 });
    expect(pressIsClick(press, 102, 98, 100)).toBe(false);
  });

  it('turns like mouse look: dragging right turns right, dragging up looks up', () => {
    const c = new WalkController(worldOf([floor()]));
    c.place(new Vector3(0, 0, 0), 0);
    const press = pressStart(400, 300, 0);
    const { dx, dy } = pressMove(press, 500, 260);
    c.look(dx, dy);
    // yaw 0 looks toward −Z; turning right (clockwise seen from above) lowers the yaw
    expect(c.yaw).toBeLessThan(0);
    expect(c.pitch).toBeGreaterThan(0);
  });

  it('tells a click from a long or moved press', () => {
    const press = pressStart(10, 10, 1000);
    expect(pressIsClick(press, 12, 11, 1200)).toBe(true);
    expect(pressIsClick(press, 12, 11, 1000 + DRAG_LOOK.clickMs + 1)).toBe(false);
    expect(pressIsClick(press, 10 + DRAG_LOOK.threshold + 1, 10, 1100)).toBe(false);
  });

  it('counts a pointer-lock failure as a refusal only with a gesture and not right after Esc', () => {
    expect(isLockRefusal({ activation: true, sinceUnlockMs: LOCK_RELOCK_MS + 1 })).toBe(true);
    // a request without a user gesture fails in every browser
    expect(isLockRefusal({ activation: false, sinceUnlockMs: 60_000 })).toBe(false);
    // browsers refuse a quick re-lock after the user freed the pointer
    expect(isLockRefusal({ activation: true, sinceUnlockMs: 300 })).toBe(false);
  });
});

describe('walk-mode markers (badges, tag labels)', () => {
  // a wall across z = −5 between the eye and the targets beyond it
  const wall = () => box([-4, 0, -5.1], [4, 3, -4.9]);
  const pump = () => box([3, 0, -2.5], [4, 1.2, -1.5]);
  const eye = new Vector3(0, 1.6, 0);

  it('hides a marker behind a wall and shows one in plain sight', () => {
    const world = worldOf([floor(), wall()]);
    expect(markerVisible(world, eye, new Vector3(0, 1.5, -8))).toBe(false);
    expect(markerVisible(world, eye, new Vector3(0, 1.5, -4))).toBe(true);
    // over the wall top
    expect(markerVisible(world, eye, new Vector3(0, 8, -8))).toBe(true);
    // the floor under the line of sight never hides it
    expect(markerVisible(world, eye, new Vector3(2, 0.05, -3))).toBe(true);
  });

  it('hides a marker beyond the range even in plain sight', () => {
    const world = worldOf([floor()]);
    expect(markerVisible(world, eye, new Vector3(0, 1.6, -(WALK_MARKERS.range - 0.5)))).toBe(true);
    expect(markerVisible(world, eye, new Vector3(0, 1.6, -(WALK_MARKERS.range + 0.5)))).toBe(false);
    expect(markerVisible(null, eye, new Vector3(0, 1.6, -(WALK_MARKERS.range + 0.5)))).toBe(false);
  });

  it('ignores its own geometry and a hit right at the anchor', () => {
    const world = new WalkWorld(
      [
        { key: 'scene/room', root: new Group().add(floor()), structure: true },
        { key: 'scene/pump', root: new Group().add(pump()) },
      ],
      { floorY: null }
    );
    // an anchor sunk into the pump: its own body is in the way
    const anchor = new Vector3(3.5, 1.0, -2);
    expect(markerVisible(world, eye, anchor)).toBe(false);
    expect(markerVisible(world, eye, anchor, (c) => c.key === 'scene/pump')).toBe(true);
    // a plate 0.05..0.1 m before the anchor is within the margin
    const plated = worldOf([box([-1, 0, -7.95], [1, 3, -7.9])]);
    const behind = new Vector3(0, 1.6, -8);
    expect(markerVisible(plated, eye, behind)).toBe(true);
    expect(plated.segmentBlocked(eye, behind, 0)).toBe(true);
    expect(plated.segmentBlocked(eye, behind, WALK_MARKERS.margin)).toBe(false);
  });
});
