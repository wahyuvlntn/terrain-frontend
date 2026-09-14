import { Button, CONDITION_COLOR, ConditionEnum } from '@digital-twin/components';
import { Alarm, AlertAlarm, AnomalyCircle, Close, Navigate, Power } from '@digital-twin/icons';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ComponentType, ReactNode, SVGProps, useEffect, useRef, useState } from 'react';

import { getTwinLiveEvents, TwinEventKind, TwinLiveEvent } from '../../api/digital-twin.api';
import { leadsInto3D, TwinAssetTarget } from '../../digital-twin.navigation';
import { timeAgo, useNow } from '../overlay/overlay-utils';
import styles from './walk.module.scss';

/** poll interval of the feed (walk mode, live data only), and after a failed poll */
export const LIVE_EVENTS_MS = 5_000;
const LIVE_EVENTS_RETRY_MS = 60_000;
/** events kept in the recent list (and asked for per poll) */
const MAX_EVENTS = 30;
const MAX_TOASTS = 3;
/** how long a toast stays (a critical one longer) */
const TOAST_MS = { WARNING: 12_000, CRITICAL: 20_000 } as const;

export type TwinLiveEventFeed = {
  /** newest first: the last hour when walk mode started, then everything that came in since */
  events: TwinLiveEvent[];
  /** events of the latest poll that weren't known before (toasts), and that poll's sequence */
  fresh: TwinLiveEvent[];
  seq: number;
  /** the latest poll failed (the feed retries every minute) */
  isError: boolean;
};

/** One answer: `first` of its walk session `gen`; `failed` marks a failure kept quiet */
type LiveEventsAnswer = Awaited<ReturnType<typeof getTwinLiveEvents>> & {
  first: boolean;
  gen: number;
  failed: boolean;
};

const NO_FEED: Omit<TwinLiveEventFeed, 'isError'> = { events: [], fresh: [], seq: 0 };

/** a row that turned CRITICAL in place (anomaly, fault) comes again as "<kind>:<id>:critical" */
const ESCALATION_SUFFIX = ':critical';

/** The event announces that its row turned CRITICAL in place (the warning came before) */
export const isEscalation = (e: TwinLiveEvent) => e.id.endsWith(ESCALATION_SUFFIX);

/** "<kind>:<id>" of the row an event announces: an escalation's without its suffix */
const rowId = (e: TwinLiveEvent) =>
  isEscalation(e) ? e.id.slice(0, -ESCALATION_SUFFIX.length) : e.id;

/** the later of two ISO times (the second when they can't be compared) */
const later = (a: string, b: string) => (Date.parse(a) > Date.parse(b) ? a : b);

/**
 * The recent list after a poll (newest first, at most `max`) and what came in with it (`fresh`).
 * An event the list has (same id) is not news. An escalation replaces the warning of its row
 * rather than joining it: one entry, CRITICAL, on top, with the later of the two start times; the
 * warning of a row whose escalation is listed is not news either.
 */
export const mergeEvents = (
  events: readonly TwinLiveEvent[],
  incoming: readonly TwinLiveEvent[],
  max = MAX_EVENTS
): Pick<TwinLiveEventFeed, 'events' | 'fresh'> => {
  const entries = new Map(events.map((e) => [rowId(e), e]));
  let fresh: TwinLiveEvent[] = [];
  // oldest first, so an escalation also replaces a warning of the same answer
  for (const event of [...incoming].reverse()) {
    const row = rowId(event);
    const had = entries.get(row);
    if (had && !(isEscalation(event) && !isEscalation(had))) continue;
    const entry = had ? { ...event, startedAt: later(had.startedAt, event.startedAt) } : event;
    entries.set(row, entry);
    fresh = [entry, ...fresh.filter((e) => rowId(e) !== row)];
  }
  const rows = new Set(fresh.map(rowId));
  return {
    events: [...fresh, ...events.filter((e) => !rows.has(rowId(e)))].slice(0, max),
    fresh,
  };
};

