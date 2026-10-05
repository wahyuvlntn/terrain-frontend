import { act, cleanup, renderHook } from '@testing-library/react';
import { ReactNode, useState } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  anomalyFilterFromUrl,
  anomalyFilterToUrl,
  FaultFilter,
  faultFilterFromUrl,
  faultFilterToUrl,
  listedIn,
  revealAnomaly,
  revealFault,
  revealRecommendation,
  useRevealSelection,
} from './ai-insights.reveal';

afterEach(cleanup);

const NOW = Date.parse('2026-10-11T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

/** The faults tab's defaults: active faults, any equipment and rule, 7 days for cleared ones */
const DEFAULT: FaultFilter = { status: 'ACTIVE', assetId: '', rule: '', hours: '168' };

const fault = (over: Partial<Parameters<typeof revealFault>[1] & { id: number }> = {}) => ({
  id: 12,
  status: 'CLEARED' as const,
  assetId: 3,
  endedAt: hoursAgo(30),
  ruleCode: 'CHS-005',
  ...over,
});

describe('revealFault', () => {
  it('switches the default Active filter to All for a cleared fault', () => {
    expect(revealFault(DEFAULT, fault(), NOW)).toEqual({ ...DEFAULT, status: '' });
  });

  it('leaves filters that list the fault alone', () => {
    expect(revealFault({ ...DEFAULT, status: 'CLEARED' }, fault(), NOW)).toBeNull();
    expect(revealFault(DEFAULT, fault({ status: 'ACTIVE', endedAt: null }), NOW)).toBeNull();
    const narrow = { status: '' as const, assetId: '3', rule: 'chs-005', hours: '24' };
    expect(revealFault(narrow, fault({ endedAt: hoursAgo(2) }), NOW)).toBeNull();
  });

  it('widens the window to the smallest one that holds the fault', () => {
    const all = { ...DEFAULT, status: '' as const, hours: '24' };
    expect(revealFault(all, fault({ endedAt: hoursAgo(10 * 24) }), NOW)?.hours).toBe('720');
    expect(revealFault(DEFAULT, fault({ endedAt: hoursAgo(200) }), NOW)).toEqual({
      ...DEFAULT,
      status: '',
      hours: '720',
    });
    // an hour to spare at the edge of a window
    expect(revealFault(all, fault({ endedAt: hoursAgo(23.5) }), NOW)?.hours).toBe('168');
    // older than every window: the widest (its detail still shows)
    expect(revealFault(all, fault({ endedAt: hoursAgo(5000) }), NOW)?.hours).toBe('2160');
    // an active fault is listed whatever the window
    expect(
      revealFault({ ...all, status: 'CLEARED' }, fault({ status: 'ACTIVE', endedAt: null }), NOW)
    ).toEqual({ ...all, status: '' });
  });

  it('drops an equipment or rule filter of another fault, keeping the others', () => {
    expect(revealFault({ ...DEFAULT, assetId: '4', rule: 'CT-014' }, fault(), NOW)).toEqual({
      ...DEFAULT,
      status: '',
      assetId: '',
      rule: '',
    });
    expect(
      revealFault({ ...DEFAULT, status: 'CLEARED', assetId: '3', rule: 'CT-014' }, fault(), NOW)
    ).toEqual({ ...DEFAULT, status: 'CLEARED', assetId: '3', rule: '' });
  });
});

describe('revealAnomaly and revealRecommendation', () => {
  const anomaly = {
    status: 'CLEARED' as const,
    assetId: 1,
    endedAt: hoursAgo(1),
    detector: 'ewma' as const,
  };

  it('widens the detector filter and the status of an anomaly', () => {
    const filter = {
      status: 'ACTIVE' as const,
      detector: 'zscore' as const,
      assetId: '',
      hours: '24',
    };
    expect(revealAnomaly(filter, anomaly, NOW)).toEqual({ ...filter, status: '', detector: '' });
    expect(revealAnomaly({ ...filter, status: '', detector: 'ewma' }, anomaly, NOW)).toBeNull();
  });

  it('shows every status for a recommendation the status filter hides', () => {
    expect(revealRecommendation({ status: 'APPLIED' }, { status: 'VALIDATED' })).toEqual({
      status: '',
    });
    expect(revealRecommendation({ status: '' }, { status: 'VALIDATED' })).toBeNull();
    expect(revealRecommendation({ status: 'VALIDATED' }, { status: 'VALIDATED' })).toBeNull();
  });
});

describe('URL filters of the tabs', () => {
  const url = (search: string) => new URLSearchParams(search);

  it('reads the faults filters, falling back to the defaults', () => {
    expect(faultFilterFromUrl(url('status=all&asset=4&hours=720&display=timeline'))).toEqual({
      status: '',
      assetId: '4',
      rule: '',
      hours: '720',
      view: 'timeline',
    });
    expect(faultFilterFromUrl(url('status=x&asset=CT_01&hours=5&display=gantt'))).toEqual({
      ...DEFAULT,
      view: 'list',
    });
    expect(faultFilterFromUrl(url('status=CLEARED&rule=CHL-011'))).toMatchObject({
      status: 'CLEARED',
      rule: 'CHL-011',
    });
    expect(faultFilterFromUrl(url(`rule=${'X'.repeat(21)}`)).rule).toBe('');
  });

  it('writes the faults filters: All spelled out, defaults left out, other params kept', () => {
    const shown = url('tab=faults&fault=12&status=CLEARED&hours=720&display=timeline');
    expect(faultFilterToUrl(shown, { ...DEFAULT, status: '', view: 'list' }).toString()).toBe(
      'tab=faults&fault=12&status=all'
    );
    expect(
      faultFilterToUrl(url('tab=faults'), { ...DEFAULT, assetId: '4', view: 'timeline' }).toString()
    ).toBe('tab=faults&asset=4&display=timeline');
  });

  it('reads and writes the anomalies filters (24 h by default)', () => {
    expect(anomalyFilterFromUrl(url('detector=zscore&hours=720'))).toEqual({
      status: 'ACTIVE',
      detector: 'zscore',
      assetId: '',
      hours: '720',
    });
    expect(anomalyFilterFromUrl(url('detector=foo&hours=5'))).toMatchObject({
      detector: '',
      hours: '24',
    });
    const all = { status: '' as const, detector: 'zscore' as const, assetId: '', hours: '24' };
    expect(anomalyFilterToUrl(url('tab=anomalies&hours=720'), all).toString()).toBe(
      'tab=anomalies&status=all&detector=zscore'
    );
  });
});

describe('listedIn', () => {
  it('tells whether the loaded list shows the item, nothing while the list loads', () => {
    const data = [{ id: 11 }, { id: 12 }];
    expect(listedIn({ data, isPlaceholderData: false }, 12)).toBe(true);
    expect(listedIn({ data, isPlaceholderData: false }, 13)).toBe(false);
    // the previous filters' rows, kept while the new list loads
    expect(listedIn({ data, isPlaceholderData: true }, 13)).toBeUndefined();
    expect(listedIn({ data: undefined, isPlaceholderData: false }, 12)).toBeUndefined();
  });
});

type Item = ReturnType<typeof fault>;
/** `listed`: the list shows the item (default false: loaded without it); null while it loads */
type Props = { selectedId: number | null; item?: Item; listed?: boolean | null };

/** A tab: its filter state, the reveal hook and the router (a new link = a navigation) */
const renderTab = (initial: Props, apply = vi.fn(), initialFilter = DEFAULT) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/ai-insights?tab=faults&fault=12']}>{children}</MemoryRouter>
  );
  return renderHook(
    ({ selectedId, item, listed = false }: Props) => {
      const [filter, setFilter] = useState(initialFilter);
      useRevealSelection({
        selectedId,
        listed: listed ?? undefined,
        item,
        filter,
        reveal: (f: FaultFilter, i: Item) => revealFault(f, i, NOW),
        apply: (f: FaultFilter) => {
          apply(f);
          setFilter(f);
        },
      });
      return { filter, setFilter, navigate: useNavigate() };
    },
    { wrapper, initialProps: initial }
  );
};

