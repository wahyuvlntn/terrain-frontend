import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@digital-twin/utils', async () => ({
  ...(await import('../../../../utils/lib/auth-redirect')),
  addDays: (date: Date, days: number) => new Date(date.getTime() + days * 86400000),
  getDiffDays: () => 0,
  SESSION_ID_HEADER: 'X-AFDD-Session-Id',
}));

const api = vi.hoisted(() => ({ signin: vi.fn(), getUserData: vi.fn() }));
vi.mock('./auth.api', () => ({
  ...api,
  credentialsSchema: z.object({ username: z.string(), password: z.string() }),
}));

import { AuthCtx, AuthCtxProvider } from './auth.context';

const Login = () => {
  const auth = useContext(AuthCtx);
  return <button onClick={() => auth.signin('operator', 'test', false)}>Sign in</button>;
};
const Destination = () => {
  const location = useLocation();
  return <output>{location.pathname + location.search + location.hash}</output>;
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('successful sign-in', () => {
  it.each([
    ['/signin?redirect-url=%252Fsignin', '/'],
    ['/signin?redirect-url=%2Fdigital-twin%3Flabel%3DA%2526B%23equipment', '/digital-twin?label=A%26B#equipment'],
  ])('stores the session before loading the profile and navigates from %s', async (entry, expected) => {
    const sessions: (string | null)[] = [];
    api.signin.mockResolvedValue('new-session');
    api.getUserData.mockImplementation(async () => {
      sessions.push(window.localStorage.getItem('X-AFDD-Session-Id'));
      return { fullName: 'Operator', role: 'admin', permissions: [] };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route element={<AuthCtxProvider />}>
              <Route path="/signin" element={<Login />} />
              <Route path="*" element={<Destination />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(expected));
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((session) => session === 'new-session')).toBe(true);
    client.clear();
  });
});
