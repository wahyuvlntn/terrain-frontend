import { act, cleanup, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { useOutletKey } from './outlet-key';

afterEach(cleanup);

describe('useOutletKey', () => {
  it('changes only with a new assistant nonce', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/maintenance-order']}>{children}</MemoryRouter>
    );
    const { result } = renderHook(() => ({ key: useOutletKey(), navigate: useNavigate() }), {
      wrapper,
    });
    expect(result.current.key).toBeUndefined();

    act(() =>
      result.current.navigate('/maintenance-order?severityIds=1', { state: { assistantNav: 5 } })
    );
    expect(result.current.key).toBe(5);
    // the page's own moves (a push without state, a write-back replace) keep the page mounted
    act(() => result.current.navigate('/maintenance-order?severityIds=2'));
    expect(result.current.key).toBe(5);
    act(() => result.current.navigate('/maintenance-order?view=list', { replace: true }));
    expect(result.current.key).toBe(5);

    act(() =>
      result.current.navigate('/maintenance-order?severityIds=3', { state: { assistantNav: 6 } })
    );
    expect(result.current.key).toBe(6);
  });

  it('remounts on Back / Forward on the page an assistant link remounted, and nowhere else', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/maintenance-order']}>{children}</MemoryRouter>
    );
    const { result } = renderHook(() => ({ key: useOutletKey(), navigate: useNavigate() }), {
      wrapper,
    });
    act(() =>
      result.current.navigate('/maintenance-order?severityIds=1', { state: { assistantNav: 5 } })
    );
    act(() => result.current.navigate(-1));
    const back = result.current.key;
    expect(back).toBeDefined();
    expect(back).not.toBe(5);
    act(() => result.current.navigate(1));
    expect(result.current.key).toBe(5);

    // another page (the twin's scene must never remount on its own Back)
    act(() => result.current.navigate('/digital-twin'));
    act(() => result.current.navigate('/digital-twin?asset=CT_01'));
    act(() => result.current.navigate(-1));
    expect(result.current.key).toBe(5);
  });
});
