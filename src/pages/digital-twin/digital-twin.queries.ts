/**
 * Data hooks of the digital twin, one per twin API call. Each reads the twin's data source
 * (digital-twin.source.tsx): live, they are the twin's polling queries (keys end with the source
 * key 'live', so prefix invalidations such as TWIN_QUERY.parameters(id) still reach them); in a
 * replay they synthesise the same shapes from the job's frames at the playhead, with the live
 * parameter lists as metadata templates, and fetch trends from the simulation API.
 */
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getTrend } from '../simulation/api/simulation.api';
import {
  getTwinAmhs,
  getTwinAssetParameters,
  getTwinAssetSummary,
  getTwinAssets,
  getTwinControlRequests,
  getTwinLiveOverview,
  getTwinParameterTrend,
  TwinAsset,
  TwinParameter,
} from './api/digital-twin.api';
import {
  replayAssets,
  replayEventsOf,
  replayOverview,
  replayParameters,
  replaySummary,
  stepAt,
  stepTime,
} from './digital-twin.replay';
import { useTwinSource } from './digital-twin.source';

export const TWIN_QUERY = {
  assets: ['DIGITAL_TWIN_ASSETS'] as const,
  parameters: (assetId: number) => ['DIGITAL_TWIN_PARAMETERS', assetId] as const,
  summary: (assetId: number, hours: number) => ['DIGITAL_TWIN_SUMMARY', assetId, hours] as const,
  trend: (parameterId: number, minutes: number) =>
    ['DIGITAL_TWIN_TREND', parameterId, minutes] as const,
  /** batched live values of several equipment (BMS plant overview, spin rates) */
  overview: (aliases: string) => ['DIGITAL_TWIN_OVERVIEW', aliases] as const,
  /** set point / mode write requests of an equipment */
  controls: (assetId: number) => ['DIGITAL_TWIN_CONTROLS', assetId] as const,
  /** simulated overhead transport (FAB1 OHT vehicles and FOUPs) */
  amhs: ['DIGITAL_TWIN_AMHS'] as const,
};

export const LIVE_MS = {
  assets: 10_000,
  parameters: 20_000,
  summary: 15_000,
  trend: 10_000,
  controls: 10_000,
  motion: 5_000,
  amhs: 3_000,
};

/** Live metadata loaded once per replay (names, units, decimals, limits, controls) */
const TEMPLATE = { staleTime: Infinity, gcTime: 30 * 60_000, refetchOnWindowFocus: false } as const;
const TEMPLATE_KEY = 'template';

const parametersTemplate = (assetId: number, enabled: boolean) => ({
  ...TEMPLATE,
  queryKey: [...TWIN_QUERY.parameters(assetId), TEMPLATE_KEY] as const,
  queryFn: () => getTwinAssetParameters(assetId),
  enabled,
});

/** Every visible equipment with its status and condition */
export const useTwinAssets = () => {
  const source = useTwinSource();
  const replay = source.replay;
  const { data } = useQuery({
    queryKey: [...TWIN_QUERY.assets, source.key],
    queryFn: getTwinAssets,
    enabled: !replay,
    refetchInterval: source.poll ? LIVE_MS.assets : false,
    refetchOnWindowFocus: false,
  });
  const index = replay?.index;
  const step = replay?.step ?? 0;
  const replayed = useMemo(() => (index ? replayAssets(index, step) : undefined), [index, step]);
  return replay ? replayed : data;
};

/** Displayed parameters of one equipment (values, conditions, limits, controls) */
export const useTwinParameters = (assetId: number) => {
  const source = useTwinSource();
  const replay = source.replay;
  const live = useQuery({
    queryKey: [...TWIN_QUERY.parameters(assetId), source.key],
    queryFn: () => getTwinAssetParameters(assetId),
    enabled: !replay,
    refetchInterval: source.poll ? LIVE_MS.parameters : false,
    refetchOnWindowFocus: false,
  });
  const template = useQuery(parametersTemplate(assetId, !!replay));
  const index = replay?.index;
  const step = replay?.step ?? 0;
  // without its template (still loading) a replayed list would flash raw aliases: wait for it,
  // unless it failed
  const tpl = template.data;
  const tplFailed = template.isError;
  const replayed = useMemo(
    () => (index && (tpl || tplFailed) ? replayParameters(index, assetId, step, tpl) : undefined),
    [index, assetId, step, tpl, tplFailed]
  );
  if (!replay) return { data: live.data, isLoading: live.isLoading };
  return { data: replayed, isLoading: !replayed && (replay.isLoading || template.isLoading) };
};

