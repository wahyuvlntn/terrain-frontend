import type { TPermissionGroupAliasEnum } from '@digital-twin/components';

import type { NavigationTarget } from './api/ai-assistant.api';
import { pageOfPath } from './assistant-context';

/**
 * Where the assistant can take the user: the pages an `open_in_app` target names (the agent's
 * `navigate` event), their titles and read permissions, and the app URL built from a target.
 * Free of UI imports, so the API schema, the store and tests use it without the components.
 */

export const NAV_PAGES = [
  'digital-twin',
  'ai-insights',
  'simulation',
  'production',
  'asset-overview',
  'alarm-report',
  'maintenance-order',
  'maintenance-performance',
  'maintenance-instruction',
  'location-overview',
  'early-warning-and-diagnostics',
  'early-warning-dashboard',
  'personnel-management',
  'plant-overview',
] as const;
export type NavPage = (typeof NAV_PAGES)[number];

/** Display name of each page (navigation cards, the question box's context label) */
export const PAGE_TITLE: Record<NavPage, string> = {
  'digital-twin': 'Digital twin',
  'ai-insights': 'AI insights',
  simulation: 'Simulation',
  production: 'Production',
  'asset-overview': 'Equipment overview',
  'alarm-report': 'Alarm report',
  'maintenance-order': 'Maintenance orders',
  'maintenance-performance': 'Maintenance performance',
  'maintenance-instruction': 'Maintenance instructions',
  'location-overview': 'Location overview',
  'early-warning-and-diagnostics': 'Early warning & diagnostics',
  'early-warning-dashboard': 'Early warning dashboard',
  'personnel-management': 'Personnel management',
  'plant-overview': 'Plant overview',
};

/** The permission group whose Read opens each page (`permissionGroupAlias` of its route, app.tsx) */
export const PAGE_PERMISSION: Record<NavPage, TPermissionGroupAliasEnum> = {
  'digital-twin': 'digitaltwin',
  'ai-insights': 'aiinsights',
  simulation: 'simulation',
  production: 'production',
  'asset-overview': 'equipmentoverview',
  'alarm-report': 'alarmsreport',
  'maintenance-order': 'maintenanceorder',
  'maintenance-performance': 'maintenanceperformance',
  'maintenance-instruction': 'maintenanceinstruction',
  'location-overview': 'locationoverview',
  'early-warning-and-diagnostics': 'earlywarningdiagnostics',
  'early-warning-dashboard': 'earlywarningdashboard',
  'personnel-management': 'personnelmanagement',
  'plant-overview': 'locationoverview',
};

type HasPermission = (group: TPermissionGroupAliasEnum, alias: 'read') => boolean;

/** The user may open the target's page (`hasPermission` of the auth context) */
export const canOpenTarget = (target: NavigationTarget, hasPermission: HasPermission) =>
  hasPermission(PAGE_PERMISSION[target.page], 'read');

// ---------------------------------------------------------------- URL parameters of the pages

/** `?section=<id>`: the page section to scroll to and highlight (`[data-nav-section="<id>"]`) */
export const SECTION_PARAM = 'section';
export const SECTION_ATTR = 'data-nav-section';

/** a section id is a plain token (it ends up in an attribute selector) */
export const isSectionId = (id: string) => /^[A-Za-z0-9][\w-]{0,63}$/.test(id);

/** AI Insights: `TAB_PARAM` / `SELECTION_PARAM` of ai-insights.hook.ts (a test keeps them equal) */
export const INSIGHTS_TAB_PARAM = 'tab';
export const INSIGHTS_SELECTION_PARAM: Record<string, string> = {
  recommendations: 'rec',
  faults: 'fault',
  anomalies: 'anomaly',
};
export const INSIGHTS_TABS = [
  'recommendations',
  'faults',
  'anomalies',
  'documents',
  'rules',
  'injection',
];

/** Equipment details: the SPC tab of the parameter list (parameter-list.hook.ts) */
export const ASSET_SPC_PARAM = 'show-spc-list';

/**
 * Digital twin: the replay of a simulation job (`REPLAY_PARAM`, `VARIANT_PARAM`, `TIME_PARAM` of
 * digital-twin.source.tsx; a test keeps them equal)
 */
