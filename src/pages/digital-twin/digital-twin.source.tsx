/**
 * Data source of the digital twin: the live plant (default) or the replay of a simulation job.
 *
 * Every time-dependent twin view reads its data through the hooks of digital-twin.queries.ts,
 * which ask this context where the data comes from. Without a `?replay=<job>` URL parameter the
 * source is LIVE_SOURCE and the twin polls the backend exactly as before. With it, the
 * ReplayProvider loads the job's frames once and the hooks synthesise the twin's data at the
 * playhead, which the timeline bar plays, pauses and scrubs.
 */
import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  getFrames,
  getJob,
  SIM_ACTIVE_STATUSES,
  SIM_QUERY,
  SimJobDetail,
} from '../simulation/api/simulation.api';
import { PLANT_ALIASES, TWIN_NODE_OF_ASSET } from './digital-twin.bms';
import { buildReplayIndex, ReplayIndex, stepAt } from './digital-twin.replay';

export const REPLAY_PARAM = 'replay';
export const VARIANT_PARAM = 'variant';
/** initial playhead of a replay deep link (UTC ISO) */
export const TIME_PARAM = 't';

/** Playback speeds of the timeline (simulated seconds per real second) */
export const REPLAY_SPEEDS = [1, 10, 60] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

/** Equipment the twin shows (3D models and the BMS overview): the frames are loaded for these */
const REPLAY_ALIASES: readonly string[] = [
  ...new Set([...TWIN_NODE_OF_ASSET.keys(), ...PLANT_ALIASES]),
].sort();

/** Playhead refresh while playing (real ms) */
const TICK_MS = 250;
/** While playing, trends follow the playhead this often (real ms), like the live trend poll */
const TREND_FOLLOW_MS = 10_000;
/** A seek settles (trends refetch) once the playhead rests this long */
const SEEK_SETTLE_MS = 400;
/** A replayed job that is still queued, running or being analysed is read again this often */
export const JOB_POLL_MS = 5_000;

/**
 * Playhead of a replay (epoch ms of simulated time), clamped to the run. An external store, so
 * only views that show the running time re-render on every tick; data views follow the step.
 */
export class ReplayClock {
  private time = 0;
  private min = 0;
  private max = 0;
  private readonly listeners = new Set<() => void>();

  getTime = () => this.time;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** the playable span; the playhead is kept inside it */
  setRange(min: number, max: number) {
    this.min = min;
    this.max = Math.max(min, max);
    this.set(this.time);
  }

  get start() {
    return this.min;
  }

  get end() {
    return this.max;
  }

  atEnd() {
    return this.time >= this.max;
  }

  seek(t: number) {
    this.set(t);
  }

  advance(ms: number) {
    this.set(this.time + ms);
  }

  private set(t: number) {
    const clamped = Math.min(Math.max(t, this.min), this.max);
    if (clamped === this.time) return;
    this.time = clamped;
    this.listeners.forEach((l) => l());
  }
}

export type TwinReplay = {
  jobId: number | null;
  job?: SimJobDetail;
  /** variant on show (requested in the URL, else the job's first) */
  variant: string | null;
  /** frames of the variant on show, indexed; undefined while loading or on error */
  index?: ReplayIndex;
  /** loading the job or the frames (also while switching variant) */
  isLoading: boolean;
  /** why the replay can't be shown */
  error: string | null;
  clock: ReplayClock;
  /** sample shown at the playhead */
  step: number;
  playing: boolean;
  speed: ReplaySpeed;
  /**
   * Playhead the trends are computed at (epoch ms): it settles when playback pauses, a seek rests,
   * and every 10 s while playing, so trends aren't refetched on every tick.
   */
  trendAt: number | null;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: ReplaySpeed) => void;
  seek: (t: number) => void;
  setVariant: (variant: string) => void;
  /** back to the live twin */
  exit: () => void;
};

export type TwinSource =
  | {
      mode: 'live';
      /** appended to the twin's query keys, so live and replay caches never mix */
      key: 'live';
      /** poll the backend (live only) */
      poll: true;
      replay: null;
    }
  | { mode: 'replay'; key: string; poll: false; replay: TwinReplay };