/**
 * Parameter lists of several equipment (HMI / VFD screens). `version` changes whenever any list
 * does, for effects that redraw on refresh.
 */
export const useTwinParameterSets = (assetIds: readonly number[]) => {
  const source = useTwinSource();
  const replay = source.replay;
  const live = useQueries({
    queries: assetIds.map((id) => ({
      queryKey: [...TWIN_QUERY.parameters(id), source.key],
      queryFn: () => getTwinAssetParameters(id),
      enabled: !replay,
      refetchInterval: source.poll ? LIVE_MS.parameters : (false as const),
      refetchOnWindowFocus: false,
    })),
  });
  const templates = useQueries({
    queries: assetIds.map((id) => parametersTemplate(id, !!replay)),
  });
  const index = replay?.index;
  const step = replay?.step ?? 0;
  const tplVersion = templates.map((q) => q.dataUpdatedAt).join();
  const idsKey = assetIds.join();
  // biome-ignore lint/correctness/useExhaustiveDependencies: the template results are a new array every render; tplVersion / idsKey say when they changed
  const replayed = useMemo(
    () =>
      index
        ? assetIds.map((id, i) => {
            const tpl = templates[i];
            return tpl?.data || tpl?.isError
              ? replayParameters(index, id, step, tpl.data)
              : undefined;
          })
        : [],
    [index, step, tplVersion, idsKey]
  );
  if (!replay) {
    return {
      sets: live.map((q) => q.data),
      version: live.map((q) => q.dataUpdatedAt).join(),
    };
  }
  return {
    sets: replayed,
    version: `${index?.jobId ?? ''}:${index?.variant ?? ''}:${step}:${tplVersion}`,
  };
};

/** Batched state and values of several equipment, in the requested order */
/**
 * The simulated overhead transport while the scope has OHT vehicles. Live only: simulation jobs
 * don't simulate the transport, so a replay gets none (the vehicles stand parked).
 */
export const useTwinAmhs = (enabled: boolean) => {
  const source = useTwinSource();
  const { data } = useQuery({
    queryKey: [...TWIN_QUERY.amhs, source.key],
    queryFn: getTwinAmhs,
    enabled: enabled && !source.replay,
    refetchInterval: source.poll ? LIVE_MS.amhs : false,
    refetchOnWindowFocus: false,
  });
  return source.replay ? undefined : data;
};

export const useTwinOverview = (aliases: readonly string[], refetchMs: number) => {
  const source = useTwinSource();
  const replay = source.replay;
  const key = aliases.join(',');
  const live = useQuery({
    queryKey: [...TWIN_QUERY.overview(key), source.key],
    queryFn: () => getTwinLiveOverview(aliases),
    enabled: aliases.length > 0 && !replay,
    refetchInterval: source.poll ? refetchMs : false,
    refetchOnWindowFocus: false,
  });
  const index = replay?.index;
  // biome-ignore lint/correctness/useExhaustiveDependencies: aliases are compared by content (key), callers pass a new array every render
  const ids = useMemo(
    () =>
      index
        ? aliases.flatMap((a) => {
            const asset = index.byAlias.get(a);
            return asset ? [{ alias: a, id: asset.id }] : [];
          })
        : [],
    [index, key]
  );
  const templates = useQueries({
    queries: ids.map(({ id }) => parametersTemplate(id, !!replay)),
  });
  const step = replay?.step ?? 0;
  const tplVersion = templates.map((q) => q.dataUpdatedAt).join();
  // biome-ignore lint/correctness/useExhaustiveDependencies: the template results are a new array every render; tplVersion says when they changed
  const replayed = useMemo(() => {
    if (!index) return undefined;
    const byAlias = new Map(ids.map(({ alias }, i) => [alias, templates[i]?.data]));
    return replayOverview(index, aliases, step, byAlias);
  }, [index, step, ids, tplVersion, key]);
  if (!replay) {
    return {
      data: live.data,
      isLoading: live.isLoading,
      isError: live.isError,
      dataUpdatedAt: live.dataUpdatedAt,
    };
  }
  return {
    data: replayed,
    isLoading: !replayed,
    isError: !!replay.error,
    dataUpdatedAt: index ? stepTime(index, step) : 0,
  };
};

