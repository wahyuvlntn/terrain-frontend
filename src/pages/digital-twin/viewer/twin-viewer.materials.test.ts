import { Box3, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { isSeeThroughMaterial, nearbyShown } from './twin-viewer';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock('@digital-twin/components', () => import('../testing/digital-twin-components.mock'));

const material = (name: string, opacity: number, transparent = opacity < 1) =>
  Object.assign(new MeshStandardMaterial({ opacity, transparent }), { name });

describe('isSeeThroughMaterial', () => {
  it('turns translucent walls, slabs, trims, doors and louvres solid', () => {
    ['Bldg_Wall', 'Bldg_RoofSlab', 'Bldg_Trim', 'Bldg_Door', 'Bldg_Louvre', 'FAB_Deck'].forEach(
      (name) => expect(isSeeThroughMaterial(material(name, 0.18))).toBe(true)
    );
  });

  it('keeps glass transparent and leaves opaque materials alone', () => {
    expect(isSeeThroughMaterial(material('Glass', 0.3))).toBe(false);
    expect(isSeeThroughMaterial(material('FAB_Glass', 0.13))).toBe(false);
    expect(isSeeThroughMaterial(material('FAB_VisionPanel', 0.2))).toBe(false);
    expect(isSeeThroughMaterial(material('Bldg_Floor', 1))).toBe(false);
    // blended but fully opaque: nothing to make solid
    expect(isSeeThroughMaterial(material('Bldg_Wall', 1, true))).toBe(false);
  });
});

describe('nearbyShown', () => {
  // a 10 m model whose near face is 50 m east of the camera at the origin
  const box = new Box3(new Vector3(50, 0, -5), new Vector3(60, 10, 5));
  const at = (x: number) => new Vector3(x, 0, 0);

  it('draws a model once the camera is within its reach of the bounds', () => {
    expect(nearbyShown(box, at(0), 60, false)).toBe(true);
    expect(nearbyShown(box, at(-20), 60, false)).toBe(false);
  });

  it('keeps a drawn model a little further out, so it does not flicker at the edge', () => {
    // 65 m from the bounds: beyond 60 m, within 60 x 1.15
    expect(nearbyShown(box, at(-15), 60, false)).toBe(false);
    expect(nearbyShown(box, at(-15), 60, true)).toBe(true);
    expect(nearbyShown(box, at(-30), 60, true)).toBe(false);
  });
});
