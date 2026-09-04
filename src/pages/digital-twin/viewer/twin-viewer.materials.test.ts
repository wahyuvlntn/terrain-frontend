import { MeshStandardMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { isSeeThroughMaterial } from './twin-viewer';

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