describe('useRevealSelection', () => {
  it('widens the filters once the linked item has loaded', () => {
    const { result, rerender } = renderTab({ selectedId: 12 });
    expect(result.current.filter).toEqual(DEFAULT);
    rerender({ selectedId: 12, item: fault() });
    expect(result.current.filter).toEqual({ ...DEFAULT, status: '' });
  });

  it('ignores an item of another selection (data kept from the previous query)', () => {
    const apply = vi.fn();
    renderTab({ selectedId: 12, item: fault({ id: 11 }) }, apply);
    expect(apply).not.toHaveBeenCalled();
  });

  it('keeps a filter the user sets after the reveal, until the next link', () => {
    const apply = vi.fn();
    const { result, rerender } = renderTab({ selectedId: 12, item: fault() }, apply);
    expect(result.current.filter.status).toBe('');

    act(() => result.current.setFilter(DEFAULT));
    rerender({ selectedId: 12, item: fault() }); // a refetch: a new object of the same fault
    expect(result.current.filter).toEqual(DEFAULT);
    expect(apply).toHaveBeenCalledTimes(1);

    // the assistant links the same fault again
    act(() => result.current.navigate('/ai-insights?tab=faults&fault=12'));
    expect(result.current.filter).toEqual({ ...DEFAULT, status: '' });
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it('keeps a filter the user sets while the item is loading', () => {
    const apply = vi.fn();
    const { result, rerender } = renderTab({ selectedId: 12 }, apply);
    act(() => result.current.setFilter({ ...DEFAULT, rule: 'CT-014' }));
    rerender({ selectedId: 12, item: fault() });
    expect(result.current.filter).toEqual({ ...DEFAULT, rule: 'CT-014' });
    expect(apply).not.toHaveBeenCalled();
  });

  it('changes nothing for a listed item, an unknown item or no selection', () => {
    const apply = vi.fn();
    const listed = renderTab(
      { selectedId: 12, item: fault({ status: 'ACTIVE', endedAt: null }), listed: true },
      apply
    );
    expect(listed.result.current.filter).toEqual(DEFAULT);
    renderTab({ selectedId: 99 }, apply); // not found: the item never arrives
    renderTab({ selectedId: null, item: fault() }, apply);
    expect(apply).not.toHaveBeenCalled();
  });

  it('keeps the window of a listed row near its edge (a row click is a navigation too)', () => {
    const apply = vi.fn();
    const narrow: FaultFilter = { ...DEFAULT, status: '', hours: '24' };
    // ended 23.5 h ago: in the 24 h list, but `revealFault` keeps an hour to spare
    const edge = fault({ endedAt: hoursAgo(23.5) });
    expect(revealFault(narrow, edge, NOW)?.hours).toBe('168');
    const { result, rerender } = renderTab(
      { selectedId: 12, item: edge, listed: true },
      apply,
      narrow
    );
    // a refetch that no longer lists it (the window moved on) is not a new link
    rerender({ selectedId: 12, item: edge, listed: false });
    expect(result.current.filter).toEqual(narrow);
    expect(apply).not.toHaveBeenCalled();
  });

  it('keeps the filters the tab writes to the URL (a replace of the same selection)', () => {
    const apply = vi.fn();
    const { result, rerender } = renderTab({ selectedId: 12, item: fault() }, apply);
    act(() => result.current.setFilter(DEFAULT));
    act(() => result.current.navigate('/ai-insights?tab=faults&fault=12', { replace: true }));
    rerender({ selectedId: 12, item: fault() });
    expect(result.current.filter).toEqual(DEFAULT);
    expect(apply).toHaveBeenCalledTimes(1);

    // set while the item loads, then written to the URL: still the user's
    const loading = renderTab({ selectedId: 12 }, apply);
    act(() => loading.result.current.setFilter({ ...DEFAULT, rule: 'CT-014' }));
    act(() =>
      loading.result.current.navigate('/ai-insights?tab=faults&fault=12&rule=CT-014', {
        replace: true,
      })
    );
    loading.rerender({ selectedId: 12, item: fault() });
    expect(loading.result.current.filter).toEqual({ ...DEFAULT, rule: 'CT-014' });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('waits for the list of the current filters before widening them', () => {
    const apply = vi.fn();
    const { result, rerender } = renderTab({ selectedId: 12, item: fault(), listed: null }, apply);
    expect(apply).not.toHaveBeenCalled();
    rerender({ selectedId: 12, item: fault(), listed: false });
    expect(result.current.filter).toEqual({ ...DEFAULT, status: '' });
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
