import { describe, expect, it, vi } from 'vitest';

// the shared request layer imports the UI kit for its toasts (CSS that vitest cannot load)
vi.mock('@digital-twin/reusables', () => ({
  toast: { error: () => undefined, success: () => undefined },
}));

const { notificationTwinUrl } = await import('./notification.api');

describe('notificationTwinUrl', () => {
  it('opens the equipment, else its location, else nothing', () => {
    expect(notificationTwinUrl({ assetAlias: 'CH_02', locationId: 10 })).toBe(
      '/digital-twin?asset=CH_02'
    );
    expect(notificationTwinUrl({ assetAlias: null, locationId: 10 })).toBe(
      '/digital-twin?node=loc-10'
    );
    expect(notificationTwinUrl({ assetAlias: undefined, locationId: null })).toBeNull();
  });
});
