import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KPI_SECTIONS } from './components/kpi-strip';
import { Production } from './production';
import { fmtDec, fmtInt } from './production.utils';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock(
  '@digital-twin/components',
  () => import('../digital-twin/testing/digital-twin-components.mock')
);
vi.mock('@digital-twin/reusables', () => ({
  toast: { error: () => undefined },
  TabProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabListProduct: () => null,
  TabProduct: () => null,
  TabPanelProduct: () => null,
}));
vi.mock('@digital-twin/icons', () => ({
  ChartKpi: () => null,
  ChevronDownFill: () => null,
  ChevronUpFill: () => null,
  Layers: () => null,
  MachineDetails: () => null,
  SPCChart: () => null,
}));
// the page's frame only: the strip is a marker, the tabs are empty
vi.mock('./components', async () => ({
  KPI_SECTIONS: (
    await vi.importActual<typeof import('./components/kpi-strip')>('./components/kpi-strip')
  ).KPI_SECTIONS,
  KpiStrip: () => <div data-testid="kpi-strip" />,
  LotsTab: () => null,
  OverviewTab: () => null,
  QualityTab: () => null,
  ToolsTab: () => null,
}));
vi.mock('./api/production.api', () => ({
  PRODUCTION_POLL: {},
  PRODUCTION_QUERY: {
    overview: (h: number) => ['overview', h],
    tools: (h: number) => ['tools', h],
  },
  getOverview: async () => ({
    window: { from: '2026-10-14T08:00:00Z', to: '2026-10-15T08:00:00Z', hours: 24 },
    kpi: { oee: 71.2, waferOuts: 1250, wipLots: 84, cycleTimeDays: 18.4 },
  }),
  getTools: async () => [],
}));

const KEY = 'production.kpiOpen';

/** a link followed on the page */
const Go = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      go
    </button>
  );
};

const page = (url: string, go: string) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={[url]}>
      <Production />
      <Go to={go} />
    </MemoryRouter>
  </QueryClientProvider>
);

const renderPage = (url = '/production', go = '/production') => render(page(url, go));

const toggle = () => screen.getByRole('button', { name: 'KPIs' });

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('Production KPI strip', () => {
  it('lists the sections that open it', () => {
    expect(KPI_SECTIONS).toEqual(['kpi', 'oee', 'output', 'flow']);
  });

  it('is open by default; closed, it is not rendered and the ribbon shows its numbers', async () => {
    renderPage();
    expect(screen.getByTestId('kpi-strip')).toBeInTheDocument();
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(toggle()).toHaveAttribute('title', 'Hide the KPI cards');

    fireEvent.click(toggle());
    expect(screen.queryByTestId('kpi-strip')).toBeNull();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).toHaveAttribute('title', 'Show the KPI cards');
    expect(window.localStorage.getItem(KEY)).toBe('false');
    expect(
      await screen.findByText(
        `OEE 71.2 % · ${fmtInt(1250)} wafer outs · WIP 84 lots · cycle ${fmtDec(18.4)} days`
      )
    ).toBeInTheDocument();
  });

  it('stays closed after a reload', () => {
    window.localStorage.setItem(KEY, 'false');
    renderPage();
    expect(screen.queryByTestId('kpi-strip')).toBeNull();
  });

  it('opens for an assistant link to it, on arrival and on the page', () => {
    window.localStorage.setItem(KEY, 'false');
    // the first render, before any effect: no jump when the highlighter looks for the card
    expect(renderToString(page('/production?section=oee', '/production'))).toContain(
      'data-testid="kpi-strip"'
    );
    expect(renderToString(page('/production', '/production'))).not.toContain(
      'data-testid="kpi-strip"'
    );
    renderPage('/production?section=oee');
    expect(screen.getByTestId('kpi-strip')).toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe('true');
    cleanup();

    window.localStorage.setItem(KEY, 'false');
    renderPage('/production', '/production?section=kpi');
    expect(screen.queryByTestId('kpi-strip')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'go' }));
    expect(screen.getByTestId('kpi-strip')).toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe('true');
  });
});