/**
 * Live alarms, faults, anomalies and trips while walking (digital_twin/getliveevents): polls every
 * 5 s while `enabled`, with since = the previous answer's `now`. The first answer seeds the recent
 * list without announcing it; events of later answers are `fresh`, an escalation in place of its
 * warning (`mergeEvents`). Disabling (leaving walk mode,
 * a replay) empties the feed and resets the cursor, so a later walk starts with the last hour
 * again rather than with old events or a burst of everything missed; an answer still in flight
 * then is dropped. A failing feed retries once a minute and reports the outage once (the app's
 * error toast); the list says the feed is unavailable while it lasts.
 */
export const useTwinLiveEvents = (enabled: boolean): TwinLiveEventFeed => {
  /** walk session: bumped whenever the feed is disabled */
  const session = useRef(0);
  const since = useRef<string | undefined>(undefined);
  /** the current outage was reported */
  const failing = useRef(false);
  const [feed, setFeed] = useState(NO_FEED);
  const { data, dataUpdatedAt, isError } = useQuery({
    queryKey: ['DIGITAL_TWIN_LIVE_EVENTS'] as const,
    queryFn: async (): Promise<LiveEventsAnswer> => {
      const gen = session.current;
      const first = since.current === undefined;
      try {
        const res = await getTwinLiveEvents({ since: since.current, limit: MAX_EVENTS });
        if (gen === session.current) {
          since.current = res.now;
          failing.current = false;
        }
        return { ...res, first, gen, failed: false };
      } catch (error) {
        // the first failure goes to the app's error toast; later ones of the outage stay quiet
        if (!failing.current) {
          failing.current = true;
          throw error;
        }
        return { now: '', events: [], first, gen, failed: true };
      }
    },
    enabled,
    refetchInterval: (query) =>
      enabled
        ? query.state.status === 'error' || query.state.data?.failed
          ? LIVE_EVENTS_RETRY_MS
          : LIVE_EVENTS_MS
        : false,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { toastId: 'DIGITAL_TWIN_LIVE_EVENTS' },
  });

  useEffect(() => {
    if (enabled) return;
    session.current += 1;
    since.current = undefined;
    failing.current = false;
    setFeed((f) => (f.events.length || f.fresh.length ? { ...NO_FEED, seq: f.seq + 1 } : f));
  }, [enabled]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: one merge per answer (dataUpdatedAt), not per render
  useEffect(() => {
    if (!data || !enabled || data.failed || data.gen !== session.current) return;
    setFeed((prev) => {
      const { events, fresh } = mergeEvents(prev.events, data.events);
      return { events, fresh: data.first ? [] : fresh, seq: prev.seq + 1 };
    });
  }, [dataUpdatedAt]);

  const quietFailure = !!data?.failed && data.gen === session.current;
  return { ...feed, isError: enabled && (isError || quietFailure) };
};

/**
 * The event G teleports to: the newest whose equipment (or the room holding it) is in 3D. One on
 * equipment without a 3D model (an MAU, a dry pump) has nowhere to go.
 */
export const eventToVisit = (
  events: readonly TwinLiveEvent[],
  targetOf: (alias: string) => TwinAssetTarget | 'wait'
) => events.find((e) => leadsInto3D(targetOf(e.asset.alias)));

const KIND: Record<TwinEventKind, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> =
  {
    alarm: { label: 'Alarm', Icon: Alarm },
    fault: { label: 'Fault', Icon: AlertAlarm },
    anomaly: { label: 'Anomaly', Icon: AnomalyCircle },
    trip: { label: 'Trip', Icon: Power },
  };

const severityColor = (e: TwinLiveEvent) =>
  CONDITION_COLOR[
    e.severity === 'CRITICAL' ? ConditionEnum.enum.CRITICAL : ConditionEnum.enum.WARNING
  ];

/** Teleport button state of an event: where it leads, or why it can't */
const teleportHint = (target: TwinAssetTarget | 'wait') => {
  if (target === 'wait') return { enabled: false, title: 'Loading the equipment list…' };
  if (target.kind === 'equipment') return { enabled: true, title: `Go to ${target.alias}` };
  if (target.kind === 'location')
    return { enabled: true, title: `${target.note}: go to its room instead` };
  return { enabled: false, title: target.note };
};

type EventRowProps = {
  event: TwinLiveEvent;
  now: number;
  target: TwinAssetTarget | 'wait';
  onTeleport: (alias: string) => void;
  /** the event G teleports to (the newest one in 3D) */
  newest?: boolean;
  /** how often it came in (a toast counts repeats) */
  count?: number;
  onDismiss?: () => void;
};

/** One event: kind icon, severity colour, equipment, title and detail, time, Teleport */
const EventRow = ({ event, now, target, onTeleport, newest, count, onDismiss }: EventRowProps) => {
  const { label, Icon } = KIND[event.kind];
  const hint = teleportHint(target);
  const escalated = isEscalation(event);
  return (
    <div
      className={styles['walk-event']}
      style={{ ['--event-color' as string]: severityColor(event) }}
      data-severity={event.severity}
    >
      <span
        className={styles['walk-event__icon']}
        title={`${label} · ${escalated ? 'escalated to ' : ''}${event.severity}`}
      >
        <Icon aria-hidden="true" />
      </span>
      <div className={styles['walk-event__body']}>
        <div className={styles['walk-event__meta']}>
          <strong>{event.asset.alias}</strong>
          {count && count > 1 ? (
            <em className={styles['walk-event__count']} title={`Came in ${count} times`}>
              ×{count}
            </em>
          ) : null}
          {escalated ? (
            <em
              className={styles['walk-event__escalated']}
              title={`This ${label.toLowerCase()} was a warning and turned critical`}
            >
              Escalated to critical
            </em>
          ) : null}
          <span>
            {label} · {format(new Date(event.startedAt), 'HH:mm:ss')} ·{' '}
            {timeAgo(event.startedAt, now)}
          </span>
        </div>
        <div className={styles['walk-event__title']} title={event.title}>
          {event.title}
        </div>
        {/* a model alarm is named by its code (CHS-002): its message says what happened */}
        {event.detail && event.detail !== event.title ? (
          <div className={styles['walk-event__detail']} title={event.detail}>
            {event.detail}
          </div>
        ) : null}
        <div className={styles['walk-event__asset']}>{event.asset.name}</div>
      </div>
      <div className={styles['walk-event__actions']}>
        <Button
          icon={<Navigate />}
          color="default-secondary"
          className={styles['walk-btn']}
          disabled={!hint.enabled}
          title={hint.title}
          aria-label={`Teleport to ${event.asset.alias}${hint.enabled ? '' : ` (${hint.title})`}`}
          onClick={() => onTeleport(event.asset.alias)}
        >
          Teleport
          {newest ? <kbd className={styles['walk-key']}>G</kbd> : null}
        </Button>
        {onDismiss ? (
          <button
            type="button"
            className={styles['walk-event__dismiss']}
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <Close />
          </button>
        ) : null}
      </div>
    </div>
  );
};

type EventsProps = {
  feed: TwinLiveEventFeed;
  targetOf: (alias: string) => TwinAssetTarget | 'wait';
  onTeleport: (alias: string) => void;
};

/** `count` = the rows ("<kind>:<id>") the toast has announced (`rows`) */
export type WalkToastItem = {
  key: string;
  event: TwinLiveEvent;
  count: number;
  rows: readonly string[];
};

/** repeats of an event (same equipment, kind and title: a flapping alarm) share one toast */
const toastKey = (e: TwinLiveEvent) => `${e.asset.alias}|${e.kind}|${e.title}`;

/**
 * The toasts after a poll: each fresh event on top, a repeat replacing its toast with a count. An
 * escalation takes over the toast of its own warning; its row was counted already (also when a
 * later row of the same title, e.g. another detector's anomaly, shows on the toast by then).
 */
export const addToasts = (
  toasts: readonly WalkToastItem[],
  fresh: readonly TwinLiveEvent[]
): WalkToastItem[] => {
  let next = [...toasts];
  // oldest first, so the newest ends on top
  for (const event of [...fresh].reverse()) {
    const key = toastKey(event);
    const row = rowId(event);
    const counted = next.find((t) => t.key === key)?.rows ?? [];
    const rows = counted.includes(row) ? counted : [...counted, row];
    next = [
      { key, event, count: rows.length, rows },
      ...next.filter((t) => t.key !== key && rowId(t.event) !== row),
    ];
  }
  return next.slice(0, MAX_TOASTS);
};

/**
 * Toast for every event that came in while walking (newest on top, at most 3, repeats counted on
 * one toast), auto-dismissed
 */
export const WalkEventToasts = ({ feed, targetOf, onTeleport }: EventsProps) => {
  const now = useNow(5000);
  const [toasts, setToasts] = useState<WalkToastItem[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: new toasts once per poll (seq)
  useEffect(() => {
    if (!feed.fresh.length) return;
    setToasts((prev) => addToasts(prev, feed.fresh));
  }, [feed.seq]);

  const dismiss = (key: string) => setToasts((prev) => prev.filter((t) => t.key !== key));
  const goId = eventToVisit(feed.events, targetOf)?.id;

  return (
    <section className={styles['walk-toasts']} aria-live="polite" aria-label="Live events">
      {toasts.map(({ key, event, count }) => (
        <WalkToast key={key} event={event} onExpire={() => dismiss(key)}>
          <EventRow
            event={event}
            now={now}
            target={targetOf(event.asset.alias)}
            newest={event.id === goId}
            count={count}
            onTeleport={(alias) => {
              dismiss(key);
              onTeleport(alias);
            }}
            onDismiss={() => dismiss(key)}
          />
        </WalkToast>
      ))}
    </section>
  );
};

/**
 * Toast frame: leaves after its time (counted again from a repeat or an escalation), paused under
 * the pointer
 */
const WalkToast = ({
  event,
  onExpire,
  children,
}: {
  event: TwinLiveEvent;
  onExpire: () => void;
  children: ReactNode;
}) => {
  const [hover, setHover] = useState(false);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  // biome-ignore lint/correctness/useExhaustiveDependencies: event.id: a repeat or an escalation restarts the time
  useEffect(() => {
    if (hover) return;
    const timer = setTimeout(() => expire.current(), TOAST_MS[event.severity]);
    return () => clearTimeout(timer);
  }, [hover, event.severity, event.id]);
  return (
    <div
      className={clsx(styles['walk-toast'], styles['walk-panel'])}
      style={{ ['--event-color' as string]: severityColor(event) }}
      role="status"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {children}
    </div>
  );
};

/** Recent events (the last hour, plus everything since walk mode started), newest first */
export const WalkEventList = ({ feed, targetOf, onTeleport }: EventsProps) => {
  const now = useNow(5000);
  const goId = eventToVisit(feed.events, targetOf)?.id;
  return (
    <div className={styles['walk-list']}>
      {feed.events.length ? (
        feed.events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            now={now}
            target={targetOf(event.asset.alias)}
            newest={event.id === goId}
            onTeleport={onTeleport}
          />
        ))
      ) : feed.isError ? (
        <div className={styles['walk-list__empty']}>
          Live events are unavailable right now: retrying every minute
        </div>
      ) : (
        <div className={styles['walk-list__empty']}>
          No alarms, faults, anomalies or trips in the last hour
        </div>
      )}
    </div>
  );
};
