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
 */
export const navigationLink = (t: NavigationTarget, from?: NavigationOrigin): string => {
  const params = new URLSearchParams();
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
      return withQuery('/ai-insights', params);
    }

    case 'simulation':
      if (t.itemId !== null) params.set('job', String(t.itemId));
      else if (t.section === 'new') params.set('new', '1');
      else if (t.section === 'new-plan') params.set('new', 'production');
      return withQuery('/simulation', params);

    case 'production':
      if (t.section && PRODUCTION_TABS.includes(t.section)) params.set('tab', t.section);
      return withQuery('/production', params);

    case 'asset-overview':
      if (t.section) params.set(SECTION_PARAM, t.section);
      // the SPC charts are a tab of the parameter list: open it so the section exists
      if (t.section === 'spc' && t.assetId !== null) params.set(ASSET_SPC_PARAM, 'true');
      return withQuery(
        t.assetId !== null ? `/asset-overview/${t.assetId}` : '/asset-overview',
        params
      );

    default:
      if (t.section) params.set(SECTION_PARAM, t.section);
      return withQuery(`/${t.page}`, params);
  }
};

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
  return parts.join(' · ');
};

/** Two targets lead to the same place with the same label (shown once per answer) */
export const sameTarget = (a: NavigationTarget, b: NavigationTarget) =>
  a.label === b.label && navigationLink(a) === navigationLink(b);
