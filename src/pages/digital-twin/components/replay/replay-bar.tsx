import { TooltipContent } from '@digital-twin/components';
import { PauseFill, PlayFill } from '@digital-twin/icons';
import clsx from 'clsx';
import { format } from 'date-fns';
import { CSSProperties, KeyboardEvent, useMemo, useRef, useState } from 'react';

import { SIM_EVENT_KIND_LABEL, SimEvent } from '../../../simulation/api/simulation.api';
import { ReplayIndex } from '../../digital-twin.replay';
import { REPLAY_SPEEDS, TwinReplay, useReplayTime } from '../../digital-twin.source';
import styles from './replay.module.scss';

/** Event kinds marked on the timeline (status / condition changes are too many to mark) */
const MARKED_KINDS = new Set<SimEvent['kind']>([
  'control',
  'fault_injected',
  'fault_cleared',
  'trip',
  'alarm',
  'abnormal',
  'diagnosis',
  'anomaly',
  'fault',
  'note',
]);

/** Markers closer than this share of the track merge into one */
const BUCKETS = 240;
/** Events listed in a marker's tooltip */
const TOOLTIP_ROWS = 6;

type Tone = 'critical' | 'warning' | 'abnormal' | 'control' | 'normal' | 'note';
const TONE_RANK: Tone[] = ['critical', 'warning', 'abnormal', 'control', 'normal', 'note'];

const toneOf = (e: SimEvent): Tone => {
  const severity = (e.severity ?? '').toUpperCase();
  if (e.kind === 'trip' || e.kind === 'fault_injected' || severity === 'CRITICAL')
    return 'critical';
  if (severity === 'WARNING' || e.kind === 'alarm') return 'warning';
  if (e.kind === 'anomaly' || e.kind === 'fault' || e.kind === 'diagnosis' || e.kind === 'abnormal')
    return 'abnormal';
  if (e.kind === 'control') return 'control';
  if (e.kind === 'fault_cleared') return 'normal';
  return 'note';
};

const eventLine = (e: SimEvent & { at: number }) =>
  [
    format(e.at, 'HH:mm'),
    e.assetAlias,
    `${SIM_EVENT_KIND_LABEL[e.kind]}${e.code ? ` ${e.code}` : ''}`,
    e.message,
  ]
    .filter(Boolean)
    .join(' · ');

type Marker = { key: number; pos: number; at: number; tone: Tone; lines: string[] };

/** Events merged per track bucket, toned by the most severe one, with a tooltip listing them */
const buildMarkers = (ix: ReplayIndex): Marker[] => {
  const span = ix.end - ix.t0;
  if (span <= 0) return [];
  const buckets = new Map<number, (SimEvent & { at: number })[]>();
  ix.events.forEach((e) => {
    if (!MARKED_KINDS.has(e.kind) || e.at < ix.t0 || e.at > ix.end) return;
    const b = Math.round(((e.at - ix.t0) / span) * BUCKETS);
    const list = buckets.get(b);
    if (list) list.push(e);
    else buckets.set(b, [e]);
  });
  return [...buckets.entries()]
    .map(([b, events]) => {
      const tone = TONE_RANK.find((t) => events.some((e) => toneOf(e) === t)) ?? 'note';
      const lines = events.slice(0, TOOLTIP_ROWS).map(eventLine);
      if (events.length > TOOLTIP_ROWS) lines.push(`and ${events.length - TOOLTIP_ROWS} more`);
      return { key: b, pos: b / BUCKETS, at: events[0].at, tone, lines };
    })
    .sort((a, b) => a.at - b.at);
};

/** The marker after (`dir` 1) or before (-1) the playhead, if any */
const nextMarker = (markers: Marker[], time: number, dir: 1 | -1) =>
  dir > 0
    ? markers.find((m) => m.at > time + 1)
    : [...markers].reverse().find((m) => m.at < time - 1);

/** Hover tooltip of a timeline marker: the events it stands for, kept inside the track */
const MarkerTip = ({ marker }: { marker: Marker }) => {
  const edge = marker.pos < 0.2 ? 'start' : marker.pos > 0.8 ? 'end' : null;
  return (
    <div
      className={clsx(styles['replay-bar__tip'], edge && styles[`replay-bar__tip--${edge}`])}
      style={{ left: `${marker.pos * 100}%` }}
    >
      <TooltipContent
        position={edge ? `bottom-${edge}` : 'bottom'}
        content={marker.lines.map((line) => <div key={line}>{line}</div>)}
        className={styles['replay-bar__tip-box']}
      />
    </div>
  );
};

/** keys of the scrubber, for its tooltip */
const SCRUB_HELP =
  'Arrow keys: one sample · Page Up / Page Down: ten · [ / ]: previous / next event · Home / End: start / end';

const pad = (n: number) => String(n).padStart(2, '0');
/** "02:35:10" from ms */
const clockText = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

