import {
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';

/**
 * Sky, daylight and the site ground of the 3D twin. The sky follows the plant's time of day:
 * night, dawn / dusk (morning and evening) and day, with the sun (or the moon) and the light that
 * goes with it.
 */

/** A rectangle on the ground in three.js metres (x east, z south) */
export type TwinGroundRect = { x: [number, number]; z: [number, number] };

/** The site around the buildings: asphalt roads (with lane markings) and concrete forecourts */
export type TwinSiteGround = { roads: TwinGroundRect[]; aprons: TwinGroundRect[] };

/** What the sky and the lights look like at one time of day (sRGB colours) */
export type SkyLook = {
  zenith: Color;
  horizon: Color;
  /** the sun's disc and glow (the moon at night) */
  disc: Color;
  glow: number;
  /** directional light: intensity and colour */
  sun: number;
  sunColor: Color;
  hemisphere: number;
  environment: number;
};

const look = (
  zenith: string,
  horizon: string,
  disc: string,
  glow: number,
  sun: number,
  sunColor: string,
  hemisphere: number,
  environment: number
): SkyLook => ({
  zenith: new Color(zenith),
  horizon: new Color(horizon),
  disc: new Color(disc),
  glow,
  sun,
  sunColor: new Color(sunColor),
  hemisphere,
  environment,
});

// the twin is a monitoring view: nights stay light enough to read the equipment
const NIGHT = look('#0b1630', '#24324f', '#c9d6f2', 0.12, 0.5, '#9fb3ff', 0.65, 0.6);
const DAWN = look('#35588f', '#efa76a', '#ffd29a', 0.45, 1.4, '#ffbe85', 0.78, 0.66);
const DAY = look('#3a7dd0', '#cfe3f3', '#fffbe8', 0.3, 2.4, '#ffffff', 0.9, 0.75);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mixLook = (a: SkyLook, b: SkyLook, t: number): SkyLook => ({
  zenith: a.zenith.clone().lerp(b.zenith, t),
  horizon: a.horizon.clone().lerp(b.horizon, t),
  disc: a.disc.clone().lerp(b.disc, t),
  glow: a.glow + (b.glow - a.glow) * t,
  sun: a.sun + (b.sun - a.sun) * t,
  sunColor: a.sunColor.clone().lerp(b.sunColor, t),
  hemisphere: a.hemisphere + (b.hemisphere - a.hemisphere) * t,
  environment: a.environment + (b.environment - a.environment) * t,
});

/**
 * The sky at a sun elevation (degrees): night with the sun more than 10° below the horizon, dawn /
 * dusk colours around sunrise and sunset, full day from 20° up; blended in between
 */
export const skyLook = (elevation: number): SkyLook =>
  elevation < 3
    ? mixLook(NIGHT, DAWN, smooth(-10, -2, elevation))
    : mixLook(DAWN, DAY, smooth(6, 20, elevation));

/** Hour of the day (0..24, fractional) at `date` in `timeZone`; the browser's own when unknown */
export const hourIn = (date: Date, timeZone?: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const hour = part('hour') + part('minute') / 60;
    if (Number.isFinite(hour)) return hour;
  } catch {
    // an unknown time zone: the browser's clock
  }
  return date.getHours() + date.getMinutes() / 60;
};

/**
 * The sun of an equatorial site (Singapore, 103.8° E on UTC+8: solar noon about 13:05, sunrise
 * about 07:05, sunset about 19:05 all year): elevation (degrees, negative at night) and compass
 * bearing (east in the morning, south at noon, west in the evening)
 */
export const sunAt = (hour: number, solarNoon = 13.1) => {
  const fromNoon = ((((hour - solarNoon) % 24) + 36) % 24) - 12;
  return {
    elevation: 90 - Math.abs(fromNoon) * 15,
    bearing: 180 + Math.max(-90, Math.min(90, fromNoon * 15)),
  };
};

/** The unit vector toward a compass bearing and elevation (degrees); north is −Z, east +X */
export const skyDirection = (bearing: number, elevation: number, out = new Vector3()) => {
  const b = (bearing * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  return out.set(Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e));
};

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// below the horizon the sky is the horizon colour: the fogged ground fades into it seamlessly
const SKY_FRAGMENT = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 disc;
uniform vec3 discDir;
uniform float glow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 col = mix(horizon, zenith, pow(max(d.y, 0.0), 0.5));
  float s = max(dot(d, discDir), 0.0);
  float above = smoothstep(-0.02, 0.02, d.y);
  col += disc * (smoothstep(0.99955, 0.99975, s) + pow(s, 24.0) * glow) * above;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** The sky dome: kept centred on the camera, drawn first behind everything */
