import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AiOverview } from '../api/ai-insights.api';
import { OverviewStrip } from './overview-strip';

// the component barrel pulls in heavy editors; a tile is its title, value and unit
vi.mock('@digital-twin/components', () => ({
  COLOR: new Proxy({}, { get: (_, key) => String(key) }),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Dropdown: () => null,
  InfoTooltip: () => null,
  Popup: () => null,
  Metric: ({ title, value, unit }: { title: string; value: string; unit?: ReactNode }) => (
    <div aria-label={title}>
      {value} {unit}
    </div>
  ),
}));

afterEach(cleanup);

const overview = (budget: AiOverview['budget']): AiOverview => ({
  recommendation: null,
  faults: { active: 0, last24h: 0 },
  anomalies: { active: 0, last24h: 0 },
  documents: { ready: 0, pending: 0, failed: 0 },
  optimizer: { lastRunAt: null, status: null, nextRunAt: null },
  budget,
});

describe('OverviewStrip AI budget tile', () => {
  it('shows the spend against a daily limit', () => {
    render(
      <OverviewStrip
        data={overview({ todayUsd: 0.12, limitUsd: 0.5 })}
        isError={false}
        onOpen={() => {}}
      />
    );
    expect(screen.getByLabelText('AI budget today')).toHaveTextContent('$0.12 of $0.50');
  });

  it.each([0, null])('shows only the spend and "no limit" for a limit of %s', (limitUsd) => {
    render(
      <OverviewStrip
        data={overview({ todayUsd: 3.4, limitUsd })}
        isError={false}
        onOpen={() => {}}
      />
    );
    const tile = screen.getByLabelText('AI budget today');
    expect(tile).toHaveTextContent('$3.40 no limit');
    expect(tile).not.toHaveTextContent('of $');
  });
});
