import { describe, expect, it, vi } from 'vitest';

import { jobFilterFromUrl } from './simulation.links';

// the shared barrels load a UI library whose CSS vitest can't import: a typed double of the
// status / condition enums, and the request function only
vi.mock(
  '@digital-twin/components',
  () => import('../digital-twin/testing/digital-twin-components.mock')
);
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

describe('jobFilterFromUrl', () => {
  const read = (search: string) => jobFilterFromUrl(new URLSearchParams(search));

  it('keeps a known status and origin', () => {
    expect(read('status=approval&origin=agent')).toEqual({
      statusKey: 'approval',
      origin: 'agent',
    });
  });

  it('falls back to all statuses and origins', () => {
    expect(read('status=x&origin=x')).toEqual({ statusKey: 'all', origin: '' });
    expect(read('')).toEqual({ statusKey: 'all', origin: '' });
  });
});
