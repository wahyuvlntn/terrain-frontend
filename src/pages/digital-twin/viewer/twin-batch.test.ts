import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { batchEquipment, batchStructure, syncBatch } from './twin-batch';

const wall = new MeshStandardMaterial({ name: 'Bldg_Wall', transparent: true, opacity: 0.18 });
const steel = new MeshStandardMaterial({ name: 'FAB_Steel' });

const boxAt = (x: number, y: number, z: number, material = wall, size = 1) => {
  const mesh = new Mesh(new BoxGeometry(size, size, size), material);
  mesh.position.set(x, y, z);
  return mesh;
};
const groupOf = (name: string, ...children: Object3D[]) => {
  const g = new Group();
  g.name = name;
  g.userData.dt_group = true;
  g.add(...children);
  return g;
};
const meshes = (root: Object3D) => {
  const out: Mesh[] = [];
  root.traverse((o) => {
    if ((o as Mesh).isMesh) out.push(o as Mesh);
  });
  return out;
};
const bounds = (root: Object3D) => new Box3().setFromObject(root);

describe('batchStructure', () => {
  it('merges static meshes per group and material and keeps their world geometry', () => {
    const shell = groupOf(
      'Shell',
      boxAt(0, 0, 0),
      boxAt(4, 0, 0),
      boxAt(0, 3, 0, steel),
      boxAt(0, 6, 0, steel)
    );
    shell.position.set(10, 0, -2);
    shell.rotation.y = Math.PI / 2;
    const finishes = groupOf('Finishes', boxAt(-3, 0, 1), boxAt(-6, 0, 1));
    const root = new Group();
    root.add(groupOf('Root', shell, finishes));
    const before = bounds(root);

    const result = batchStructure(root);

    expect(result).toEqual({ meshesIn: 6, meshesOut: 3 });
    const after = meshes(root);
    expect(after).toHaveLength(3);
    expect(after.map((m) => m.userData.dt_batched).sort()).toEqual([2, 2, 2]);
    expect(after.map((m) => (m.material as MeshStandardMaterial).name).sort()).toEqual([
      'Bldg_Wall',
      'Bldg_Wall',
      'FAB_Steel',
    ]);
    const box = bounds(root);
    expect(box.min.distanceTo(before.min)).toBeLessThan(1e-5);
    expect(box.max.distanceTo(before.max)).toBeLessThan(1e-5);
  });

  it('leaves door leaves, OHT vehicles and spinning parts alone', () => {
    const leaf = boxAt(1, 0, 0);
    leaf.userData.dt_type = 'door_leaf';
    const vehicle = new Group();
    vehicle.userData.dt_vehicle = 'V01';
    vehicle.add(boxAt(0, 0, 0, steel), boxAt(0, 0.5, 0, steel));
    const fan = boxAt(5, 0, 0, steel);
    fan.userData.dt_spin = 'z';
    const root = new Group();
    root.add(groupOf('Shell', leaf, vehicle, fan, boxAt(8, 0, 0, steel), boxAt(9, 0, 0, steel)));

    const result = batchStructure(root);

    expect(result.meshesIn).toBe(2);
    expect(result.meshesOut).toBe(1);
    expect(leaf.parent).not.toBeNull();
    expect(fan.parent).not.toBeNull();
    expect(meshes(vehicle)).toHaveLength(2);
  });
});

describe('batchEquipment', () => {
  const paint = new MeshStandardMaterial({ name: 'EQ_Paint' });
  /** an equipment: three painted parts and a steel one under a subsystem group, at x = 10 */
  const equipment = () => {
    const parts = [boxAt(0, 0, 0, paint), boxAt(2, 0, 0, paint), boxAt(4, 1, 0, paint)];
    const bolt = boxAt(0, 2, 0, steel, 0.2);
    const holder = new Group();
    holder.name = 'TOOL_01';
    holder.position.x = 10;
    holder.add(groupOf('frame', ...parts, bolt));
    const root = new Group();
    root.add(holder);
    return { root, holder, parts, bolt };
  };

  it('merges the parts sharing a material into one mesh standing where the equipment does', () => {
    const { root, holder, parts } = equipment();
    const cache = new Map();
    const { group, batches } = batchEquipment(holder, () => true, cache);
    root.add(group);
    // the lone steel part is not worth a batch
    expect(batches).toHaveLength(1);
    expect(batches[0].meshes).toEqual(parts);
    expect(batches[0].proxy.material).toBe(paint);
    expect(bounds(group).min.toArray()).toEqual(bounds(holder.children[0]).min.toArray());
    // the parts stay where they are, for picking and tinting
    expect(meshes(holder)).toHaveLength(4);
    // a copy of the model (as each scope entry is) shares the merged geometry
    const copy = holder.clone(true);
    new Group().add(copy);
    const shared = batchEquipment(copy, () => true, cache).batches[0].proxy.geometry;
    expect(shared).toBe(batches[0].proxy.geometry);
  });

  it('draws the merged mesh while the parts look alike, else the parts', () => {
    const { holder, parts } = equipment();
    const [batch] = batchEquipment(holder, () => true, new Map()).batches;
    const drawn = () =>
      batch.proxy.visible ? 'merged' : parts.map((p) => p.layers.mask).join(',');
    syncBatch(batch, 1);
    expect(drawn()).toBe('merged');
    expect(parts.every((p) => p.layers.mask === 2)).toBe(true);
    // a hovered part: drawn on its own (and all its batch with it)
    const hover = new MeshStandardMaterial({ name: 'hover' });
    parts[1].material = hover;
    syncBatch(batch, 1);
    expect(drawn()).toBe('1,1,1');
    // the whole equipment tinted alike: merged again, with the tint
    parts.forEach((p) => {
      p.material = hover;
    });
    syncBatch(batch, 1);
    expect(drawn()).toBe('merged');
    expect(batch.proxy.material).toBe(hover);
    // a hidden part, or the equipment hidden
    parts[2].visible = false;
    syncBatch(batch, 1);
    expect(drawn()).toBe('1,1,1');
    parts[2].visible = true;
    holder.visible = false;
    syncBatch(batch, 1);
    expect(batch.proxy.visible).toBe(false);
  });

  it('leaves out what is not eligible, translucent or not mergeable', () => {
    const { holder, parts } = equipment();
    const glass = new MeshStandardMaterial({ transparent: true, opacity: 0.3 });
    holder.add(boxAt(0, 5, 0, glass), boxAt(1, 5, 0, glass));
    const { batches } = batchEquipment(holder, (m) => m !== parts[0], new Map());
    expect(batches).toHaveLength(1);
    expect(batches[0].meshes).toEqual(parts.slice(1));
  });
});
