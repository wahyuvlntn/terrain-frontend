import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPostSigninPath, getSigninUrl, redirectToSignin } from './auth-redirect';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('sign-in return routes', () => {
  it('encodes the route once while preserving its query and hash', () => {
    const path = '/digital-twin?label=Chiller%20A&filter=a%26b#equipment';
    const url = getSigninUrl({ pathname: '/digital-twin', search: '?label=Chiller%20A&filter=a%26b', hash: '#equipment' });
    const value = new URLSearchParams(url.split('?')[1]).get('redirect-url');
    expect(value).toBe(path);
    expect(getPostSigninPath(value)).toBe(path);
  });

  it('accepts older double-encoded application links', () => {
    const params = new URLSearchParams('redirect-url=%252Fdigital-twin%253Fplant%253D1');
    expect(getPostSigninPath(params.get('redirect-url'))).toBe('/digital-twin?plant=1');
  });

  it.each([
    '/signin', '/signin?redirect-url=%252Fsignin', '%2Fsignin',
    '/%73ignin', '/equipment/../signin', '//example.com', '/\\example.com',
    'https://example.com', 'javascript:alert(1)', '%ZZ', '/%0asignin',
  ])('falls back to the application root for unsafe or sign-in target %s', (path) => {
    expect(getPostSigninPath(path)).toBe('/');
  });

  it('does not nest the sign-in page inside another sign-in URL', () => {
    expect(getSigninUrl({ pathname: '/signin', search: '?redirect-url=%252Fsignin' })).toBe('/signin');
  });

  it('keeps failed sign-in attempts on the form without scheduling a reload', () => {
    vi.useFakeTimers();
    const replace = vi.fn();
    vi.stubGlobal('location', { pathname: '/signin', search: '?redirect-url=%252Fsignin', replace });
    redirectToSignin();
    expect(vi.getTimerCount()).toBe(0);
    expect(replace).not.toHaveBeenCalled();
  });

  it('returns expired sessions to their application route and preserves remembered credentials', () => {
    vi.useFakeTimers();
    const replace = vi.fn();
    vi.stubGlobal('location', { pathname: '/digital-twin', search: '?plant=1', hash: '#equipment', replace });
    window.localStorage.setItem('digital-twin-credentials', 'remembered');
    window.localStorage.setItem('X-AFDD-Session-Id', 'expired');
    redirectToSignin();
    vi.advanceTimersByTime(1000);
    expect(window.localStorage.getItem('X-AFDD-Session-Id')).toBeNull();
    expect(window.localStorage.getItem('digital-twin-credentials')).toBe('remembered');
    expect(replace).toHaveBeenCalledWith('/signin?redirect-url=%2Fdigital-twin%3Fplant%3D1%23equipment');
  });
});
