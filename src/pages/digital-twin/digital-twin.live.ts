import { STATUS_COLOR, StatusEnum } from '@digital-twin/components';
import { MutableRefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { TwinAsset, TwinParameter } from './api/digital-twin.api';
import { AMHS_MOTION } from './digital-twin.motion';
import { LIVE_MS, useTwinAmhs, useTwinAssets, useTwinOverview } from './digital-twin.queries';
import { signalOf } from './digital-twin.signal';
import { useTwinSource } from './digital-twin.source';
import { TwinLocation, TwinNode, TwinScreenRow } from './digital-twin.types';
import { TwinUnitState, TwinViewer } from './viewer/twin-viewer';

export { LIVE_MS, TWIN_QUERY } from './digital-twin.queries';

export type TwinOverlayTarget =
  | { type: 'equipment'; nodeId: string; equipmentNodeId: string; asset: TwinAsset }
  | {
      type: 'instrument';
      nodeId: string;
      equipmentNodeId: string;
      asset: TwinAsset;
      paramAlias: string;
      tag: string;
      partName: string;
    };

const statusLabel = (status: StatusEnum | null) =>
  status ? status.charAt(0) + status.slice(1).toLowerCase() : 'No data';

/** 3D status tint of each equipment status; RUNNING is not tinted */
const UNIT_STATE: Partial<Record<StatusEnum, TwinUnitState>> = {
  [StatusEnum.enum.IDLE]: 'standby',
  [StatusEnum.enum['UNPLANNED DOWN']]: 'trip',
  [StatusEnum.enum.DOWN]: 'trip',
  [StatusEnum.enum['PLANNED DOWN']]: 'maintenance',
  [StatusEnum.enum.OFFLINE]: 'offline',
};

export const formatParamValue = (p?: Pick<TwinParameter, 'value' | 'unit' | 'scale'>) => {
  if (!p || p.value === null || p.value === undefined) return '--';
  if (typeof p.value === 'number') {
    // the parameter's configured decimals, else by magnitude
    if (typeof p.scale === 'number') return p.value.toFixed(Math.min(Math.max(p.scale, 0), 4));
    const abs = Math.abs(p.value);
    const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    return p.value.toFixed(digits);
  }
  return p.value;
};

type LiveArgs = {
  viewerRef: MutableRefObject<TwinViewer | null>;
  equipment: TwinNode[];
  locations: Map<string, { node: TwinLocation; parentId?: string }>;
  index: Map<string, TwinNode>;
  activeNode?: TwinNode;
  selectNode: (id: string) => void;
  /** tint equipment that isn't running in its status colour */
  statusTint: boolean;
  /** the rendered scope has OHT vehicles (FAB1 cleanroom) */
  transport?: boolean;
  /** the equipment the viewer draws now (the site view leaves far interiors out), null: all */
  nearby?: readonly string[] | null;
};

/** a transport state saved longer ago than this is stale (simulator stopped): the vehicles park */
const AMHS_STALE_MS = 60_000;

/**
 * Backend data of the rendered scope (live, or the replay at its playhead): equipment states,
 * badges, motion, screens and the overlay target.
 */
export const useTwinLive = ({
  viewerRef,
  equipment,
  locations,
  index,
  activeNode,
  selectNode,
  statusTint,
  transport = false,
  nearby = null,
}: LiveArgs) => {
  const replay = useTwinSource().replay;

  // simulated overhead transport: the vehicles and FOUPs follow the simulator's plans (in 'loop'
  // motion they run a schedule of their own and nothing is fetched)
  const amhs = useTwinAmhs(transport && AMHS_MOTION === 'parametric');
  /** server minus client clock: the median of the recent estimates (the viewer eases into changes) */
  const offsets = useRef<number[]>([]);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const fresh = amhs?.state && amhs.servedAt - (amhs.updatedAt ?? 0) < AMHS_STALE_MS;
    if (!amhs || !fresh) {
      viewer.setAmhs(null);
      return;
    }
    offsets.current = [...offsets.current.slice(-8), amhs.servedAt - amhs.receivedAt];
    const sorted = [...offsets.current].sort((a, b) => a - b);
    viewer.setAmhs(amhs.state, sorted[sorted.length >> 1]);
  }, [viewerRef, amhs]);
  const assets = useTwinAssets();
  const assetByAlias = useMemo(() => new Map((assets ?? []).map((a) => [a.alias, a])), [assets]);

  /** backend equipment bound to a loaded 3D equipment node */
  const assetOf = useCallback(
    (equipmentNodeId: string) => {
      const alias = locations.get(equipmentNodeId)?.node.asset;
      return alias ? assetByAlias.get(alias) : undefined;
    },
    [locations, assetByAlias]
  );

  // live status badges above every bound equipment
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.setEquipmentBadges(
      equipment.flatMap((eq) => {
        const a = assetOf(eq.id);
        if (!a) return [];
        const status = a.status ?? StatusEnum.enum.OFFLINE;
        return [
          {
            id: eq.id,
            label: `${a.name} · ${statusLabel(a.status)}`,
            color: STATUS_COLOR[status],
            title: `${a.name}: ${statusLabel(a.status)} · condition ${a.condition ?? 'n/a'}`,
          },
        ];
      })
    );
  }, [viewerRef, equipment, assetOf]);

  // live speed of the equipment whose moving parts follow a parameter (tower fans, pump VFDs)
  const motionAliases = useMemo(
    () =>
      [
        ...new Set(
          equipment.flatMap((eq) => {
            const node = locations.get(eq.id)?.node;
            return node?.motion && node.asset ? [node.asset] : [];
          })
        ),
      ].sort(),
    [equipment, locations]
  );
  const { data: motionData } = useTwinOverview(motionAliases, LIVE_MS.motion);
  /** a paused replay is a still frame: nothing turns */
  const frozen = !!replay && !replay.playing;

  // moving parts (pump couplings, compressor canopy fans, tower fans) turn while their equipment
  // runs: at full speed, or at the live speed of equipment with a motion parameter
  useEffect(() => {
    const live = new Map((motionData ?? []).map((a) => [a.alias, a]));
    viewerRef.current?.setEquipmentMotion(
      Object.fromEntries(
        equipment.map((eq) => {
          const node = locations.get(eq.id)?.node;
          const runs = assetOf(eq.id);
          if (frozen || runs?.status !== StatusEnum.enum.RUNNING) return [eq.id, 0];
          const value =
            node?.motion && node.asset
              ? live.get(node.asset)?.params[node.motion.param]?.value
              : undefined;
          return [eq.id, node?.motion && typeof value === 'number' ? value / node.motion.full : 1];
        })
      )
    );
  }, [viewerRef, equipment, locations, assetOf, motionData, frozen]);

  // status signal towers (andon lights) show every bound equipment's state, tint toggle or not
  useEffect(() => {
    viewerRef.current?.setEquipmentSignals(
      Object.fromEntries(
        equipment.map((eq) => {
          const a = assetOf(eq.id);
          return [eq.id, a ? signalOf(a) : null];
        })
      )
    );
  }, [viewerRef, equipment, assetOf]);

  // status tint: standby / tripped / in-maintenance / offline equipment in its status colour
  // (no status counts as offline, like the badge); nothing is tinted while the toggle is off
  useEffect(() => {
    viewerRef.current?.setEquipmentStates(
      statusTint
        ? Object.fromEntries(
            equipment.map((eq) => {
              const a = assetOf(eq.id);
              return [eq.id, a ? (UNIT_STATE[a.status ?? StatusEnum.enum.OFFLINE] ?? null) : null];
            })
          )
        : {}
    );
  }, [viewerRef, equipment, assetOf, statusTint]);

  // live values on the HMI / VFD display faces of every bound equipment that has them (and is
  // drawn: the site view leaves far equipment out, so its screens aren't polled)
  const near = useMemo(() => (nearby ? new Set(nearby) : null), [nearby]);
  const screenEquipment = useMemo(
    () =>
      equipment.flatMap((eq) => {
        const screens = locations.get(eq.id)?.node.screens;
        const asset = screens && (!near || near.has(eq.id)) ? assetOf(eq.id) : undefined;
        return screens && asset ? [{ id: eq.id, asset, screens }] : [];
      }),
    [equipment, locations, assetOf, near]
  );
  // one batched call for every screen (not one parameter list per equipment)
  const screenAliases = useMemo(
    () => [...new Set(screenEquipment.map(({ asset }) => asset.alias))].sort(),
    [screenEquipment]
  );
  const { data: screenData } = useTwinOverview(screenAliases, LIVE_MS.parameters);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !screenData) return;
    const live = new Map(screenData.map((a) => [a.alias, a.params]));
    screenEquipment.forEach(({ id, asset, screens }) => {
      const params = live.get(asset.alias);
      if (!params) return;
      const row = ({ alias, label }: TwinScreenRow): [string, string] => {
        const p = params[alias];
        return [label, p ? `${formatParamValue(p)} ${p.unit}`.trim() : '--'];
      };
      const status = statusLabel(asset.status).toUpperCase();
      const statusColor = asset.status ? STATUS_COLOR[asset.status] : undefined;
      viewer.setScreenRows(id, 'HMI_Screen', screens.hmi.map(row), status, statusColor);
      if (screens.vfd)
        viewer.setScreenRows(id, 'VFD_Display', [row(screens.vfd)], status, statusColor);
    });
  }, [viewerRef, screenEquipment, screenData]);

  /** equipment node that owns a node of the drill-down hierarchy */
  const equipmentOf = useCallback(
    (node: TwinNode) => {
      let n: TwinNode | undefined = node;
      while (n && n.kind !== 'equipment') n = n.parentId ? index.get(n.parentId) : undefined;
      return n;
    },
    [index]
  );

  const overlay = useMemo((): TwinOverlayTarget | null => {
    if (!activeNode) return null;
    const eqNode = equipmentOf(activeNode);
    if (!eqNode) return null;
    const loc = locations.get(eqNode.id)?.node;
    if (activeNode.kind === 'equipment') {
      const asset = assetOf(eqNode.id);
      return asset
        ? { type: 'equipment', nodeId: activeNode.id, equipmentNodeId: eqNode.id, asset }
        : null;
    }
    if (activeNode.kind !== 'part') return null;
    const tag = activeNode.props.dt_tag ? String(activeNode.props.dt_tag) : '';
    const binding = tag ? loc?.params?.[tag] : undefined;
    if (!binding) return null;
    const [alias, paramAlias] = binding.includes(':')
      ? (binding.split(':') as [string, string])
      : [loc?.asset ?? '', binding];
    const asset = assetByAlias.get(alias);
    if (!asset) return null;
    return {
      type: 'instrument',
      nodeId: activeNode.id,
      equipmentNodeId: eqNode.id,
      asset,
      paramAlias,
      tag,
      partName: activeNode.name,
    };
  }, [activeNode, equipmentOf, locations, assetOf, assetByAlias]);

  /** 3D tags bound to each parameter of an equipment (to jump from a dashboard row to its instrument) */
  const selectParameter = useCallback(
    (equipmentNodeId: string, paramAlias: string) => {
      const params = locations.get(equipmentNodeId)?.node.params ?? {};
      const tags = Object.entries(params)
        .filter(([, binding]) => binding === paramAlias)
        .map(([tag]) => tag);
      const eqNode = index.get(equipmentNodeId);
      const find = (n: TwinNode): TwinNode | undefined =>
        n.kind === 'part' && tags.includes(String(n.props.dt_tag ?? ''))
          ? n
          : n.children.map(find).find(Boolean);
      const target = eqNode ? find(eqNode) : undefined;
      if (target) selectNode(target.id);
    },
    [locations, index, selectNode]
  );

  /** whether a parameter of an equipment has a 3D instrument to jump to */
  const hasInstrument = useCallback(
    (equipmentNodeId: string, paramAlias: string) =>
      Object.values(locations.get(equipmentNodeId)?.node.params ?? {}).includes(paramAlias),
    [locations]
  );

  /** select the loaded 3D equipment bound to a backend equipment alias */
  const selectAsset = useCallback(
    (alias: string) => {
      const eq = equipment.find((e) => locations.get(e.id)?.node.asset === alias);
      if (eq) selectNode(eq.id);
    },
    [equipment, locations, selectNode]
  );

  /** backend equipment of the active node's equipment (its own, or the one it is part of) */
  const activeAssetAlias = useMemo(() => {
    const eqNode = activeNode ? equipmentOf(activeNode) : undefined;
    return eqNode ? locations.get(eqNode.id)?.node.asset : undefined;
  }, [activeNode, equipmentOf, locations]);

  return {
    assets,
    assetByAlias,
    overlay,
    activeAssetAlias,
    selectParameter,
    hasInstrument,
    selectAsset,
  };
};
