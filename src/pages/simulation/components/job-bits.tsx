import { Badge } from '@digital-twin/components';
import { format } from 'date-fns';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';

import { SimJob, SimJobOrigin, SimJobStatus } from '../api/simulation.api';
import styles from '../simulation.module.scss';

export const STATUS_LABEL: Record<SimJobStatus, string> = {
  PROPOSED: 'Needs approval',
  QUEUED: 'Queued',
  RUNNING: 'Running',
  ANALYZING: 'Analyzing',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const ORIGIN_LABEL: Record<SimJobOrigin, string> = {
  ui: 'User',
  agent: 'AI assistant',
  optimizer: 'Optimizer',
  analytics: 'Analytics',
};

export type BadgeColor = NonNullable<ComponentProps<typeof Badge>['color']>;

/** Badge colour of a job status (the app's status / condition palette) */
export const STATUS_BADGE: Record<SimJobStatus, BadgeColor> = {
  PROPOSED: 'warning',
  QUEUED: 'secondary',
  RUNNING: 'primary',
  ANALYZING: 'primary',
  SUCCEEDED: 'normal',
  FAILED: 'critical',
  REJECTED: 'offline',
  CANCELLED: 'offline',
};

export const StatusBadge = ({
  status,
  progress,
}: {
  status: SimJobStatus;
  /** fraction done, shown while running */
  progress?: number;
}) => (
  <Badge color={STATUS_BADGE[status]} className={styles.badge}>
    {STATUS_LABEL[status]}
    {status === 'RUNNING' && progress !== undefined ? ` ${Math.round(progress * 100)} %` : ''}
  </Badge>
);

export const OriginBadge = ({ origin }: { origin: SimJobOrigin }) => (
  <Badge color="secondary" fillVariant="outlined" className={styles.badge}>
    {ORIGIN_LABEL[origin]}
  </Badge>
);

/** Run progress of a running job (fraction 0..1) */
export const Progress = ({ value }: { value: number }) => (
  <span
    className={styles.progress}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(value * 100)}
    aria-label="Simulation progress"
  >
    <span style={{ width: `${Math.round(value * 100)}%` }} />
  </span>
);

/** Centred short message of an empty, loading or failed region */
export const Empty = ({ children, error }: { children: ReactNode; error?: boolean }) => (
  <div className={error ? styles['empty--error'] : styles.empty} role={error ? 'alert' : undefined}>
    {children}
  </div>
);

/** "11 Oct 14:30" (local), or "--" */
export const fmtTime = (iso: string | null | undefined, pattern = 'dd MMM HH:mm') =>
  iso ? format(Date.parse(iso), pattern) : '--';

/** "4 h", "1 h 30 min", "45 min" */
export const durationText = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '--';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/** Length of the simulated window of a job, in minutes */
export const jobMinutes = (job: Pick<SimJob, 'simStart' | 'simEnd'>) =>
  job.simStart && job.simEnd ? (Date.parse(job.simEnd) - Date.parse(job.simStart)) / 60_000 : null;

/** "+1:30" offset from the start of a run */
export const offsetText = (minutes: number) => {
  const sign = minutes < 0 ? '−' : '+';
  const m = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};

/** "+1.5 °C", "−0.3 °C", "±0.0 °C" */
export const signed = (v: number | null | undefined, unit: string, digits = 1) =>
  v === null || v === undefined
    ? '--'
    : `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(digits)}${unit ? ` ${unit}` : ''}`;

export const errorText = (e: unknown) =>
  e instanceof Error && e.message ? e.message : 'Something went wrong';

/**
 * Table rows that fit the height of `box` (header included), following its size: the page size
 * of a paged table that should not scroll. `fallback` until the box is measured.
 */
export const useRowsThatFit = (
  box: HTMLElement | null,
  rowPx: number,
  headerPx: number,
  fallback = 10
) => {
  const [rows, setRows] = useState(fallback);
  useEffect(() => {
    if (!box) return;
    const measure = () => {
      const h = box.clientHeight;
      if (h > 0) setRows(Math.max(Math.floor((h - headerPx) / rowPx), 1));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [box, rowPx, headerPx]);
  return rows;
};