export const TWIN_REPLAY_PARAMS = ['replay', 'variant', 't'] as const;

/** URL keys of each page the assistant's `filters` may set (the backend emits exactly these) */
export const PAGE_FILTER_KEYS: Partial<Record<NavPage, readonly string[]>> = {
  production: [
    'tab',
    'window',
    'lot-status',
    'lot-search',
    'lot',
    'char',
    'quality-window',
    'quality-tool',
    'timeline-window',
  ],
  'plant-overview': ['location', 'period'],
  'ai-insights': ['status', 'asset', 'rule', 'hours', 'display', 'detector', 'q', 'type', 'unit'],
  simulation: ['status', 'origin', 'domain'],
  'asset-overview': ['recent', 'date', 'parameter-search'],
  'maintenance-order': [
    'view',
    'maintenanceStatusIds',
    'severityIds',
    'priorityIds',
    'maintenanceTypeIds',
    'assetIds',
    'no-locationIds-filter',
    'start',
    'end',
    'search',
  ],
  'alarm-report': [
    'eventview',
    'alarmTypeIds',
    'assetIds',
    'no-locationIds-filter',
    'start',
    'end',
    'search',
  ],
  'early-warning-and-diagnostics': [
    'severityIds',
    'assetIds',
    'no-locationIds-filter',
    'start',
    'end',
    'search',
  ],
};

/** filter keys that only switch a part of the page (section-derived): not filters of their own */
const SECTION_FILTER_KEYS = ['tab', 'view', 'eventview', 'recent', 'no-locationIds-filter'];

/** a bad date crashes early-warning pages (`new Date(x).toISOString()`); stored answers replay */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_KEYS = ['start', 'end', 'date'];

const appendFilters = (params: URLSearchParams, t: NavigationTarget) => {
  for (const key of PAGE_FILTER_KEYS[t.page] ?? []) {
    const values = t.filters?.[key];
    if (!values || params.has(key)) continue; // never overrides what the branch set
    for (const v of values) if (!DATE_KEYS.includes(key) || ISO_DAY.test(v)) params.append(key, v);
  }
};

