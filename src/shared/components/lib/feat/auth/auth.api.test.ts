import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@digital-twin/utils', () => ({ request, jsRequest: vi.fn() }));

import { signin } from './auth.api';

describe('standalone login', () => {
  beforeEach(() => request.mockReset());

  it('reads the session_id returned by the backend', async () => {
    request.mockResolvedValue({ session_id: 'test-session' });
    await expect(signin({ username: 'operator', password: 'test' })).resolves.toBe('test-session');
    expect(request).toHaveBeenCalledWith({
      url: '/api/user-management/exposed/get-session-add-expiry',
      data: { username: 'operator', password: 'test' },
    });
  });

  it('rejects a response without a valid session', async () => {
    request.mockResolvedValue({});
    await expect(signin({ username: 'operator', password: 'test' })).rejects.toThrow();
  });
});
