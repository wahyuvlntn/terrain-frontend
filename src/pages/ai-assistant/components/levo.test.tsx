import '@testing-library/jest-dom/vitest';

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NOTIFICATIONS_EVENT } from '../../../shared/components/lib/feat/notification/notification.api';
import { LEVO_ALERT_MS, levoAlertOf, useLevoAlert } from './levo';
import { partPaths } from './levo.art';

// the request layer loads the UI kit (CSS that vitest cannot import)
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const note = (category: string, assetAlias: string, additionalData: string | null = null) =>
  ({ category, assetAlias, additionalData }) as Parameters<typeof levoAlertOf>[0];

describe('partPaths', () => {
  it('draws a run of same-coloured pixels as one rectangle, one path per colour', () => {
    expect(partPaths({ x: 2, y: 5, rows: '\noo.b\n.o..' })).toEqual([
      { fill: 'var(--afdd-neutral-surface-default)', d: 'M2 5h2v1h-2zM3 6h1v1h-1z' },
      { fill: 'var(--afdd-pelorous-400)', d: 'M5 5h1v1h-1z' },
    ]);
  });
});

describe('levoAlertOf', () => {
  it('reacts to trips and alarms (faults) only', () => {
    expect(levoAlertOf(note('STATUS_DOWN', 'CH_02'))).toEqual({
      level: 'critical',
      label: 'Unplanned down',
      text: 'CH_02',
    });
    expect(levoAlertOf(note('ALARM_WARNING', 'CT_01', '{"alarm_name":"CT-013"}'))).toEqual({
      level: 'warning',
      label: 'Fault',
      text: 'CT_01 · CT-013',
    });
    expect(levoAlertOf(note('ALARM_CRITICAL', 'CH_01', 'not json'))?.text).toBe('CH_01');
    expect(levoAlertOf(note('PARAMETER_CRITICAL', 'CH_01'))).toBeNull();
    expect(levoAlertOf(note('STATUS_PLANNED_DOWN', 'CH_01'))).toBeNull();
  });
});

const Probe = () => {
  const alert = useLevoAlert();
  return <output>{alert ? `${alert.level} ${alert.label} ${alert.text}` : 'calm'}</output>;
};

const arrive = (...list: ReturnType<typeof note>[]) =>
  act(() => {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT, { detail: list }));
  });

describe('useLevoAlert', () => {
  it('shows the newest critical event of a burst, then calms down', () => {
    vi.useFakeTimers();
    render(<Probe />);
    arrive(note('STATUS_RUNNING', 'CH_03'));
    expect(screen.getByRole('status')).toHaveTextContent('calm');
    arrive(
      note('STATUS_DOWN', 'CH_01'),
      note('STATUS_DOWN', 'CWP_02'),
      note('ALARM_WARNING', 'CT_01')
    );
    expect(screen.getByRole('status')).toHaveTextContent('critical Unplanned down CWP_02');
    act(() => {
      vi.advanceTimersByTime(LEVO_ALERT_MS);
    });
    expect(screen.getByRole('status')).toHaveTextContent('calm');
  });
});
