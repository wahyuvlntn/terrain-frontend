import { useEffect, useState } from 'react';

import {
  NOTIFICATIONS_EVENT,
  NotificationType,
} from '../../../shared/components/lib/feat/notification/notification.api';
import { LevoPart, PARTS, partPaths } from './levo.art';
import styles from './levo.module.scss';

/**
 * busy: answering; unread: an answer waits; drag: being moved; warning / critical: a fault or a
 * trip just came in
 */
export type LevoMood = 'idle' | 'busy' | 'unread' | 'drag' | 'warning' | 'critical';

export type LevoAlert = { level: 'warning' | 'critical'; label: string; text: string; at: number };

/** how long LEVO reacts to a fault or a trip */
export const LEVO_ALERT_MS = 8_000;

/**
 * LEVO's reaction to a notification that just came in: equipment that went down unplanned (a
 * trip) or an alarm (FDD faults are raised as alarms named after their rule); null for the rest.
 */
export const levoAlertOf = (
  n: Pick<NotificationType, 'category' | 'assetAlias' | 'additionalData'>
): Omit<LevoAlert, 'at'> | null => {
  const who = n.assetAlias || 'Equipment';
  if (n.category === 'STATUS_DOWN')
    return { level: 'critical', label: 'Unplanned down', text: who };
  if (n.category !== 'ALARM_CRITICAL' && n.category !== 'ALARM_WARNING') return null;
  let name = '';
  try {
    name = String(JSON.parse(n.additionalData ?? 'null')?.alarm_name ?? '');
  } catch {
    // no alarm name
  }
  return {
    level: n.category === 'ALARM_CRITICAL' ? 'critical' : 'warning',
    label: 'Fault',
    text: name ? `${who} · ${name}` : who,
  };
};

/**
 * The fault or trip LEVO reacts to, for LEVO_ALERT_MS after it came in (NOTIFICATIONS_EVENT):
 * of several at once the newest critical one, else the newest.
 */
export const useLevoAlert = () => {
  const [alert, setAlert] = useState<LevoAlert | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const onNotifications = (e: Event) => {
      const alerts = ((e as CustomEvent<NotificationType[]>).detail ?? [])
        .flatMap((n) => levoAlertOf(n) ?? [])
        .reverse();
      const top = alerts.find((a) => a.level === 'critical') ?? alerts[0];
      if (!top) return;
      setAlert({ ...top, at: Date.now() });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAlert(null), LEVO_ALERT_MS);
    };
    window.addEventListener(NOTIFICATIONS_EVENT, onNotifications);
    return () => {
      window.removeEventListener(NOTIFICATIONS_EVENT, onNotifications);
      window.clearTimeout(timer);
    };
  }, []);
  return alert;
};

/** every part of the sprite as paths, once */
const PATHS = Object.fromEntries(
  Object.entries(PARTS).map(([name, part]) => [name, partPaths(part)])
) as Record<LevoPart, ReturnType<typeof partPaths>>;

const Part = ({ name }: { name: LevoPart }) => (
  <g className={styles[name]}>
    {PATHS[name].map(({ fill, d }) => (
      <path key={fill} d={d} style={{ fill }} />
    ))}
  </g>
);

/** expressions and effects, shown by mood */
const FACE: LevoPart[] = [
  'eyesOpen',
  'eyesClosed',
  'eyesHappy',
  'eyesSquint',
  'eyesWide',
  'eyesUp',
  'smile',
  'grin',
  'gasp',
  'scream',
  'blush',
  'sweat',
  'bang',
  'bang2',
  'signalA',
  'signalB',
  'bubble',
  'dot1',
  'dot2',
  'dot3',
];

/**
 * LEVO (Leviathan + bot), the assistant: a pixel-art sea dragon with an antenna. It plays its mood
 * like a GIF (levo.module.scss): idle it bobs, blinks and looks around; hovered it beams; dragged
 * it wiggles; thinking (answering) its eyes wander, its antenna sends and a bubble types; with a
 * new answer it hops; a fault or a trip scares it.
 * Decorative: the control around it says what it does.
 */
export const Levo = ({ mood = 'idle' }: { mood?: LevoMood }) => (
  <svg
    className={styles.levo}
    viewBox="0 0 32 32"
    shapeRendering="crispEdges"
    data-mood={mood}
    aria-hidden="true"
    focusable="false"
  >
    <Part name="shadow" />
    <g className={styles.sprite}>
      <Part name="tailA" />
      <Part name="tailB" />
      <g className={styles.fins}>
        <Part name="finL" />
        <Part name="finR" />
      </g>
      <Part name="stalk" />
      <Part name="bulb" />
      <Part name="head" />
      <Part name="body" />
      <Part name="flipL" />
      <Part name="flipR" />
      {FACE.map((name) => (
        <Part key={name} name={name} />
      ))}
    </g>
  </svg>
);
