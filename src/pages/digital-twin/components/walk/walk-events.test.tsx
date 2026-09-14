import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getTwinLiveEvents, TwinLiveEvent } from '../../api/digital-twin.api';
import { TwinAssetTarget } from '../../digital-twin.navigation';
import {
  addToasts,
  eventToVisit,
  isEscalation,
  mergeEvents,
  TwinLiveEventFeed,
  useTwinLiveEvents,
  WalkEventList,
  WalkEventToasts,
} from './walk-events';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock('@digital-twin/components', () => import('../../testing/digital-twin-components.mock'));
const utils = vi.hoisted(() => ({ jsRequest: vi.fn() }));
vi.mock('@digital-twin/utils', () => utils);

const raw = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  kind: 'alarm',
  severity: 'WARNING',
  asset: { id: 5, alias: 'CT_01', name: 'Cooling Tower CT-01' },
  title: 'Fan motor current high',
  detail: null,
  started_at: '2026-10-11T06:00:00Z',
  active: true,
  ...over,
});

const event = (id: string, over: Partial<TwinLiveEvent> = {}): TwinLiveEvent => ({
  id,
  kind: 'alarm',
  severity: 'WARNING',
  asset: { id: 5, alias: 'CT_01', name: 'Cooling Tower CT-01' },
  title: `Event ${id}`,
  detail: null,
  startedAt: '2026-10-11T06:00:00Z',
  active: true,
  ...over,
});

// a block body: a function returned by beforeEach is run as its teardown (the mock would be called)
beforeEach(() => {
  utils.jsRequest.mockReset();
});
afterEach(cleanup);

describe('getTwinLiveEvents', () => {
  it('sends since / limit when set, normalises severity and drops malformed events', async () => {
    utils.jsRequest.mockResolvedValue({
      now: '2026-10-11T06:05:00Z',
      events: [
        raw('alarm:1', { severity: 'critical' }),
        raw('fault:2', { kind: 'fault', severity: 'HIGH', detail: 'CW supply above set point' }),
        raw('odd:3', { kind: 'meteor' }),
        { id: 'alarm:4' },
      ],
    });
    const res = await getTwinLiveEvents({ since: '2026-10-11T06:00:00Z', limit: 30 });
    expect(utils.jsRequest).toHaveBeenCalledWith({
      url: '/digital_twin/getliveevents',
      data: { since: '2026-10-11T06:00:00Z', limit: 30 },
    });
    expect(res.now).toBe('2026-10-11T06:05:00Z');
    expect(res.events.map((e) => [e.id, e.kind, e.severity, e.startedAt])).toEqual([
      ['alarm:1', 'alarm', 'CRITICAL', '2026-10-11T06:00:00Z'],
      ['fault:2', 'fault', 'WARNING', '2026-10-11T06:00:00Z'],
    ]);

    utils.jsRequest.mockResolvedValue({ now: '2026-10-11T06:05:05Z', events: null });
    await expect(getTwinLiveEvents({})).resolves.toEqual({
      now: '2026-10-11T06:05:05Z',
      events: [],
    });
    expect(utils.jsRequest).toHaveBeenLastCalledWith({
      url: '/digital_twin/getliveevents',
      data: {},
    });
  });
});

/** CT_01 is modelled, PCWP_01 has a room in 3D, MAU_01 nowhere to go */
const targetOf = (alias: string): TwinAssetTarget =>
  alias === 'CT_01'
    ? { kind: 'equipment', alias, nodeId: 'cooling-tower-yard/ct-01' }
    : alias === 'PCWP_01'
      ? {
          kind: 'location',
          alias,
          locationId: 'loc-11',
          note: `${alias} is not modelled in 3D yet`,
        }
      : { kind: 'none', alias, note: `${alias} is not modelled in 3D yet` };

const MAU = { id: 9, alias: 'MAU_01', name: 'MAU-01' };