const withQuery = (path: string, params: URLSearchParams) => {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

/** Where in the app a target is opened from (a react-router location) */
export type NavigationOrigin = { pathname: string; search: string };

/**
 * The app URL of a target: the page with only the parameters the target sets. Fields that do not
 * apply to the page are ignored; `view: 'orbit'` (leave walk mode) is the twin URL without `view`.
 * A twin target opened from a replay in the twin (`from`) stays in that replay (job, variant and
 * the deep link's time, so the playhead stays put): the agent answers about the replayed run.
 * Other pages get the target's `filters` of their `PAGE_FILTER_KEYS`; a target that only switches
 * a part of the page on show (`from`) keeps the user's own parameters there.
 */
export const navigationLink = (t: NavigationTarget, from?: NavigationOrigin): string => {
  const params = new URLSearchParams();
  let path = `/${t.page}`;
  switch (t.page) {
    case 'digital-twin': {
      if (t.asset) params.set('asset', t.asset);
      if (t.parameter) params.set('param', t.parameter);
      if (t.location) params.set('location', t.location);
      if (t.view === 'walk') params.set('view', 'walk');
      if (t.panel) params.set('panel', t.panel);
      const current = new URLSearchParams(from?.search);
      if (from && pageOfPath(from.pathname) === 'digital-twin' && current.has('replay')) {
        for (const key of TWIN_REPLAY_PARAMS) {
          const value = current.get(key);
          if (value !== null) params.set(key, value);
        }
      }
      return withQuery('/digital-twin', params);
    }

    case 'ai-insights': {
      if (!t.tab || !INSIGHTS_TABS.includes(t.tab)) return '/ai-insights';
      params.set(INSIGHTS_TAB_PARAM, t.tab);
      const key = INSIGHTS_SELECTION_PARAM[t.tab];
      if (key && t.itemId !== null) params.set(key, String(t.itemId));
      break;
    }

    case 'simulation':
      if (t.itemId !== null) params.set('job', String(t.itemId));
      else if (t.section === 'new') params.set('new', '1');
      else if (t.section === 'new-plan') {
        params.set('new', 'production');
        params.set('domain', 'fab'); // the plan form belongs to the fab workspace
      }
      break;

    case 'production':
      if (t.section && PRODUCTION_TABS.includes(t.section)) params.set('tab', t.section);
      else if (t.section) params.set(SECTION_PARAM, t.section);
      break;

    case 'asset-overview':
      if (t.section) params.set(SECTION_PARAM, t.section);
      // the SPC charts are a tab of the parameter list: open it so the section exists
      if (t.section === 'spc' && t.assetId !== null) params.set(ASSET_SPC_PARAM, 'true');
      if (t.assetId !== null) path = `/asset-overview/${t.assetId}`;
      break;

    default:
      if (t.section) params.set(SECTION_PARAM, t.section);
  }
  appendFilters(params, t);
  // a same-page section switch: a URL of its own would reset the user's own filters
  const sectionOnly = t.filters
    ? Object.keys(t.filters).every((k) => SECTION_FILTER_KEYS.includes(k))
    : !!t.section && t.page !== 'simulation'; // a new scenario or plan never keeps the job on show
  if (from && from.pathname === path && sectionOnly) {
    const own = new Set(params.keys());
    for (const [k, v] of new URLSearchParams(from.search)) {
      // the live parameters are the first tab of the list, not the SPC tab on show
      const spcTab = k === ASSET_SPC_PARAM && t.section === 'parameters';
      if (!own.has(k) && k !== SECTION_PARAM && !spcTab) params.append(k, v);
    }
  }
  return withQuery(path, params);
};

let navSeq = Date.now();
/**
 * History state of an assistant link with filters to the page on show: the layout remounts the
 * page (`useOutletKey`) so it reads its URL again
 */
export const navigationState = (t: NavigationTarget, from?: NavigationOrigin) =>
  t.filters && t.page !== 'digital-twin' && from && pageOfPath(from.pathname) === t.page
    ? { assistantNav: ++navSeq }
    : undefined;

const SECTION_LABEL: Record<string, string> = {
  spc: 'SPC',
  new: 'new scenario',
  'new-plan': 'new production plan',
};

/** Tabs of the Production page a target may open (its `tab` URL parameter) */
const PRODUCTION_TABS = ['overview', 'tools', 'lots', 'quality'];

const sectionLabel = (id: string) => SECTION_LABEL[id] ?? id.replace(/[-_]+/g, ' ');

/** What the target opens besides the page ("CT_01 · fan_speed · walk mode"), '' when nothing */
export const navigationDetail = (t: NavigationTarget): string => {
  const parts: string[] = [];
  switch (t.page) {
    case 'digital-twin':
      if (t.asset) parts.push(t.asset);
      if (t.asset && t.parameter) parts.push(t.parameter);
      if (t.location && !t.asset) parts.push(t.location);
      if (t.panel === 'plant-overview') parts.push('plant overview');
      if (t.view === 'walk') parts.push('walk mode');
      break;
    case 'ai-insights':
      if (t.tab && INSIGHTS_TABS.includes(t.tab)) {
        parts.push(
          INSIGHTS_SELECTION_PARAM[t.tab] && t.itemId !== null ? `${t.tab} #${t.itemId}` : t.tab
        );
      }
      break;
    case 'simulation':
      if (t.itemId !== null) parts.push(`job #${t.itemId}`);
      else if (t.section === 'new' || t.section === 'new-plan') parts.push(sectionLabel(t.section));
      break;
    case 'production':
      if (t.section) parts.push(sectionLabel(t.section));
      break;
    case 'asset-overview':
      if (t.asset) parts.push(t.asset);
      else if (t.assetId !== null) parts.push(`#${t.assetId}`);
      if (t.section) parts.push(sectionLabel(t.section));
      break;
    default:
      if (t.section) parts.push(sectionLabel(t.section));
  }
  // the label names the filters; section-derived keys belong to the section
  if (
    t.page !== 'digital-twin' &&
    t.filters &&
    Object.keys(t.filters).some((k) => !SECTION_FILTER_KEYS.includes(k))
  ) {
    parts.push('filtered');
  }
  return parts.join(' · ');
};

/** Two targets lead to the same place with the same label (shown once per answer) */
export const sameTarget = (a: NavigationTarget, b: NavigationTarget) =>
  a.label === b.label && navigationLink(a) === navigationLink(b);
