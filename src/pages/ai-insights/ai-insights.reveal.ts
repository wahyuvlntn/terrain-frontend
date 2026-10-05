import { useEffect, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router-dom';

import { FAULT_STATUS_OPTIONS, WINDOW_OPTIONS } from './ai-insights.utils';
import {
  Anomaly,
  DetectionStatus,
  Detector,
  DetectorEnum,
  Fault,
  Recommendation,
} from './api/ai-insights.api';

/**
 * Deep links select an item whatever the tab's filters list (`?tab=faults&fault=12` from the
 * assistant, the overview or a bookmark, e.g. a cleared fault under the default Active filter).
 * The `reveal*` functions give the filters widened just enough to list the item (null when they
 * already list it); `useRevealSelection` applies them once per link.
 */

/** Filters of the faults and anomalies tabs */
export type DetectionFilter = {
  status: DetectionStatus | '';
  assetId: string;
  /** window of the rows that are not active (hours, a `WINDOW_OPTIONS` value) */
  hours: string;
};
export type FaultFilter = DetectionFilter & { rule: string };
export type AnomalyFilter = DetectionFilter & { detector: Detector | '' };
export type RecommendationFilter = { status: string };
/** The faults tab's URL filters: its filters and the list or timeline display */
export type FaultUrlFilter = FaultFilter & { view: 'list' | 'timeline' };

/*
 * The tabs' filters live in the URL (assistant links, reload). Only one tab is mounted and a tab
 * switch clears the params, so the tabs share `status`, `asset` and `hours`. Unknown values fall
 * back to the defaults; defaults are left out of the URL.
 */

export const oneOf = <T extends string>(
  raw: string | null,
  values: readonly T[],
  fallback: T
): T => ((values as readonly string[]).includes(raw ?? '') ? (raw as T) : fallback);

/** A trimmed text of at most `max` characters, else '' */
export const urlText = (raw: string | null, max: number) => {
  const text = raw?.trim() ?? '';
  return text.length <= max ? text : '';
};

const urlId = (raw: string | null) => (raw && /^\d+$/.test(raw) ? raw : '');

/** `params` with each `[key, value, default]` set, or removed when it is empty or the default */
export const withFilters = (params: URLSearchParams, entries: [string, string, string][]) => {
  const next = new URLSearchParams(params);
  for (const [key, value, fallback] of entries) {
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
  }
  return next;
};

const STATUSES = FAULT_STATUS_OPTIONS.map((o) => o.value);
const WINDOWS = WINDOW_OPTIONS.map((w) => w.value);

const detectionFromUrl = (params: URLSearchParams, hours: string): DetectionFilter => {
  const status = params.get('status');
  return {
    status: status === 'all' ? '' : oneOf(status, STATUSES, 'ACTIVE'),
    assetId: urlId(params.get('asset')),
    hours: oneOf(params.get('hours'), WINDOWS, hours),
  };
};

const detectionEntries = (f: DetectionFilter, hours: string): [string, string, string][] => [
  // absent is Active: All is written out
  ['status', f.status || 'all', 'ACTIVE'],
  ['asset', f.assetId, ''],
  ['hours', f.hours, hours],
];

export const faultFilterFromUrl = (params: URLSearchParams): FaultUrlFilter => ({
  ...detectionFromUrl(params, '168'),
  rule: urlText(params.get('rule'), 20),
  view: oneOf(params.get('display'), ['list', 'timeline'] as const, 'list'),
});

export const faultFilterToUrl = (params: URLSearchParams, f: FaultUrlFilter) =>
  withFilters(params, [
    ...detectionEntries(f, '168'),
    ['rule', f.rule, ''],
    ['display', f.view, 'list'],
  ]);

export const anomalyFilterFromUrl = (params: URLSearchParams): AnomalyFilter => ({
  ...detectionFromUrl(params, '24'),
  detector: oneOf<Detector | ''>(params.get('detector'), DetectorEnum.options, ''),
});

export const anomalyFilterToUrl = (params: URLSearchParams, f: AnomalyFilter) =>
  withFilters(params, [...detectionEntries(f, '24'), ['detector', f.detector, '']]);

type Detection = Pick<Fault, 'status' | 'assetId' | 'endedAt'>;

const HOUR = 3_600_000;

/** The same filter values (filters are flat records of strings) */
export const sameFilter = <F extends object>(a: F, b: F) =>
  (Object.keys(a) as (keyof F)[]).every((k) => a[k] === b[k]);

const widenDetection = <F extends DetectionFilter>(filter: F, item: Detection, now: number) => {
  const out = { ...filter };
  if (out.status && out.status !== item.status) out.status = '';
  if (out.assetId && Number(out.assetId) !== item.assetId) out.assetId = '';
  // active rows are listed whatever their start; the window keeps the rows that ended in it (an
  // hour to spare: the list's window starts at fetch time and moves on with every refetch)
  if (out.status !== 'ACTIVE' && item.endedAt) {
    const age = (now - Date.parse(item.endedAt)) / HOUR + 1;
    if (!(Number(out.hours) >= age)) {
      const fits = WINDOW_OPTIONS.find((w) => Number(w.value) >= age);
      out.hours = (fits ?? WINDOW_OPTIONS[WINDOW_OPTIONS.length - 1]).value;
    }
  }
  return out;
};

const changed = <F extends object>(from: F, to: F) => (sameFilter(from, to) ? null : to);

export const revealFault = (
  filter: FaultFilter,
  fault: Detection & Pick<Fault, 'ruleCode'>,
  now = Date.now()
) => {
  const out = widenDetection(filter, fault, now);
  if (out.rule && out.rule.toUpperCase() !== fault.ruleCode.toUpperCase()) out.rule = '';
  return changed(filter, out);
};

export const revealAnomaly = (
  filter: AnomalyFilter,
  anomaly: Detection & Pick<Anomaly, 'detector'>,
  now = Date.now()
) => {
  const out = widenDetection(filter, anomaly, now);
  if (out.detector && out.detector !== anomaly.detector) out.detector = '';
  return changed(filter, out);
};

export const revealRecommendation = (
  filter: RecommendationFilter,
  rec: Pick<Recommendation, 'status'>
): RecommendationFilter | null =>
  filter.status && filter.status !== rec.status ? { status: '' } : null;

/**
 * Whether a list query shows the item `id`: undefined until the list of the current filters has
 * loaded (none yet, or the previous filters' rows kept while the new ones load).
 */
export const listedIn = (
  query: { data?: { id: number }[]; isPlaceholderData: boolean },
  id: number | null
) => (query.data && !query.isPlaceholderData ? query.data.some((x) => x.id === id) : undefined);

/**
 * Widens a tab's filters once per deep link. A link is one navigation (the location key): when it
 * selects an item (`selectedId`) that the loaded list does not show (`listed`), `reveal` gives the
 * filters that list it and `apply` sets them as soon as the item is known (`item`: its list row or
 * a lookup by id). The filters are left alone afterwards, and also when the user changes them
 * before the item has loaded. An item the list shows never changes them: a row click is a
 * navigation too (the selection replaces the URL), and the window's margin in `reveal` would
 * otherwise widen the window for a row near its edge. A replace that keeps the selection (the
 * tab writing its filters to the URL) is the same link.
 */
export const useRevealSelection = <F extends object, T extends { id: number }>({
  selectedId,
  listed,
  item,
  filter,
  reveal,
  apply,
}: {
  selectedId: number | null;
  /** the list of the current filters shows the item (`listedIn`; undefined while it loads) */
  listed: boolean | undefined;
  item: T | null | undefined;
  /** the current filters (memoized) */
  filter: F;
  reveal: (filter: F, item: T) => F | null;
  apply: (filter: F) => void;
}) => {
  const { key } = useLocation();
  const navigationType = useNavigationType();
  const link = useRef<{ key: string; selectedId: number | null; filter: F; done: boolean } | null>(
    null
  );

  useEffect(() => {
    const prev = link.current;
    if (prev && navigationType === NavigationType.Replace && prev.selectedId === selectedId)
      prev.key = key;
    if (link.current?.key !== key) link.current = { key, selectedId, filter, done: false };
    const current = link.current;
    if (current.done || selectedId === null) return;
    // the user set the filters while the item was loading: theirs stay
    if (!sameFilter(current.filter, filter)) {
      current.done = true;
      return;
    }
    if (listed) {
      current.done = true;
      return;
    }
    if (listed === undefined || !item || item.id !== selectedId) return;
    current.done = true;
    const next = reveal(filter, item);
    if (next) apply(next);
  }, [key, navigationType, selectedId, listed, item, filter, reveal, apply]);
};
