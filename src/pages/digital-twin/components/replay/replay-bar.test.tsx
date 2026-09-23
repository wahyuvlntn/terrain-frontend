import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SimEvent, SimFrames } from '../../../simulation/api/simulation.api';
import { buildReplayIndex } from '../../digital-twin.replay';
import { ReplayClock, ReplaySpeed, TwinReplay } from '../../digital-twin.source';
import { ReplayBar } from './replay-bar';

vi.mock('@digital-twin/components', () => import('../../testing/digital-twin-components.mock'));
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));
vi.mock('@digital-twin/icons', async () => {
  const { createElement } = await import('react');
  const icon = (props: object) => createElement('svg', props);
  return { PauseFill: icon, PlayFill: icon };
});

const T0 = Date.parse('2026-10-11T06:00:00Z');
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();

const event = (id: number, min: number, kind: SimEvent['kind'], code: string): SimEvent => ({
  id,
  variant: 'baseline',
  ts: at(min),
  endTs: null,
  assetAlias: 'CH_01',
  kind,
  code,
  severity: null,
  message: '',
  value: null,
  details: {},
});

const FRAMES: SimFrames = {
  jobId: 7,
  variant: 'baseline',
  t0: at(0),
  stepS: 60,
  steps: 61,
  assets: [],
  series: {},
  states: [],
  events: [event(2, 40, 'trip', 'CHL-001'), event(1, 10, 'control', 'chwst_sp')],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderBar = () => {
  const index = buildReplayIndex(FRAMES);
  const clock = new ReplayClock();
  clock.setRange(index.t0, index.end);
  clock.seek(index.t0);
  const replay = {
    clock,
    playing: false,
    speed: 1 as ReplaySpeed,
    seek: vi.fn((t: number) => clock.seek(t)),
    setSpeed: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
  } as unknown as TwinReplay;
  render(<ReplayBar replay={replay} index={index} />);
  return replay;
};

describe('ReplayBar', () => {
  it('jumps between events with [ and ] on the scrubber; the markers are not Tab stops', () => {
    const replay = renderBar();
    const markers = screen.getAllByRole('button', { name: /^Jump to/ });
    expect(markers).toHaveLength(2);
    markers.forEach((m) => expect(m).toHaveAttribute('tabindex', '-1'));

    const scrubber = screen.getByRole('slider', { name: 'Replay position' });
    expect(scrubber).toHaveAttribute('aria-keyshortcuts', '[ ]');
    fireEvent.keyDown(scrubber, { key: ']' });
    expect(replay.seek).toHaveBeenLastCalledWith(T0 + 10 * 60_000);
    fireEvent.keyDown(scrubber, { key: ']' });
    expect(replay.seek).toHaveBeenLastCalledWith(T0 + 40 * 60_000);
    // nothing after the last event
    fireEvent.keyDown(scrubber, { key: ']' });
    expect(replay.seek).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(scrubber, { key: '[' });
    expect(replay.seek).toHaveBeenLastCalledWith(T0 + 10 * 60_000);
  });

  it('makes the speeds one Tab stop chosen with the arrow keys', () => {
    const replay = renderBar();
    const speeds = screen.getAllByRole('radio');
    expect(speeds.map((s) => s.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);

    fireEvent.keyDown(speeds[0], { key: 'ArrowRight' });
    expect(replay.setSpeed).toHaveBeenCalledWith(10);
    expect(document.activeElement).toBe(speeds[1]);
    fireEvent.keyDown(speeds[0], { key: 'ArrowLeft' });
    expect(replay.setSpeed).toHaveBeenLastCalledWith(60);
  });
  it('shows the events of a marker in a tooltip while the pointer is on it', () => {
    renderBar();
    const [first] = screen.getAllByRole('button', { name: /^Jump to/ });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.pointerEnter(first);
    expect(screen.getByRole('tooltip')).toHaveTextContent(/CH_01 · Control.* chwst_sp/);
    fireEvent.pointerLeave(first);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
