import { Color, MeshPhysicalMaterial, MeshStandardMaterial, Texture } from 'three';
import { describe, expect, it } from 'vitest';

import { materialKey, plainMaterial } from './twin-materials';

const paint = (name = 'Paint_CW_Pipe', extra: Partial<MeshPhysicalMaterial> = {}) =>
  Object.assign(
    new MeshPhysicalMaterial({ color: '#2f6fb2', roughness: 0.45, metalness: 0.1 }),
    { name },
    extra
  );

describe('plainMaterial', () => {
  it('turns a physical material without physical features into the standard one it equals', () => {
    const m = plainMaterial(paint());
    expect(m).toBeInstanceOf(MeshStandardMaterial);
    expect(
      (m as MeshStandardMaterial & { isMeshPhysicalMaterial?: boolean }).isMeshPhysicalMaterial
    ).toBeUndefined();
    expect(m.name).toBe('Paint_CW_Pipe');
    expect((m as MeshStandardMaterial).color.getHexString()).toBe('2f6fb2');
    expect((m as MeshStandardMaterial).roughness).toBe(0.45);
    expect(m.defines).toEqual({ STANDARD: '' });
  });

  it('keeps a physical material whose clearcoat, ior or specular shows', () => {
    [
      paint('A', { clearcoat: 0.25 }),
      paint('B', { ior: 1.45 }),
      paint('C', { specularIntensity: 0.2 }),
    ].forEach((m) => expect(plainMaterial(m)).toBe(m));
    const steel = new MeshStandardMaterial();
    expect(plainMaterial(steel)).toBe(steel);
  });
});

describe('materialKey', () => {
  it('is equal for equal materials and tells apart names, settings and maps', () => {
    expect(materialKey(paint())).toBe(materialKey(paint()));
    expect(materialKey(paint('Paint_CHW_Pipe'))).not.toBe(materialKey(paint()));
    expect(materialKey(paint(undefined, { color: new Color('#ff0000') }))).not.toBe(
      materialKey(paint())
    );
    const tex = new Texture();
    const a = paint(undefined, { map: tex });
    const b = paint(undefined, { map: tex.clone() });
    // a clone shares the image
    expect(materialKey(a)).toBe(materialKey(b));
    expect(materialKey(paint(undefined, { map: new Texture() }))).not.toBe(materialKey(a));
  });

  it('gives a material with a shader hook a key of its own', () => {
    const hooked = Object.assign(paint(), { onBeforeCompile: () => undefined });
    expect(materialKey(hooked)).not.toBe(
      materialKey(Object.assign(paint(), { onBeforeCompile: () => undefined }))
    );
  });
});