describe('useTwinLiveEvents', () => {
  const KEY = { queryKey: ['DIGITAL_TWIN_LIVE_EVENTS'] };
  const setup = (onError?: () => void) => {
    const client = new QueryClient({
      queryCache: new QueryCache({ onError }),
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, wrapper };
  };

  it('seeds the list with the first answer, then reports what came in since as fresh', async () => {
    const { client, wrapper } = setup();
    utils.jsRequest.mockResolvedValueOnce({ now: 'T1', events: [raw('alarm:1')] });
    const { result, rerender } = renderHook(({ on }) => useTwinLiveEvents(on), {
      wrapper,
      initialProps: { on: true },
    });
    await waitFor(() => expect(result.current.events.map((e) => e.id)).toEqual(['alarm:1']));
    expect(result.current.fresh).toEqual([]);
    expect(utils.jsRequest.mock.calls[0][0].data).toEqual({ limit: 30 });

    utils.jsRequest.mockResolvedValueOnce({
      now: 'T2',
      events: [raw('trip:9', { kind: 'trip', severity: 'CRITICAL' })],
    });
    await act(() => client.refetchQueries({ queryKey: ['DIGITAL_TWIN_LIVE_EVENTS'] }));
    await waitFor(() => expect(result.current.fresh.map((e) => e.id)).toEqual(['trip:9']));
    expect(result.current.events.map((e) => e.id)).toEqual(['trip:9', 'alarm:1']);
    expect(utils.jsRequest.mock.calls[1][0].data).toEqual({ since: 'T1', limit: 30 });

    // leaving walk mode resets the cursor: the next walk starts from the last hour again
    rerender({ on: false });
    utils.jsRequest.mockResolvedValueOnce({ now: 'T3', events: [raw('alarm:1')] });
    rerender({ on: true });
    await waitFor(() => expect(utils.jsRequest).toHaveBeenCalledTimes(3));
    expect(utils.jsRequest.mock.calls[2][0].data).toEqual({ limit: 30 });
  });

  it('leaving walk mode empties the feed and drops an answer still in flight', async () => {
    const { client, wrapper } = setup();
    utils.jsRequest.mockResolvedValueOnce({ now: 'T1', events: [raw('alarm:1')] });
    const { result, rerender } = renderHook(({ on }) => useTwinLiveEvents(on), {
      wrapper,
      initialProps: { on: true },
    });
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    let answer: (v: unknown) => void = () => undefined;
    utils.jsRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    void client.refetchQueries(KEY);
    await waitFor(() => expect(utils.jsRequest).toHaveBeenCalledTimes(2));
    rerender({ on: false });
    // nothing of the last walk is left (the badge, G and the list start empty)
    expect(result.current.events).toEqual([]);
    expect(result.current.fresh).toEqual([]);
    await act(async () => answer({ now: 'T2', events: [raw('trip:2', { kind: 'trip' })] }));
    expect(result.current.events).toEqual([]);

    // the next walk starts from the last hour (the late answer moved no cursor), announcing nothing
    utils.jsRequest.mockResolvedValueOnce({ now: 'T3', events: [raw('alarm:3')] });
    rerender({ on: true });
    await waitFor(() => expect(result.current.events.map((e) => e.id)).toEqual(['alarm:3']));
    expect(result.current.fresh).toEqual([]);
    expect(utils.jsRequest.mock.calls[2][0].data).toEqual({ limit: 30 });
  });

  it('takes an escalation in place of the warning it escalates, announcing it', async () => {
    const { client, wrapper } = setup();
    const anomaly = { kind: 'anomaly', title: 'Fan current anomaly' };
    utils.jsRequest.mockResolvedValueOnce({
      now: 'T1',
      events: [raw('anomaly:5', anomaly), raw('alarm:1')],
    });
    const { result } = renderHook(() => useTwinLiveEvents(true), { wrapper });
    await waitFor(() => expect(result.current.events).toHaveLength(2));

    utils.jsRequest.mockResolvedValueOnce({
      now: 'T2',
      events: [raw('anomaly:5:critical', { ...anomaly, severity: 'CRITICAL' })],
    });
    await act(() => client.refetchQueries(KEY));
    await waitFor(() =>
      expect(result.current.fresh.map((e) => e.id)).toEqual(['anomaly:5:critical'])
    );
    expect(result.current.events.map((e) => [e.id, e.severity])).toEqual([
      ['anomaly:5:critical', 'CRITICAL'],
      ['alarm:1', 'WARNING'],
    ]);
  });

  it('reports a failing feed once per outage and keeps saying it is unavailable', async () => {
    const onError = vi.fn();
    const { client, wrapper } = setup(onError);
    utils.jsRequest.mockRejectedValue(new Error('Script not found'));
    const { result } = renderHook(() => useTwinLiveEvents(true), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onError).toHaveBeenCalledTimes(1);

    // the retries of the outage fail quietly: no new error toast, still unavailable
    await act(() => client.refetchQueries(KEY));
    await act(() => client.refetchQueries(KEY));
    expect(utils.jsRequest).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(result.current.isError).toBe(true);

    // back again: the list fills, and a later outage is reported again
    utils.jsRequest.mockResolvedValueOnce({ now: 'T1', events: [raw('alarm:1')] });
    await act(() => client.refetchQueries(KEY));
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.events.map((e) => e.id)).toEqual(['alarm:1']);
    await act(() => client.refetchQueries(KEY));
    expect(onError).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.events.map((e) => e.id)).toEqual(['alarm:1']);
  });
});