/**
 * Trend and SPC of a parameter over `minutes`: live up to now, in a replay up to the settled
 * playhead (simulation/gettrend reuses the live trend / SPC logic on the simulated series).
 */
export const useTwinTrend = (
  asset: Pick<TwinAsset, 'alias'>,
  param: Pick<TwinParameter, 'id' | 'alias'> | undefined,
  minutes: number
) => {
  const source = useTwinSource();
  const replay = source.replay;
  const live = useQuery({
    queryKey: [...TWIN_QUERY.trend(param?.id ?? 0, minutes), source.key],
    queryFn: () => getTwinParameterTrend(param?.id ?? 0, minutes),
    enabled: !!param && !replay,
    refetchInterval: source.poll ? LIVE_MS.trend : false,
    refetchOnWindowFocus: false,
  });
  const index = replay?.index;
  const trendAt = replay?.trendAt ?? null;
  // snapped to a recorded sample, so a settled playhead between samples reuses the cache
  const at = index && trendAt !== null ? new Date(stepTime(index, stepAt(index, trendAt))) : null;
  const atIso = at ? at.toISOString() : null;
  const jobId = replay?.jobId ?? null;
  const variant = index?.variant ?? null;
  const replayed = useQuery({
    queryKey: [
      ...TWIN_QUERY.trend(param?.id ?? 0, minutes),
      source.key,
      asset.alias,
      param?.alias ?? '',
      atIso,
    ],
    queryFn: () =>
      getTrend({
        jobId: jobId as number,
        variant: variant as string,
        assetAlias: asset.alias,
        paramAlias: param?.alias ?? '',
        at: atIso ?? undefined,
        minutes,
      }),
    enabled: !!replay && !!param && jobId !== null && !!variant && !!atIso,
    // a simulated window never changes
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const q = replay ? replayed : live;
  return { data: q.data, isLoading: q.isLoading, at: replay ? at : null };
};

/** Status / condition history, uptime, alarms and maintenance of an equipment over `hours` */
export const useTwinSummary = (asset: Pick<TwinAsset, 'id'>, hours: number) => {
  const source = useTwinSource();
  const replay = source.replay;
  const live = useQuery({
    queryKey: [...TWIN_QUERY.summary(asset.id, hours), source.key],
    queryFn: () => getTwinAssetSummary(asset.id, hours),
    enabled: !replay,
    refetchInterval: source.poll ? LIVE_MS.summary : false,
    refetchOnWindowFocus: false,
  });
  // header fields the frames don't carry (location path, image), loaded once
  const template = useQuery({
    ...TEMPLATE,
    queryKey: [...TWIN_QUERY.summary(asset.id, hours), TEMPLATE_KEY],
    queryFn: () => getTwinAssetSummary(asset.id, hours),
    enabled: !!replay,
  });
  const index = replay?.index;
  const step = replay?.step ?? 0;
  const location = template.data?.location;
  const image = template.data?.image;
  const replayed = useMemo(
    () =>
      index
        ? replaySummary(index, asset.id, step, hours, {
            location: location ?? '',
            image: image ?? null,
          })
        : undefined,
    [index, asset.id, step, hours, location, image]
  );
  if (!replay) return { data: live.data, isLoading: live.isLoading };
  return { data: replayed, isLoading: !index && replay.isLoading };
};

/** Latest set point / mode write requests of an equipment (live only: a replay writes nothing) */
export const useTwinControlRequests = (assetId: number, enabled: boolean) => {
  const source = useTwinSource();
  const { data } = useQuery({
    queryKey: [...TWIN_QUERY.controls(assetId), source.key],
    queryFn: () => getTwinControlRequests(assetId, 10),
    enabled: enabled && !source.replay,
    refetchInterval: source.poll ? LIVE_MS.controls : false,
    refetchOnWindowFocus: false,
  });
  return source.replay ? undefined : data;
};

/** Control actions the scenario applied to an equipment up to the playhead, newest first */
export const useReplayControlEvents = (alias: string, limit: number) => {
  const replay = useTwinSource().replay;
  const index = replay?.index;
  const step = replay?.step ?? 0;
  return useMemo(
    () => (index && limit > 0 ? replayEventsOf(index, alias, ['control'], step, limit) : []),
    [index, alias, step, limit]
  );
};