export const createSky = () => {
  const material = new ShaderMaterial({
    uniforms: {
      zenith: { value: new Color() },
      horizon: { value: new Color() },
      disc: { value: new Color() },
      discDir: { value: new Vector3(0, 1, 0) },
      glow: { value: 0 },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const sky = new Mesh(new SphereGeometry(10, 32, 16), material);
  sky.name = 'Sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  return sky;
};

/** Colour the sky for a look, with the sun (or moon) disc in direction `discDir` */
export const paintSky = (sky: Mesh, l: SkyLook, discDir: Vector3) => {
  const u = (sky.material as ShaderMaterial).uniforms;
  u.zenith.value.copy(l.zenith);
  u.horizon.value.copy(l.horizon);
  u.disc.value.copy(l.disc);
  u.glow.value = l.glow;
  u.discDir.value.copy(discDir).normalize();
};

/** metres of road per repeat of the road texture (one dash and gap of the centre line) */
const ROAD_TILE_M = 12;
/** metres of grass per repeat of its texture */
const GRASS_TILE_M = 6;

const canvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (g) draw(g);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
};

/** a speckled base colour (asphalt grain, grass) */
const speckle = (
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  spread: number
) => {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // deterministic noise: the same texture every time
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < (w * h) / 6; i++) {
    const v = Math.round((rand() - 0.5) * spread);
    g.fillStyle = `rgba(${v > 0 ? '255,255,255' : '0,0,0'},${Math.abs(v) / 255})`;
    g.fillRect(Math.floor(rand() * w), Math.floor(rand() * h), 1, 1);
  }
};

/** asphalt along v: white edge lines and a dashed centre line (one dash per tile) */
const roadTexture = () =>
  canvasTexture(64, 256, (g) => {
    speckle(g, 64, 256, '#4a4d52', 60);
    g.fillStyle = '#e9e7df';
    g.fillRect(2, 0, 2, 256);
    g.fillRect(60, 0, 2, 256);
    g.fillRect(31, 0, 2, 128);
  });

const grassTexture = () => canvasTexture(128, 128, (g) => speckle(g, 128, 128, '#7c8c63', 70));

/** Rectangles as one flat geometry (y = 0, facing up); a road's v runs along its long side */
const rectGeometry = (rects: TwinGroundRect[], tile?: number) => {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  rects.forEach(({ x: [x0, x1], z: [z0, z1] }) => {
    const along = Math.abs(z1 - z0) >= Math.abs(x1 - x0) ? 'z' : 'x';
    const len = (along === 'z' ? Math.abs(z1 - z0) : Math.abs(x1 - x0)) / (tile ?? 1);
    const base = pos.length / 3;
    const corners: [number, number][] = [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ];
    corners.forEach(([x, z]) => {
      pos.push(x, 0, z);
      const u = along === 'z' ? (x - x0) / (x1 - x0) : (z - z0) / (z1 - z0);
      const v = along === 'z' ? ((z - z0) / (z1 - z0)) * len : ((x - x0) / (x1 - x0)) * len;
      uv.push(u, v);
    });
    // counter-clockwise seen from above (+Y)
    index.push(base, base + 3, base + 2, base, base + 2, base + 1);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
};

/**
 * The site ground: grass to the horizon (resized per scope with `sizeSiteGround`), the roads and
 * the forecourts. Coplanar layers kept apart by polygon offset (roads over forecourts over grass);
 * they receive shadows. Not pickable or walked on: walk mode stands on the scope's own floor plane
 * at the same height.
 */
export const createSiteGround = (site: TwinSiteGround) => {
  const group = new Group();
  group.name = 'SiteGround';
  const layer = (factor: number) => ({
    roughness: 0.95,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: factor,
    polygonOffsetUnits: factor * 4,
  });
  const grassMap = grassTexture();
  const grass = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({ map: grassMap, ...layer(3) })
  );
  grass.name = 'SiteGrass';
  grass.rotation.x = -Math.PI / 2;
  const roads = new Mesh(
    rectGeometry(site.roads, ROAD_TILE_M),
    new MeshStandardMaterial({ map: roadTexture(), ...layer(1) })
  );
  roads.name = 'SiteRoads';
  const aprons = new Mesh(
    rectGeometry(site.aprons),
    new MeshStandardMaterial({ color: '#b3b0a6', ...layer(2) })
  );
  aprons.name = 'SiteAprons';
  [grass, roads, aprons].forEach((m) => {
    m.receiveShadow = true;
    group.add(m);
  });
  return group;
};

/** Grass `size` metres square around (x, z), its texture tiled every few metres */
export const sizeSiteGround = (group: Group, x: number, z: number, size: number) => {
  const grass = group.getObjectByName('SiteGrass') as Mesh | undefined;
  if (!grass) return;
  grass.position.set(x, 0, z);
  grass.scale.set(size, size, 1);
  const map = (grass.material as MeshStandardMaterial).map;
  map?.repeat.set(size / GRASS_TILE_M, size / GRASS_TILE_M);
  // the tiles stay where they are on the site as the grass moves with the scope
  map?.offset.set(x / GRASS_TILE_M, -z / GRASS_TILE_M);
};

export const disposeSiteGround = (group: Group) =>
  group.traverse((o) => {
    if (!(o as Mesh).isMesh) return;
    const mesh = o as Mesh;
    mesh.geometry.dispose();
    const material = mesh.material as MeshStandardMaterial;
    material.map?.dispose();
    material.dispose();
  });