export const LIVE_SOURCE: TwinSource = { mode: 'live', key: 'live', poll: true, replay: null };

const TwinSourceContext = createContext<TwinSource>(LIVE_SOURCE);

export const useTwinSource = () => useContext(TwinSourceContext);

const NO_SUBSCRIBE = () => () => undefined;

/**
 * Current time, refreshed every `ms`: the wall clock live, the playhead (in steps of `ms`) in a
 * replay. Drives elapsed timers and "x ago" labels of the twin's dashboards.
 */
export const useTwinNow = (ms = 1000) => {
  const clock = useTwinSource().replay?.clock;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (clock) return;
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms, clock]);
  const played = useSyncExternalStore(clock ? clock.subscribe : NO_SUBSCRIBE, () =>
    clock ? Math.floor(clock.getTime() / ms) * ms : 0
  );
  return clock ? played : now;
};

/** The running playhead (epoch ms), re-rendering on every tick: for the timeline and banner */
export const useReplayTime = (clock: ReplayClock) =>
  useSyncExternalStore(clock.subscribe, clock.getTime);

const errorText = (e: unknown) => (e instanceof Error && e.message ? e.message : String(e));

/**
 * Provides the twin's data source: live, or the replay of `?replay=<job>&variant=<name>&t=<iso>`.
 * Always rendered (live or not), so entering or leaving a replay never remounts the 3D viewer.
 */