/**
 * Timeline of a simulation replay at the bottom of the 3D view: play / pause, speed, a scrubber
 * over the run with its events marked (click a marker to jump to it) and the simulated time.
 */
export const ReplayBar = ({ replay, index }: { replay: TwinReplay; index: ReplayIndex }) => {
  const time = useReplayTime(replay.clock);
  const markers = useMemo(() => buildMarkers(index), [index]);
  const span = index.end - index.t0;
  const pct = span > 0 ? ((time - index.t0) / span) * 100 : 0;
  const { playing, speed, seek, play, pause, setSpeed } = replay;
  const speedButtons = useRef<(HTMLButtonElement | null)[]>([]);
  /** the marker under the pointer (its events show in a tooltip) */
  const [tip, setTip] = useState<Marker | null>(null);

  /** arrows step one sample, page keys ten, [ / ] jump to the previous / next event marker,
   * Home / End go to the ends of the run */
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      const marker = nextMarker(markers, time, e.key === ']' ? 1 : -1);
      if (marker) seek(marker.at);
      return;
    }
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -10,
      PageUp: 10,
    };
    let target: number | null = null;
    if (e.key in steps) {
      // from the sample on show, so a step always moves to the neighbouring sample
      const at = index.t0 + Math.floor((time - index.t0) / index.stepMs + 1e-9) * index.stepMs;
      target = at + steps[e.key] * index.stepMs;
    } else if (e.key === 'Home') target = index.t0;
    else if (e.key === 'End') target = index.end;
    if (target === null) return;
    e.preventDefault();
    seek(target);
  };

  /** the speeds are one Tab stop; the arrow keys choose one (radio group pattern) */
  const onSpeedKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta: Record<string, number> = {
      ArrowLeft: -1,
      ArrowUp: -1,
      ArrowRight: 1,
      ArrowDown: 1,
    };
    if (!(e.key in delta)) return;
    e.preventDefault();
    const n = REPLAY_SPEEDS.length;
    const next = (REPLAY_SPEEDS.indexOf(speed) + delta[e.key] + n) % n;
    setSpeed(REPLAY_SPEEDS[next]);
    speedButtons.current[next]?.focus();
  };

  return (
    <div
      className={styles['replay-bar']}
      role="group"
      aria-label="Simulation replay timeline"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={styles['replay-bar__play']}
        aria-label={playing ? 'Pause replay' : 'Play replay'}
        title={playing ? 'Pause' : 'Play'}
        onClick={playing ? pause : play}
      >
        {playing ? <PauseFill /> : <PlayFill />}
      </button>
      <div
        className={styles['replay-bar__speeds']}
        role="radiogroup"
        aria-label="Playback speed"
        onKeyDown={onSpeedKey}
      >
        {REPLAY_SPEEDS.map((s, i) => (
          <button
            type="button"
            key={s}
            ref={(el) => {
              speedButtons.current[i] = el;
            }}
            role="radio"
            aria-checked={s === speed}
            tabIndex={s === speed ? 0 : -1}
            className={clsx(s === speed && styles['replay-bar__speed--active'])}
            title={`${s}× (${s === 1 ? 'real time' : `${s} simulated seconds per second`})`}
            onClick={() => setSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className={styles['replay-bar__track']}>
        {/* pointer targets; from the keyboard [ / ] on the scrubber jump between the events */}
        <div className={styles['replay-bar__markers']}>
          {markers.map((m) => (
            <button
              type="button"
              key={m.key}
              tabIndex={-1}
              className={clsx(
                styles['replay-bar__marker'],
                styles[`replay-bar__marker--${m.tone}`]
              )}
              style={{ left: `${m.pos * 100}%` }}
              aria-label={`Jump to ${m.lines[0]}`}
              onPointerEnter={() => setTip(m)}
              onPointerLeave={() => setTip((t) => (t?.key === m.key ? null : t))}
              onClick={() => seek(m.at)}
            />
          ))}
        </div>
        {tip ? <MarkerTip marker={tip} /> : null}
        <input
          type="range"
          className={styles['replay-bar__range']}
          style={{ '--replay-pct': `${Math.min(Math.max(pct, 0), 100)}%` } as CSSProperties}
          min={index.t0}
          max={index.end}
          step="any"
          value={time}
          aria-label="Replay position"
          aria-valuetext={format(time, 'dd MMM yyyy HH:mm:ss')}
          aria-keyshortcuts="[ ]"
          title={SCRUB_HELP}
          onChange={(e) => seek(Number(e.target.value))}
          onKeyDown={onKey}
        />
      </div>

      <div className={styles['replay-bar__time']}>
        <strong>{format(time, 'dd MMM HH:mm:ss')}</strong>
        <span>
          T+{clockText(time - index.t0)} / {clockText(span)}
        </span>
      </div>
    </div>
  );
};
