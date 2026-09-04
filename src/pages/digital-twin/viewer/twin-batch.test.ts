import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { batchStructure } from './twin-batch';

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