export const ReplayProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const replayParam = searchParams.get(REPLAY_PARAM);
  const active = replayParam !== null;
  const jobId = replayParam && /^\d+$/.test(replayParam) ? Number(replayParam) : null;
  const variantParam = searchParams.get(VARIANT_PARAM) || null;
  const timeParam = searchParams.get(TIME_PARAM);

  const job = useQuery({
    queryKey: SIM_QUERY.job(jobId ?? 0),
    queryFn: () => getJob(jobId as number),
    enabled: jobId !== null,
    staleTime: 60_000,
    // a job still on its way follows its status (the banner, then its frames once recorded)
    refetchInterval: (query) =>
      query.state.data && SIM_ACTIVE_STATUSES.includes(query.state.data.status)
        ? JOB_POLL_MS
        : false,
    // never another job's data while a new one loads (overrides the app's keepPreviousData)
    placeholderData: undefined,
    refetchOnWindowFocus: false,
  });
  const variant = variantParam ?? job.data?.variants[0] ?? null;
  // frames read while the run was queued or running are read again as it moves on (its status is
  // in the key); a finished run is read once. The frames wait for the job: read before its status
  // is known (a deep link naming the variant), a running job's partial frames would be cached as
  // the recorded ones and stay on show after the run finishes
  const status = job.data?.status;
  const run = status === 'QUEUED' || status === 'RUNNING' ? status : 'recorded';
  const frames = useQuery({
    queryKey: [...SIM_QUERY.frames(jobId ?? 0, variant ?? ''), REPLAY_ALIASES.join(','), run],
    queryFn: () =>
      getFrames({ jobId: jobId as number, variant: variant ?? undefined, aliases: REPLAY_ALIASES }),
    // the job names the default variant (a job without variants falls back to the backend
    // default) and its status keys the frames, for every variant
    enabled: jobId !== null && job.isSuccess,
    // recorded frames don't change once the run has finished
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    // another variant's frames stay on show while the requested one loads, another job's don't
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === jobId ? previous : undefined,
    refetchOnWindowFocus: false,
  });
  const index = useMemo(
    () => (frames.data ? buildReplayIndex(frames.data) : undefined),
    [frames.data]
  );

  const clock = useMemo(() => new ReplayClock(), []);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [trendAt, setTrendAt] = useState<number | null>(null);
  const settle = useCallback(() => setTrendAt(clock.getTime()), [clock]);

  // a new job starts paused
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on a job change only
  useEffect(() => {
    setPlaying(false);
    setTrendAt(null);
  }, [jobId]);

  // fit the playhead to the frames: a new job (or deep-link time) starts at `t` or the run start;
  // switching variant keeps the playhead
  const positioned = useRef<string | null>(null);
  useEffect(() => {
    if (!index) return;
    clock.setRange(index.t0, index.end);
    const target = `${index.jobId}|${timeParam ?? ''}`;
    if (positioned.current !== target) {
      positioned.current = target;
      const t = timeParam ? Date.parse(timeParam) : Number.NaN;
      clock.seek(Number.isFinite(t) ? t : index.t0);
    }
    settle();
  }, [index, timeParam, clock, settle]);

  // playback: advance by the real time elapsed × speed, stop at the end
  useEffect(() => {
    if (!playing || !index) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      clock.advance((now - last) * speed);
      last = now;
      if (clock.atEnd()) setPlaying(false);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing, speed, index, clock]);

  // trends follow playback every few seconds, and settle at once when it stops (once the frames
  // have placed the playhead: before that there is nothing to compute a trend at)
  const ready = !!index;
  useEffect(() => {
    if (!ready) return;
    if (!playing) {
      settle();
      return;
    }
    const timer = window.setInterval(settle, TREND_FOLLOW_MS);
    return () => window.clearInterval(timer);
  }, [ready, playing, settle]);

  const seekTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(seekTimer.current), []);
  const seek = useCallback(
    (t: number) => {
      clock.seek(t);
      window.clearTimeout(seekTimer.current);
      seekTimer.current = window.setTimeout(settle, SEEK_SETTLE_MS);
    },
    [clock, settle]
  );
  const play = useCallback(() => {
    // playing from the end starts over
    if (clock.atEnd()) clock.seek(clock.start);
    setPlaying(true);
  }, [clock]);
  const pause = useCallback(() => setPlaying(false), []);

  const step = useSyncExternalStore(clock.subscribe, () =>
    index ? stepAt(index, clock.getTime()) : 0
  );

  const setVariant = useCallback(
    (name: string) =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(VARIANT_PARAM, name);
        return next;
      }),
    [setSearchParams]
  );
  const exit = useCallback(() => {
    setPlaying(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      [REPLAY_PARAM, VARIANT_PARAM, TIME_PARAM].forEach((k) => next.delete(k));
      return next;
    });
  }, [setSearchParams]);

  let error: string | null = null;
  if (active && jobId === null) error = 'This replay link is not valid';
  else if (job.isError) error = errorText(job.error);
  else if (frames.isError) error = errorText(frames.error);
  else if (index && index.steps === 0) {
    error = job.data
      ? `Simulation #${jobId} has no recorded frames (${job.data.status.toLowerCase()})`
      : `Simulation #${jobId} has no recorded frames`;
  }
  const isLoading =
    !error && (job.isLoading || frames.isLoading || frames.isPlaceholderData || !index);
  // an index of another variant (kept while the requested one loads) is still shown
  const shownIndex = index && index.steps > 0 && !error ? index : undefined;

  const source = useMemo<TwinSource>(() => {
    if (!active) return LIVE_SOURCE;
    return {
      mode: 'replay',
      key: `replay:${jobId ?? 'invalid'}:${shownIndex?.variant ?? variant ?? ''}`,
      poll: false,
      replay: {
        jobId,
        job: job.data,
        variant: shownIndex?.variant ?? variant,
        index: shownIndex,
        isLoading,
        error,
        clock,
        step,
        playing,
        speed,
        trendAt,
        play,
        pause,
        setSpeed,
        seek,
        setVariant,
        exit,
      },
    };
  }, [
    active,
    jobId,
    job.data,
    variant,
    shownIndex,
    isLoading,
    error,
    clock,
    step,
    playing,
    speed,
    trendAt,
    play,
    pause,
    seek,
    setVariant,
    exit,
  ]);

  return <TwinSourceContext.Provider value={source}>{children}</TwinSourceContext.Provider>;
};