describe('mergeEvents', () => {
  const ids = (list: readonly TwinLiveEvent[]) => list.map((e) => e.id);
  const warning = event('anomaly:5', { kind: 'anomaly', startedAt: '2026-10-11T05:20:00Z' });
  const critical = (over: Partial<TwinLiveEvent> = {}) =>
    event('anomaly:5:critical', {
      kind: 'anomaly',
      severity: 'CRITICAL',
      detail: 'z-score 6.1',
      startedAt: '2026-10-11T05:20:00Z',
      ...over,
    });

  it('dedupes by id and puts what came in on top, newest first', () => {
    const list = [event('alarm:2'), event('alarm:1')];
    const res = mergeEvents(list, [event('alarm:4'), event('alarm:3'), event('alarm:2')]);
    expect(ids(res.fresh)).toEqual(['alarm:4', 'alarm:3']);
    expect(ids(res.events)).toEqual(['alarm:4', 'alarm:3', 'alarm:2', 'alarm:1']);
    expect(ids(mergeEvents(res.events, [event('alarm:5')], 3).events)).toEqual([
      'alarm:5',
      'alarm:4',
      'alarm:3',
    ]);
  });

  it('replaces the warning of a row by its escalation: one entry, critical, on top, later time', () => {
    const list = [event('alarm:7'), warning, event('alarm:1')];
    const res = mergeEvents(list, [critical({ startedAt: '2026-10-11T05:25:00Z' })]);
    expect(ids(res.events)).toEqual(['anomaly:5:critical', 'alarm:7', 'alarm:1']);
    expect(res.events[0]).toMatchObject({
      severity: 'CRITICAL',
      detail: 'z-score 6.1',
      startedAt: '2026-10-11T05:25:00Z',
    });
    expect(ids(res.fresh)).toEqual(['anomaly:5:critical']);
    expect(isEscalation(res.fresh[0])).toBe(true);
    // the later time wins either way round
    const earlier = mergeEvents(
      [{ ...warning, startedAt: '2026-10-11T05:30:00Z' }],
      [critical()]
    ).events;
    expect(earlier.map((e) => [e.id, e.startedAt])).toEqual([
      ['anomaly:5:critical', '2026-10-11T05:30:00Z'],
    ]);

    // again, or the warning after its escalation: nothing new
    for (const again of [critical(), warning]) {
      const next = mergeEvents(res.events, [again]);
      expect(next.fresh).toEqual([]);
      expect(ids(next.events)).toEqual(ids(res.events));
    }
  });

  it('lists an escalation whose warning it no longer has, and merges both of one answer', () => {
    expect(ids(mergeEvents([event('alarm:1')], [critical()]).events)).toEqual([
      'anomaly:5:critical',
      'alarm:1',
    ]);
    const both = mergeEvents([event('alarm:1')], [critical(), event('alarm:2'), warning]);
    expect(ids(both.fresh)).toEqual(['anomaly:5:critical', 'alarm:2']);
    expect(ids(both.events)).toEqual(['anomaly:5:critical', 'alarm:2', 'alarm:1']);
    // only the ":critical" suffix escalates: another row of the same kind is its own entry
    expect(ids(mergeEvents([warning], [event('anomaly:15:critical')]).events)).toEqual([
      'anomaly:15:critical',
      'anomaly:5',
    ]);
  });
});

