import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./i18n', () => ({ t: (key: string) => key }));
vi.mock('./react-query', () => ({ showToastError: vi.fn() }));

import { dbRequest, getURL, getURLExplicit, jsRequest, request, SESSION_ID_HEADER } from './request';

describe('standalone API client', () => {
  let sent: InternalAxiosRequestConfig;
  const adapter: AxiosAdapter = async (config) => {
    sent = config;
    return { data: { data: 'ok' }, status: 200, statusText: 'OK', headers: {}, config };
  };

  beforeEach(() => {
    window.localStorage.clear();
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_ORG', 'local');
    vi.stubEnv('VITE_PRJ', 'digital_twin_afdd');
    vi.stubEnv('VITE_DB_BUSINESS', 'am');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('sends the saved session with the standalone header', async () => {
    window.localStorage.setItem(SESSION_ID_HEADER, 'test-session');
    await request({ url: '/api/session', adapter });
    expect(sent.headers.get('X-AFDD-Session-Id')).toBe('test-session');
    expect(sent.url).toBe('/api/session');
  });

  it('routes scripts and database requests to the same application namespace', async () => {
    await expect(jsRequest({ url: '/asset/get', adapter })).resolves.toBe('ok');
    expect(sent.url).toBe('/api/js-service/exposed/execute/local/digital_twin_afdd/asset/get');
    await dbRequest({ dbType: 'business', url: '/filter/asset', adapter });
    expect(sent.url).toBe('/api/database-connection/exposed/execute/local/digital_twin_afdd/am/filter/asset');
  });

  it('uses the current origin by default and accepts an explicit backend URL', async () => {
    expect(getURL()).toBe('');
    expect(getURLExplicit()).toBe(window.location.origin);
    vi.stubEnv('VITE_API_URL', 'https://example.test/');
    expect(getURLExplicit()).toBe('https://example.test');
    await request({ url: '/api/session', adapter });
    expect(sent.url).toBe('https://example.test/api/session');
  });
});
