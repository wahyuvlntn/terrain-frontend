import { useEffect, useState } from 'react';

/** Current time, refreshed every `ms` (live elapsed timers). */
export const useNow = (ms = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** "3d 4h 12m", "2h 05m 09s", "4m 02s" since `fromIso` */
export const formatElapsed = (fromIso: string | null | undefined, now: number) => {
  if (!fromIso) return '--';
  let s = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 1000));
  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  s %= 60;
  if (d) return `${d}d ${h}h ${pad(m)}m`;
  if (h) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
};

/** "12 s ago", "5 min ago", "3 h ago", "2 d ago" */
export const timeAgo = (iso: string | null | undefined, now: number) => {
  if (!iso) return '--';
  const s = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

export const titleCase = (s: string | null | undefined) =>
  s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : 'No data';

/** Western Electric / Nelson rule ids of the backend engine */
export const SPC_RULE_LABEL: Record<string, string> = {
  SPC_OUT_OF_SPEC: 'Outside specification limits',
  SPC_OUT_OF_CONTROL: 'Beyond control limits (3σ)',
  SPC_2_OUT_OF_3_POINTS_ZONE_A_OR_BEYOND: '2 of 3 points beyond 2σ',
  SPC_4_OUT_OF_5_POINTS_ZONE_B_OR_BEYOND: '4 of 5 points beyond 1σ',
  SPC_8_POINTS_ZONE_A: '8 points in a row beyond 1σ',
  SPC_7_POINTS_MONOTONIC: '7-point trend',
  SPC_14_POINTS_ALTERNATING: '14 points alternating',
  SPC_15_POINTS_ZONE_C: '15 points within 1σ (stratification)',
};

export const fmt = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || Number.isNaN(v) ? '--' : v.toFixed(digits);

/** A stretch of a trend window (epoch ms) */
export type TimeSpan = { start: number; end: number };

/**
 * Consecutive not-running samples of a trend merged into time spans (points sorted by time).
 * A span reaches half-way to the neighbouring running samples, so a single stopped sample stays
 * visible and the spans meet the running stretches without gaps. Spans end at the window edges.
 */
export const notRunningSpans = (points: { timestamp: string; running: boolean }[]) => {
  const t = points.map((p) => Date.parse(p.timestamp));
  const last = points.length - 1;
  const spans: TimeSpan[] = [];
  let first = -1;
  points.forEach((p, i) => {
    if (p.running) return;
    if (first < 0) first = i;
    if (i < last && !points[i + 1].running) return;
    spans.push({
      start: first > 0 ? (t[first - 1] + t[first]) / 2 : t[first],
      end: i < last ? (t[i] + t[i + 1]) / 2 : t[i],
    });
    first = -1;
  });
  return spans;
};