describe('eventToVisit', () => {
  it('is the newest event whose equipment, or its room, is in 3D', () => {
    const events = [
      event('alarm:3', { asset: MAU }),
      event('alarm:2', { asset: { id: 7, alias: 'PCWP_01', name: 'PCW Pump PCWP-01' } }),
      event('alarm:1'),
    ];
    expect(eventToVisit(events, targetOf)?.id).toBe('alarm:2');
    expect(eventToVisit(events.slice(2), targetOf)?.id).toBe('alarm:1');
    expect(eventToVisit([events[0]], targetOf)).toBeUndefined();
    // the equipment list still loading: only modelled equipment is a target
    expect(eventToVisit(events, (a) => (a === 'CT_01' ? targetOf(a) : 'wait'))?.id).toBe('alarm:1');
  });

  it('carries the G hint in the list, past events with nowhere to go', () => {
    const feed: TwinLiveEventFeed = {
      events: [event('alarm:2', { asset: MAU }), event('alarm:1')],
      fresh: [],
      seq: 1,
      isError: false,
    };
    render(<WalkEventList feed={feed} targetOf={targetOf} onTeleport={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Teleport to CT_01' }).textContent).toContain('G');
    expect(
      screen.getByRole('button', { name: 'Teleport to MAU_01 (MAU_01 is not modelled in 3D yet)' })
        .textContent
    ).not.toContain('G');
  });
});

describe('addToasts', () => {
  const valve = (id: string) =>
    event(id, { asset: MAU, title: 'CHW Valve Position', detail: 'CHW valve above 95 %' });

  it('counts repeats of an event on one toast, moved on top with the newest occurrence', () => {
    let toasts = addToasts([], [valve('alarm:1')]);
    toasts = addToasts(toasts, [event('alarm:2')]);
    toasts = addToasts(toasts, [valve('alarm:3')]);
    expect(toasts.map((t) => [t.event.id, t.count])).toEqual([
      ['alarm:3', 2],
      ['alarm:2', 1],
    ]);
    // one poll with several (newest first): each counted, the newest on top, at most three
    toasts = addToasts(toasts, [
      valve('alarm:7'),
      event('alarm:6', { title: 'Basin level low' }),
      event('alarm:5', { kind: 'fault' }),
      valve('alarm:4'),
    ]);
    expect(toasts.map((t) => [t.event.id, t.count])).toEqual([
      ['alarm:7', 4],
      ['alarm:6', 1],
      ['alarm:5', 1],
    ]);
  });

  it('turns the toast of a warning into its escalation, not a repeat', () => {
    const anomaly = (id: string) => ({ ...valve(id), kind: 'anomaly' as const });
    const escalation = {
      ...anomaly('anomaly:5:critical'),
      severity: 'CRITICAL' as const,
    };
    let toasts = addToasts([], [anomaly('anomaly:5'), event('alarm:2')]);
    toasts = addToasts(toasts, [escalation]);
    expect(toasts.map((t) => [t.event.id, t.count])).toEqual([
      ['anomaly:5:critical', 1],
      ['alarm:2', 1],
    ]);
    // a later row of the same anomaly is a repeat again
    toasts = addToasts(toasts, [anomaly('anomaly:8')]);
    expect(toasts.map((t) => [t.event.id, t.count])).toEqual([
      ['anomaly:8', 2],
      ['alarm:2', 1],
    ]);
    // an escalation whose warning toast is gone gets its own
    expect(addToasts([], [escalation]).map((t) => [t.event.id, t.count])).toEqual([
      ['anomaly:5:critical', 1],
    ]);
    // two detectors' rows of one parameter share the toast: escalating either adds no repeat
    toasts = addToasts([], [anomaly('anomaly:6'), anomaly('anomaly:5')]);
    expect(toasts.map((t) => [t.event.id, t.count])).toEqual([['anomaly:6', 2]]);
    toasts = addToasts(toasts, [escalation]);
    toasts = addToasts(toasts, [
      { ...anomaly('anomaly:6:critical'), severity: 'CRITICAL' as const },
    ]);
    expect(toasts.map((t) => [t.event.id, t.count])).toEqual([['anomaly:6:critical', 2]]);
  });

  it('reads an escalation as one, in the toast and in the list', () => {
    const escalation = event('anomaly:5:critical', {
      kind: 'anomaly',
      severity: 'CRITICAL',
      title: 'Fan current anomaly',
    });
    const feed: TwinLiveEventFeed = {
      events: [escalation],
      fresh: [escalation],
      seq: 1,
      isError: false,
    };
    render(<WalkEventToasts feed={feed} targetOf={targetOf} onTeleport={vi.fn()} />);
    const toast = screen.getByRole('status');
    expect(toast.textContent).toContain('Escalated to critical');
    expect(toast.textContent).not.toContain('×');
    cleanup();
    render(<WalkEventList feed={feed} targetOf={targetOf} onTeleport={vi.fn()} />);
    expect(screen.getByText('Escalated to critical')).toBeTruthy();
    expect(screen.getAllByText('Fan current anomaly')).toHaveLength(1);
  });

  it('shows the count and the message of a coded alarm', () => {
    const feed = (seq: number, fresh: TwinLiveEvent[]): TwinLiveEventFeed => ({
      events: fresh,
      fresh,
      seq,
      isError: false,
    });
    const coded = event('alarm:1', {
      asset: { id: 31, alias: 'CHWS_01', name: 'CHW Plant CHWS-01' },
      title: 'CHS-002',
      detail: 'Riser differential pressure below 80 kPa',
    });
    const { rerender } = render(
      <WalkEventToasts feed={feed(1, [coded])} targetOf={targetOf} onTeleport={vi.fn()} />
    );
    expect(screen.getByText('CHS-002')).toBeTruthy();
    expect(screen.getByText('Riser differential pressure below 80 kPa')).toBeTruthy();
    rerender(
      <WalkEventToasts
        feed={feed(2, [{ ...coded, id: 'alarm:2' }])}
        targetOf={targetOf}
        onTeleport={vi.fn()}
      />
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByText('×2')).toBeTruthy();
  });
});

describe('WalkEventToasts', () => {
  it('toasts fresh events with a Teleport button, disabled with the reason when there is nowhere to go', () => {
    const onTeleport = vi.fn();
    const feed = (seq: number, fresh: TwinLiveEvent[], events = fresh): TwinLiveEventFeed => ({
      events,
      fresh,
      seq,
      isError: false,
    });
    const targetOf = (alias: string) =>
      alias === 'CT_01'
        ? ({ kind: 'equipment', alias, nodeId: 'cooling-tower-yard/ct-01' } as const)
        : ({ kind: 'none', alias, note: `${alias} is not modelled in 3D yet` } as const);
    const { rerender } = render(
      <WalkEventToasts feed={feed(0, [])} targetOf={targetOf} onTeleport={onTeleport} />
    );
    expect(screen.queryByRole('status')).toBeNull();

    const mau = event('alarm:2', {
      asset: { id: 9, alias: 'MAU_01', name: 'MAU-01' },
      severity: 'CRITICAL',
    });
    rerender(
      <WalkEventToasts
        feed={feed(1, [event('alarm:1'), mau])}
        targetOf={targetOf}
        onTeleport={onTeleport}
      />
    );
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.getByText('Event alarm:1')).toBeTruthy();
    const ct = screen.getByRole('button', { name: 'Teleport to CT_01' });
    const blocked = screen.getByRole('button', {
      name: 'Teleport to MAU_01 (MAU_01 is not modelled in 3D yet)',
    }) as HTMLButtonElement;
    expect(blocked.disabled).toBe(true);
    act(() => ct.click());
    expect(onTeleport).toHaveBeenCalledWith('CT_01');
    // the toast it came from goes away
    expect(screen.queryByText('Event alarm:1')).toBeNull();
  });
});
