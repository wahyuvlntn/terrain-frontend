import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LotsTab } from './lots-tab';
import { QualityTab } from './quality-tab';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock('@digital-twin/components', async () => ({
  ...(await import('../../digital-twin/testing/digital-twin-components.mock')),
  Container: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pagination2: () => null,
  Table: () => null,
}));
vi.mock('@digital-twin/icons', () => ({
  Cube: () => null,
  InformationCircle: () => null,
  Layers: () => null,
  ParetoChart: () => null,
  SPCChart: () => null,
  TableChart: () => null,
}));
vi.mock('echarts-for-react', () => ({ default: () => null }));
vi.mock('./shared', () => ({
  Empty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Facts: () => null,
  Pill: () => null,
  Tile: () => null,
  useTwinLink: () => (alias: string) => `/digital-twin?asset=${alias}`,
}));
vi.mock('../api/production.api', () => ({
  PRODUCTION_POLL: {},
  PRODUCTION_QUERY: {
    lots: (p: object) => ['lots', p],
    lot: (code: string) => ['lot', code],
    qualityKeys: (h: number) => ['qualityKeys', h],
    quality: (p: object) => ['quality', p],
  },
  getLots: async () => ({ data: [], count: 0 }),
  getLot: () => new Promise(() => undefined),
  // the first key is fine, the second one has failures
  getQualityKeys: async () =>
    ['DEFECTS', 'PADOX.THK'].map((charKey, i) => ({
      charKey,
      param: 'thickness',
      name: null,
      n: 30,
      fails: i,
      cpk: null,
      steps: null,
    })),
  getQuality: () => new Promise(() => undefined),
}));

/** how the URL last changed (POP: not yet; REPLACE: in place) and its query */
const Url = () => {
  const type = useNavigationType();
  const { search } = useLocation();
  return <output data-testid="url">{`${type} ${search}`}</output>;
};

const renderAt = (url: string, tab: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        {tab}
        <Url />
      </MemoryRouter>
    </QueryClientProvider>
  );

const url = () => screen.getByTestId('url').textContent;

afterEach(cleanup);

describe('LotsTab filters in the URL', () => {
  it('starts from the URL and writes its changes back in place, defaults left out', () => {
    renderAt('/production?tab=lots&lot-status=hold', <LotsTab />);
    const status = screen.getByDisplayValue('On hold');
    expect(url()).toBe('POP ?tab=lots&lot-status=hold');

    fireEvent.change(status, { target: { value: 'done' } });
    expect(url()).toBe('REPLACE ?tab=lots&lot-status=done');

    // a search the URL can read back: trimmed, at most 40 characters
    fireEvent.change(screen.getByPlaceholderText('Search lot code'), {
      target: { value: ` ${'L'.repeat(45)} ` },
    });
    fireEvent.change(status, { target: { value: 'wip' } });
    expect(url()).toBe(`REPLACE ?tab=lots&lot-search=${'L'.repeat(40)}`);
  });
});

describe('QualityTab characteristic', () => {
  it('keeps a char key the window has', async () => {
    renderAt('/production?tab=quality&char=DEFECTS', <QualityTab tools={[]} />);
    const char = screen.getByRole('combobox', { name: 'Characteristic' });
    await waitFor(() => expect(char).toHaveValue('DEFECTS'));
  });

  it('falls back to the first failing key for one it does not have', async () => {
    renderAt('/production?tab=quality&char=NOPE', <QualityTab tools={[]} />);
    const char = screen.getByRole('combobox', { name: 'Characteristic' });
    await waitFor(() => expect(char).toHaveValue('PADOX.THK'));
  });
});
