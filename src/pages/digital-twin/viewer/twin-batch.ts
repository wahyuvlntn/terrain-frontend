import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Material,
  Matrix3,
  Matrix4,
  Mesh,
  Object3D,
  Vector3,
} from 'three';

/**
 * Objects that keep their own identity in a structure model: door leaves swing, OHT vehicles
 * (dt_vehicle) follow the simulated transport, spinning parts turn. Everything else in a structure
 * is static.
 */
export const isAnimated = (o: Object3D) =>
  o.userData?.dt_type === 'door_leaf' ||
  typeof o.userData?.dt_vehicle === 'string' ||
  ['x', 'y', 'z'].includes(String(o.userData?.dt_spin ?? ''));

const isMesh = (o: Object3D): o is Mesh => (o as Mesh).isMesh === true;

/** whether `o` or one of its ancestors (below `root`) is animated */
const inAnimated = (o: Object3D, root: Object3D) => {
  for (let p: Object3D | null = o; p && p !== root; p = p.parent) if (isAnimated(p)) return true;
  return false;
};

/** the nearest subsystem group (dt_group) of `o`, else the model root */
const groupOf = (o: Object3D, root: Object3D) => {
  for (let p = o.parent; p && p !== root; p = p.parent) if (p.userData?.dt_group) return p;
  return root;
};

export type BatchResult = { meshesIn: number; meshesOut: number };

/**
 * Static batching of a structure model (room shell, building, distribution): its static meshes are
 * merged into one mesh per subsystem group and material, which turns hundreds of draw calls
 * (one per wall reveal, floor joint, stair tread...) into a few. Structures are never picked, so
 * nothing needs the individual parts; animated objects (isAnimated) and multi-material meshes stay
 * as they are. Works in place on `root` (a glTF scene, or a clone of one) and keeps the vertices in
 * `root`'s frame; the merged meshes are added to `root` itself.
 */
export const batchStructure = (root: Object3D): BatchResult => {
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { group: Object3D; material: Material; meshes: Mesh[] }>();
  let meshesIn = 0;
  root.traverse((o) => {
    if (!isMesh(o) || Array.isArray(o.material) || inAnimated(o, root)) return;
    const geometry = o.geometry;
    if (!geometry.getAttribute('position')) return;
    meshesIn++;
    const group = groupOf(o, root);
    const layout = ['normal', 'uv'].filter((a) => geometry.getAttribute(a)).join('+');
    const key = `${group.uuid}|${o.material.uuid}|${layout}`;
    const bucket = buckets.get(key) ?? { group, material: o.material, meshes: [] };
    bucket.meshes.push(o);
    buckets.set(key, bucket);
  });

  let meshesOut = meshesIn;
  buckets.forEach(({ group, material, meshes }) => {
    if (meshes.length < 2) return;
    const merged = mergeInto(meshes, toRoot);
    const mesh = new Mesh(merged, material);
    mesh.name = `${group.name || 'structure'}:${material.name || 'material'}`;
    mesh.userData = { dt_component: 'structure', dt_batched: meshes.length };
    mesh.castShadow = meshes[0].castShadow;
    mesh.receiveShadow = meshes[0].receiveShadow;
    meshes.forEach((m) => m.removeFromParent());
    root.add(mesh);
    meshesOut -= meshes.length - 1;
  });
  return { meshesIn, meshesOut };
};

const _v = new Vector3();

/** One indexed geometry with the meshes' positions (normals, uvs) in the frame `toRoot` maps to */
const mergeInto = (meshes: Mesh[], toRoot: Matrix4) => {
  const first = meshes[0].geometry;
  const hasNormal = !!first.getAttribute('normal');
  const hasUv = !!first.getAttribute('uv');
  let vertexCount = 0;
  let indexCount = 0;
  meshes.forEach(({ geometry }) => {
    const n = geometry.getAttribute('position').count;
    vertexCount += n;
    indexCount += geometry.index ? geometry.index.count : n;
  });
  const position = new Float32Array(vertexCount * 3);
  const normal = hasNormal ? new Float32Array(vertexCount * 3) : null;
  const uv = hasUv ? new Float32Array(vertexCount * 2) : null;
  const index = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  const matrix = new Matrix4();
  const normalMatrix = new Matrix3();
  let vo = 0;
  let io = 0;
  meshes.forEach((mesh) => {
    const g = mesh.geometry;
    matrix.multiplyMatrices(toRoot, mesh.matrixWorld);
    normalMatrix.getNormalMatrix(matrix);
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const tex = g.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      position.set([_v.x, _v.y, _v.z], (vo + i) * 3);
      if (normal && nor) {
        _v.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
        normal.set([_v.x, _v.y, _v.z], (vo + i) * 3);
      }
      if (uv && tex) uv.set([tex.getX(i), tex.getY(i)], (vo + i) * 2);
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) index[io + i] = g.index.getX(i) + vo;
      io += g.index.count;
    } else {
      for (let i = 0; i < pos.count; i++) index[io + i] = vo + i;
      io += pos.count;
    }
    vo += pos.count;
  });
  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(position, 3));
  if (normal) merged.setAttribute('normal', new BufferAttribute(normal, 3));
  if (uv) merged.setAttribute('uv', new BufferAttribute(uv, 2));
  merged.setIndex(new BufferAttribute(index, 1));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
};
