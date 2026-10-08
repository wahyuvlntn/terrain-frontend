import type { Color, Material, MeshPhysicalMaterial, Texture } from 'three';
import { MeshStandardMaterial } from 'three';

/**
 * Material sharing for the twin's models. Every GLB brings its own copies of the same palette
 * (Paint_CW_Pipe in the loop, the tower, the pumps...), and GLTFLoader makes a physical material
 * wherever the exporter wrote an ior / specular extension, even with their default values. Shared,
 * plain materials mean fewer shader programs and material switches per frame, and the same look.
 */

/**
 * A physical material that uses none of its physical features (default ior 1.5 and specular, no
 * clearcoat, sheen, transmission, iridescence, anisotropy or dispersion) as the standard material
 * it shades exactly like; any other material as it is.
 */
export const plainMaterial = (m: Material): Material => {
  const p = m as MeshPhysicalMaterial;
  if (!p.isMeshPhysicalMaterial) return m;
  const unused =
    !(p.clearcoat > 0) &&
    !(p.sheen > 0) &&
    !(p.transmission > 0) &&
    !(p.iridescence > 0) &&
    !(p.anisotropy > 0) &&
    !(p.dispersion > 0) &&
    Math.abs(p.ior - 1.5) < 1e-3 &&
    p.specularIntensity === 1 &&
    p.specularColor.getHex() === 0xffffff &&
    !p.specularIntensityMap &&
    !p.specularColorMap;
  if (!unused) return m;
  // (copies the standard settings, name and user data; the defines become STANDARD only)
  return new MeshStandardMaterial().copy(p);
};

const textureKey = (t: Texture) =>
  [
    t.source.uuid,
    t.offset.x,
    t.offset.y,
    t.repeat.x,
    t.repeat.y,
    t.rotation,
    t.channel,
    t.colorSpace,
    t.flipY,
    t.wrapS,
    t.wrapT,
  ].join(',');

/**
 * A key equal for materials that draw alike: type, name (the viewer reads some names: signal lamps,
 * see-through walls) and every setting. A material with a function of its own (a shader hook)
 * gets a key of its own.
 */
export const materialKey = (m: Material): string => {
  const parts: string[] = [m.type];
  const own = m as unknown as Record<string, unknown>;
  for (const k of Object.keys(own).sort()) {
    if (k === 'uuid' || k === 'id' || k === 'version' || k.startsWith('_')) continue;
    const v = own[k];
    if (typeof v === 'function') return `${m.type}|${m.uuid}`;
    let s: string;
    if (v === null || typeof v !== 'object') s = String(v);
    else if ((v as Color).isColor) s = (v as Color).getHexString();
    else if ((v as Texture).isTexture) s = textureKey(v as Texture);
    else s = JSON.stringify(v);
    parts.push(`${k}=${s}`);
  }
  return parts.join('|');
};
