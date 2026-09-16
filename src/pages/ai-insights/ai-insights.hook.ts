import { AuthCtx, PermissionAliasEnum, PermissionGroupAliasEnum } from '@digital-twin/components';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AI_INSIGHTS_QUERY, getInsightAssets, getRules } from './api/ai-insights.api';

/** What the signed-in user may do on the page (the backend enforces the same rules) */
export type InsightsAccess = {
  /** run the optimizer, dismiss recommendations, upload / re-index / delete documents */
  canUpdate: boolean;
  /** write to the plant (apply a recommendation, inject faults) */
  canOperate: boolean;
  /** digital twin data (asset list, parameter trends, active plant faults) */
  canViewTwin: boolean;
  /** simulation jobs (twin validation links, the fault catalog) */
  canViewSimulation: boolean;
  /** admin or superuser: rule editing and fault injection */
  isAdmin: boolean;
};

export const useInsightsAccess = (): InsightsAccess => {
  const { hasPermission, userData } = useContext(AuthCtx);
  const groups = PermissionGroupAliasEnum.enum;
  const perms = PermissionAliasEnum.enum;
  return {
    canUpdate: hasPermission(groups.aiinsights, perms.update),
    canOperate: hasPermission(groups.digitaltwin, perms.update),
    canViewTwin: hasPermission(groups.digitaltwin, perms.read),
    canViewSimulation: hasPermission(groups.simulation, perms.read),
    isAdmin: userData?.role === 'admin' || userData?.role === 'superuser',
  };
};

/** Equipment the user can see; needs Digital Twin › Read (else the list is empty) */
export const useInsightAssets = (enabled: boolean) => {
  const query = useQuery({
    queryKey: AI_INSIGHTS_QUERY.assets,
    queryFn: getInsightAssets,
    enabled,
    staleTime: 5 * 60_000,
    meta: { toastId: 'aiInsightsAssets' },
  });
  const assets = useMemo(() => query.data ?? [], [query.data]);
  const byAlias = useMemo(() => new Map(assets.map((a) => [a.alias, a])), [assets]);
  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  return { assets, byAlias, byId, isLoading: query.isLoading };
};

/** The FDD rules (names of rule codes, the rules tab) */
export const useFaultRules = () => {
  const query = useQuery({
    queryKey: AI_INSIGHTS_QUERY.rules,
    queryFn: getRules,
    staleTime: 60_000,
    meta: { toastId: 'aiInsightsRules' },
  });
  const byCode = useMemo(() => new Map((query.data ?? []).map((r) => [r.code, r])), [query.data]);
  const ruleName = useCallback((code: string) => byCode.get(code)?.name ?? code, [byCode]);
  return { query, rules: query.data ?? [], byCode, ruleName };
};

export const INSIGHT_TABS = [
  'recommendations',
  'faults',
  'anomalies',
  'documents',
  'rules',
  'injection',
] as const;
export type InsightTab = (typeof INSIGHT_TABS)[number];

/** URL parameters of the page: `?tab=` and the selected item of each tab */
export const TAB_PARAM = 'tab';
export const SELECTION_PARAM: Partial<Record<InsightTab, string>> = {
  recommendations: 'rec',
  faults: 'fault',
  anomalies: 'anomaly',
};

/**
 * Tab and per-tab selection kept in the URL (`/ai-insights?tab=faults&fault=12`), so the
 * assistant, notifications and bookmarks can deep-link into the page.
 */
export const useInsightsNavigation = (allowed: readonly InsightTab[]) => {
  const [params, setParams] = useSearchParams();
  const requested = params.get(TAB_PARAM) as InsightTab | null;
  const tab: InsightTab = requested && allowed.includes(requested) ? requested : allowed[0];

  /** switches tab (a new history entry), optionally selecting an item of it */
  const openTab = useCallback(
    (next: InsightTab, selection?: number) => {
      const out = new URLSearchParams();
      out.set(TAB_PARAM, next);
      const key = SELECTION_PARAM[next];
      if (key && selection !== undefined) out.set(key, String(selection));
      setParams(out);
    },
    [setParams]
  );

  const key = SELECTION_PARAM[tab];
  const raw = key ? Number(params.get(key)) : Number.NaN;
  const selectedId = Number.isInteger(raw) && raw > 0 ? raw : null;

  const select = useCallback(
    (id: number | null) => {
      if (!key) return;
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          out.set(TAB_PARAM, tab);
          if (id === null) out.delete(key);
          else out.set(key, String(id));
          return out;
        },
        { replace: true }
      );
    },
    [key, setParams, tab]
  );

  return { tab, openTab, selectedId, select };
};
