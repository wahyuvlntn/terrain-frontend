import { describe, expect, it, vi } from 'vitest';

import { getTwinLiveOverview } from './digital-twin.api';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock('@digital-twin/components', () => import('../testing/digital-twin-components.mock'));
const utils = vi.hoisted(() => ({ jsRequest: vi.fn() }));
vi.mock('@digital-twin/utils', () => utils);

const unit = (alias: string) => ({
  id: 1,
  alias,
  name: alias,
  type_name: 'Tool',
  status: 'RUNNING',
  status_start_time: null,
  condition: 'NORMAL',
  condition_start_time: null,
  params: { running: { value: 1, unit: '', condition: 'NORMAL', timestamp: null } },
});

describe('getTwinLiveOverview', () => {
  it('asks for at most 60 aliases per call and keeps the requested order', async () => {
    utils.jsRequest.mockImplementation(async ({ data }: { data: { aliases: string } }) =>
      data.aliases.split(',').map(unit)
    );
    const aliases = Array.from({ length: 71 }, (_, i) => `EQ_${i}`);
    const res = await getTwinLiveOverview(aliases);
    expect(utils.jsRequest.mock.calls.map(([r]) => r.data.aliases.split(',').length)).toEqual([
      60, 11,
    ]);
    expect(res.map((a) => a.alias)).toEqual(aliases);
  });
});
