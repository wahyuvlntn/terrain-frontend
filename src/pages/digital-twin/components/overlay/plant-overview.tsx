import {
  Badge,
  CONDITION_COLOR,
  ConditionEnum,
  InfoTooltip,
  STATUS_COLOR,
  StatusEnum,
} from '@digital-twin/components';
import { Close } from '@digital-twin/icons';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ReactNode, useEffect, useId, useMemo, useRef } from 'react';

import { TwinLiveAsset, TwinLiveParameter } from '../../api/digital-twin.api';
import {
  KW_PER_RT,
  overrideOf,
  PLANT_ALIASES,
  PLANT_CHILLERS,
  PLANT_CHW_PUMPS,
  PLANT_CW_PUMPS,
  PLANT_POINTS,
  PLANT_SYSTEM,
  PLANT_TOWERS,
  PlantPoint,
  PlantUnit,
  SYSTEM_POINTS,
  UNIT_STATE_LABEL,
  unitState,
  WET_BULB,
} from '../../digital-twin.bms';
import { formatParamValue, LIVE_MS } from '../../digital-twin.live';
import { useTwinOverview } from '../../digital-twin.queries';
import { useTwinSource } from '../../digital-twin.source';
import { timeAgo, titleCase, useNow } from './overlay-utils';
import styles from './plant-overview.module.scss';
import { stateBadgeColor, TwinMetric } from './twin-ui';

// ------------------------------------------------------------- geometry
// Schematic frame (SVG user units, ~px at full size). One column per chiller set: tower on the
// roof, CW pump, chiller (condenser over evaporator), CHW pump; the fab risers and the bypass on
// the right. Supply legs run at x - LEG, return legs at x + LEG.
const W = 940;
const H = 448;
const COLS = [122, 338, 554];
const LEG = 78;
const X_BYP = 680;
const X_SUP = 800;
const X_RET = 900;
const Y = {
  cwr: 16,
  towerTop: 34,
  basin: 104,
  towerTag: 130,
  cws: 148,
  cwp: 178,
  ch: 200,
  chws: 362,
  chwp: 396,
  chwr: 430,
  fabTop: 204,
  fabBottom: 262,
};
/** Chiller block, relative to Y.ch: frame, condenser / evaporator shells, value rows */
const CH = { height: 134, cond: 22, evap: 108, shell: 22, rows: [60, 74, 88, 102] };
const SHELL_END = 56;
/** Header crossings where a branch passes without connecting (drawn as a gap in the header) */
const CROSSINGS: [number, number][] = [
  [COLS[0] + LEG, Y.cws],
  [COLS[1] + LEG, Y.cws],
  [COLS[1] - LEG, Y.chws],
  [COLS[2] - LEG, Y.chws],
];

type Medium = 'chws' | 'chwr' | 'cws' | 'cwr';
type Dir = 'up' | 'down' | 'left' | 'right';
type SelectUnit = (alias: string) => void;

const isAbnormal = (p?: TwinLiveParameter) => !!p && p.condition !== ConditionEnum.enum.NORMAL;
/** condition colour lifted towards white so values stay legible on the dark schematic */
const conditionText = (c: ConditionEnum) => `color-mix(in srgb, ${CONDITION_COLOR[c]} 72%, white)`;
const numeric = (p?: TwinLiveParameter) => (typeof p?.value === 'number' ? p.value : null);
const mix = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
/** status colour for text: lifted a little so dim states (offline) stay readable */
const statusText = (color: string) => `color-mix(in srgb, ${color} 85%, white)`;

/** Small triangle pointing in `dir` with its tip at (x, y) */
const triangle = (x: number, y: number, dir: Dir, len = 7, half = 4) => {
  const pts: Record<Dir, number[]> = {
    right: [x, y, x - len, y - half, x - len, y + half],
    left: [x, y, x + len, y - half, x + len, y + half],
    down: [x, y, x - half, y - len, x + half, y - len],
    up: [x, y, x - half, y + len, x + half, y + len],
  };
  return pts[dir].join(' ');
};

// ------------------------------------------------------------- drawing
const Pipe = ({
  d,
  medium,
  flowing,
  header,
}: {
  d: string;
  medium: Medium;
  flowing: boolean;
  header?: boolean;
}) => (
  <>
    <path
      d={d}
      className={clsx(
        styles.pipe,
        styles[`pipe--${medium}`],
        header && styles['pipe--header'],
        !flowing && styles['pipe--idle']
      )}
    />
    {flowing ? (
      <path d={d} className={clsx(styles.flow, header && styles['flow--header'])} />
    ) : null}
  </>
);

const Arrow = ({ x, y, dir, medium }: { x: number; y: number; dir: Dir; medium: Medium }) => (
  <polygon points={triangle(x, y, dir, 9, 5.5)} className={styles[`arrow--${medium}`]} />
);

/** Line marker on a header: medium code and flow direction */
const PipeMarker = ({
  x,
  y,
  label,
  dir,
  medium,
}: {
  x: number;
  y: number;
  label: string;
  dir: 'left' | 'right';
  medium: Medium;
}) => {
  const w = label.length * 6 + 20;
  const left = x - w / 2;
  return (
    <g aria-hidden="true">
      <rect
        x={left}
        y={y - 7}
        width={w}
        height={14}
        rx={3}
        className={styles[`marker--${medium}`]}
      />
      <text
        x={dir === 'right' ? left + 6 : left + w - 6}
        y={y + 3.2}
        textAnchor={dir === 'right' ? 'start' : 'end'}
        className={styles.marker__text}
      >
        {label}
      </text>
      <polygon
        points={triangle(dir === 'right' ? left + w - 5 : left + 5, y, dir, 6, 3.5)}
        className={styles.marker__arrow}
      />
    </g>
  );
};

/** Value with its unit as tspans; coloured by the parameter condition when not normal */
const Reading = ({
  param,
  unit,
  dx,
}: {
  param?: TwinLiveParameter;
  unit?: string;
  dx?: number;
}) => (
  <>
    <tspan
      dx={dx}
      className={styles['t-value']}
      style={param && isAbnormal(param) ? { fill: conditionText(param.condition) } : undefined}
    >
      {formatParamValue(param)}
    </tspan>
    {unit ? (
      <tspan dx={2} className={styles['t-unit']}>
        {unit}
      </tspan>
    ) : null}
  </>
);

/** Label left, value right on one row of width `w` (baseline y); tinted when the value is abnormal */
const ValueRow = ({
  x,
  y,
  w,
  point,
  param,
}: {
  x: number;
  y: number;
  w: number;
  point: PlantPoint;
  param?: TwinLiveParameter;
}) => (
  <g>
    {param && isAbnormal(param) ? (
      <>
        <title>{`${point.label}: ${titleCase(param.condition)}`}</title>
        <rect
          x={x - 4}
          y={y - 10.5}
          width={w + 8}
          height={14}
          rx={3}
          style={{
            fill: mix(CONDITION_COLOR[param.condition], 22),
            stroke: CONDITION_COLOR[param.condition],
          }}
        />
      </>
    ) : null}
    <text x={x} y={y} className={styles['t-label']}>
      {point.label}
    </text>
    <text x={x + w} y={y} textAnchor="end">
      <Reading param={param} unit={point.unit} />
    </text>
  </g>
);

/** Boxed instrument readout (TT-801 …) with an optional leader line to its pipe */
const DataTag = ({
  x,
  y,
  w,
  rows,
  leader,
}: {
  x: number;
  y: number;
  w: number;
  rows: { point: PlantPoint; param?: TwinLiveParameter }[];
  leader?: [number, number, number, number];
}) => (
  <g>
    {leader ? (
      <line x1={leader[0]} y1={leader[1]} x2={leader[2]} y2={leader[3]} className={styles.leader} />
    ) : null}
    <rect x={x} y={y} width={w} height={rows.length * 14 + 6} rx={3} className={styles.tag} />
    {rows.map((r, i) => (
      <ValueRow key={r.point.alias} x={x + 7} y={y + 15 + i * 14} w={w - 14} {...r} />
    ))}
  </g>
);

const StatusText = ({
  x,
  y,
  anchor,
  state,
  override,
}: {
  x: number;
  y: number;
  anchor?: 'start' | 'end';
  state: ReturnType<typeof unitState>;
  /** operator override (MAN / HAND / OFF) shown before the status */
  override?: string | null;
}) => (
  <text
    x={x}
    y={y}
    textAnchor={anchor}
    className={styles['t-status']}
    style={{ fill: statusText(state.color) }}
  >
    {override ? <OverrideTag text={override} /> : null}● {state.label}
  </text>
);

/** Operator override tag as a tspan (amber, ahead of the status) */
const OverrideTag = ({ text, dx }: { text: string; dx?: number }) => (
  <tspan dx={dx} className={styles['t-override']}>
    {`${text} `}
  </tspan>
);

/** Unit condition worth flagging on the graphic (active alarms put the unit in WARNING / CRITICAL) */
const alarmOf = (asset?: TwinLiveAsset) =>
  asset?.condition === ConditionEnum.enum.WARNING ||
  asset?.condition === ConditionEnum.enum.CRITICAL
    ? asset.condition
    : null;

/** A clickable unit: shows the equipment in 3D; an alarm marker sits on its top-right corner */
const Unit = ({
  alias,
  label,
  hit,
  alarm,
  onSelect,
  children,
}: {
  alias: string;
  label: string;
  hit: [number, number, number, number];
  alarm?: ConditionEnum | null;
  onSelect: SelectUnit;
  children: ReactNode;
}) => (
  <g
    className={styles.unit}
    role="button"
    tabIndex={0}
    aria-label={label}
    onClick={() => onSelect(alias)}
    onKeyDown={(e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      onSelect(alias);
    }}
  >
    <title>{label}</title>
    <rect
      x={hit[0]}
      y={hit[1]}
      width={hit[2]}
      height={hit[3]}
      rx={6}
      className={styles.unit__hit}
    />
    {children}
    {alarm ? (
      <g transform={`translate(${hit[0] + hit[2] - 3} ${hit[1] + 3})`}>
        <circle r={7} style={{ fill: CONDITION_COLOR[alarm], stroke: 'white', strokeWidth: 1 }} />
        <text y={3.5} textAnchor="middle" className={styles['t-alarm']}>
          !
        </text>
      </g>
    ) : null}
  </g>
);

const OVERRIDE_TEXT: Record<string, string> = {
  MAN: 'manual speed',
  HAND: 'hand-on',
  OFF: 'switched off',
};

const unitLabel = (unit: PlantUnit, kind: string, asset?: TwinLiveAsset) => {
  const alarm = alarmOf(asset);
  const override = overrideOf(asset)
    ?.split(' ')
    .map((o) => OVERRIDE_TEXT[o] ?? o)
    .join(', ');
  return `${unit.tag} ${kind} · ${unitState(asset).label}${override ? ` · operator override: ${override}` : ''}${
    alarm ? ` · ${titleCase(alarm)} alarm` : ''
  }${asset ? '' : ' (no live data)'} · show in 3D`;
};

/** Fan animation period: one turn per 1.4 s at 65 % speed, slower / faster with the live speed */
const fanPeriod = (asset?: TwinLiveAsset) => {
  const speed = numeric(asset?.params.fan_speed);
  return speed && speed > 5 ? `${((1.4 * 65) / speed).toFixed(2)}s` : undefined;
};

/** Crossflow cooling tower: fan (spins while running) over a louvred cell, basin below */
const Tower = ({
  x,
  unit,
  asset,
  onSelect,
}: {
  x: number;
  unit: PlantUnit;
  asset?: TwinLiveAsset;
  onSelect: SelectUnit;
}) => {
  const state = unitState(asset);
  const louvres = [42, 50, 58, 66, 74, 82, 90];
  return (
    <Unit
      alias={unit.alias}
      label={unitLabel(unit, 'cooling tower', asset)}
      alarm={alarmOf(asset)}
      hit={[x - 64, 22, 128, 114]}
      onSelect={onSelect}
    >
      <rect x={x - 22} y={26} width={44} height={8} className={styles.equip} />
      <rect
        x={x - 52}
        y={Y.towerTop}
        width={104}
        height={Y.basin - Y.towerTop}
        rx={2}
        className={styles.equip}
        style={{ stroke: state.color, strokeWidth: 1.6 }}
      />
      {louvres.map((ly) => (
        <g key={ly} className={styles.louvre}>
          <line x1={x - 51} y1={ly} x2={x - 44} y2={ly + 6} />
          <line x1={x + 51} y1={ly} x2={x + 44} y2={ly + 6} />
        </g>
      ))}
      <g transform={`translate(${x} 49)`}>
        <g
          className={clsx(styles.fan, state.running && styles['fan--on'])}
          style={state.running ? { animationDuration: fanPeriod(asset) } : undefined}
        >
          {[0, 90, 180, 270].map((a) => (
            <path key={a} d="M0 0C3.5-3 3.5-8 0-11C-2-8-2-3 0 0Z" transform={`rotate(${a})`} />
          ))}
          <circle r={2.4} />
        </g>
      </g>
      {PLANT_POINTS.tower.map((point, i) => (
        <ValueRow
          key={point.alias}
          x={x - 39}
          y={73 + i * 12.5}
          w={78}
          point={point}
          param={asset?.params[point.alias]}
        />
      ))}
      <rect x={x - 58} y={Y.basin} width={116} height={10} rx={1} className={styles.basin} />
      <text x={x - 58} y={Y.towerTag} className={styles['t-tag']}>
        {unit.tag}
      </text>
      <StatusText
        x={x + 58}
        y={Y.towerTag}
        anchor="end"
        state={state}
        override={overrideOf(asset)}
      />
    </Unit>
  );
};

/** Centrifugal pump on a vertical leg: casing filled with the status colour while running */
const Pump = ({
  x,
  y,
  dir,
  unit,
  asset,
  onSelect,
}: {
  x: number;
  y: number;
  dir: 'up' | 'down';
  unit: PlantUnit;
  asset?: TwinLiveAsset;
  onSelect: SelectUnit;
}) => {
  const state = unitState(asset);
  const [flow, speed] = PLANT_POINTS.pump;
  return (
    <Unit
      alias={unit.alias}
      label={unitLabel(unit, 'pump', asset)}
      alarm={alarmOf(asset)}
      hit={[x - 17, y - 17, 156, 34]}
      onSelect={onSelect}
    >
      <circle
        cx={x}
        cy={y}
        r={12}
        className={styles.pump}
        style={{ stroke: state.color, fill: mix(state.color, state.running ? 85 : 18) }}
      />
      <polygon
        points={triangle(x, dir === 'down' ? y + 7 : y - 7, dir, 11, 6)}
        style={{ fill: state.running ? 'var(--afdd-background-lowest)' : state.color }}
      />
      <text x={x + 18} y={y - 3}>
        <tspan className={styles['t-tag']}>{unit.tag}</tspan>
        {overrideOf(asset) ? <OverrideTag text={overrideOf(asset) ?? ''} dx={7} /> : null}
        <tspan
          dx={overrideOf(asset) ? 0 : 7}
          className={styles['t-status']}
          style={{ fill: statusText(state.color) }}
        >
          ● {state.label}
        </tspan>
      </text>
      <text x={x + 18} y={y + 12}>
        <Reading param={asset?.params[flow.alias]} unit={flow.unit} />
        <Reading param={asset?.params[speed.alias]} unit={speed.unit} dx={10} />
      </text>
    </Unit>
  );
};

/** Heat exchanger shell (condenser / evaporator) with its tube sheets */
const Shell = ({ x, y, kind }: { x: number; y: number; kind: 'cw' | 'chw' }) => (
  <g className={clsx(styles.shell, styles[`shell--${kind}`])}>
    <rect x={x - 62} y={y} width={124} height={CH.shell} rx={CH.shell / 2} />
    <line x1={x - 48} y1={y + 2} x2={x - 48} y2={y + CH.shell - 2} />
    <line x1={x + 48} y1={y + 2} x2={x + 48} y2={y + CH.shell - 2} />
    <text x={x} y={y + 14} textAnchor="middle" className={styles['t-shell']}>
      {kind === 'cw' ? 'CONDENSER' : 'EVAPORATOR'}
    </text>
  </g>
);

/** Water-cooled chiller: condenser over evaporator, live values in between, load bar */
const Chiller = ({
  x,
  unit,
  asset,
  onSelect,
}: {
  x: number;
  unit: PlantUnit;
  asset?: TwinLiveAsset;
  onSelect: SelectUnit;
}) => {
  const state = unitState(asset);
  const top = Y.ch;
  const load = Math.min(Math.max(numeric(asset?.params.load_pct) ?? 0, 0), 100);
  return (
    <Unit
      alias={unit.alias}
      label={unitLabel(unit, 'chiller', asset)}
      alarm={alarmOf(asset)}
      hit={[x - 74, top - 4, 148, CH.height + 8]}
      onSelect={onSelect}
    >
      <rect
        x={x - 70}
        y={top}
        width={140}
        height={CH.height}
        rx={4}
        className={styles.chiller}
        style={{ stroke: state.color, fill: mix(state.color, 8) }}
      />
      <text x={x - 62} y={top + 16} className={styles['t-tag']}>
        {unit.tag}
      </text>
      <StatusText x={x + 62} y={top + 16} anchor="end" state={state} override={overrideOf(asset)} />
      <Shell x={x} y={top + CH.cond} kind="cw" />
      {PLANT_POINTS.chiller.map((point, i) => (
        <ValueRow
          key={point.alias}
          x={x - 60}
          y={top + CH.rows[i]}
          w={120}
          point={point}
          // a standby chiller reports 0 kW/RT: show no efficiency rather than a misleading zero
          param={
            point.alias === 'efficiency' && !state.running ? undefined : asset?.params[point.alias]
          }
        />
      ))}
      <rect
        x={x - 60}
        y={top + CH.rows[0] + 3}
        width={120}
        height={2}
        rx={1}
        className={styles.tag}
      />
      <rect
        x={x - 60}
        y={top + CH.rows[0] + 3}
        width={1.2 * load}
        height={2}
        rx={1}
        style={{ fill: state.color }}
      />
      <Shell x={x} y={top + CH.evap} kind="chw" />
    </Unit>
  );
};

// ------------------------------------------------------------- panel
/** Class for the element the overview floats over (positioning context) */
export const PLANT_OVERVIEW_HOST = styles['plant-overview-host'];

/** Replay indicator: the simulated time the schematic shows */
const ReplayAge = ({ time, isLoading }: { time: number; isLoading: boolean }) => (
  <span className={clsx(styles['po-live'], styles['po-live--replay'])}>
    <i />
    <span className={styles['po-header__live-text']}>
      {isLoading || !time ? 'Loading replay…' : `Replay · ${format(time, 'dd MMM HH:mm')}`}
    </span>
  </span>
);

/** Live indicator with the age of the last refresh (ticks on its own, not the schematic) */
const LiveAge = ({
  updatedAt,
  isError,
  isLoading,
}: {
  updatedAt: number;
  isError: boolean;
  isLoading: boolean;
}) => {
  const now = useNow(1000);
  return (
    <span className={clsx(styles['po-live'], isError && styles['po-live--error'])}>
      <i />
      <span className={styles['po-header__live-text']}>
        {isError
          ? 'Live data unavailable'
          : isLoading || !updatedAt
            ? 'Loading…'
            : `Live · ${timeAgo(new Date(updatedAt).toISOString(), now)}`}
      </span>
    </span>
  );
};

/** what the info icon of the header explains */
const HELP = (
  <>
    Live BMS view of the CUB chiller plant: unit states, values and flow. Click a unit to select it
    in 3D. An amber MAN, HAND or OFF ahead of a unit's state is an operator override from the twin
    (manual speed, hand-on, switched off). Values outside their limits are coloured by condition;
    hover a KPI for its detail.
  </>
);

type PlantOverviewProps = {
  onClose: () => void;
  /** show a unit in 3D (backend equipment alias) */
  onSelectUnit: SelectUnit;
  /** element to focus on close when the opener no longer exists (e.g. the 3D viewport) */
  returnFocus?: () => HTMLElement | null | undefined;
};

/**
 * BMS plant graphic of the CUB chiller plant over the 3D view: P&ID-style schematic of the CHW
 * and CW loops with live unit states, values and flow, plus the plant KPIs. Polls one batched
 * live query while open.
 */
export const PlantOverview = ({ onClose, onSelectUnit, returnFocus }: PlantOverviewProps) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const replay = !!useTwinSource().replay;
  const { data, isLoading, isError, dataUpdatedAt } = useTwinOverview(
    PLANT_ALIASES,
    LIVE_MS.parameters
  );
  const byAlias = useMemo(() => new Map((data ?? []).map((a) => [a.alias, a])), [data]);

  // Esc closes the panel; focus moves into it and returns to where it came from on close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: remember the opener once, on mount
  useEffect(() => {
    const previous = document.activeElement;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      // the opener may be gone (the equipment dashboard is hidden while the panel is open)
      const back =
        (previous instanceof HTMLElement || previous instanceof SVGElement) && previous.isConnected
          ? previous
          : returnFocus?.();
      back?.focus({ preventScroll: true });
    };
  }, []);

  const system = byAlias.get(PLANT_SYSTEM);
  const sys = (p: PlantPoint) => system?.params[p.alias];
  const towers = PLANT_TOWERS.map((u) => byAlias.get(u.alias));
  const chillers = PLANT_CHILLERS.map((u) => byAlias.get(u.alias));
  const chwPumps = PLANT_CHW_PUMPS.map((u) => byAlias.get(u.alias));
  const cwPumps = PLANT_CW_PUMPS.map((u) => byAlias.get(u.alias));

  // a branch flows while its pump (tower) runs, a header while any of them does
  const towerFlow = towers.map((a) => unitState(a).running);
  const cwFlow = cwPumps.map((a) => unitState(a).running);
  const chwFlow = chwPumps.map((a) => unitState(a).running);
  const anyCw = cwFlow.some(Boolean) || towerFlow.some(Boolean);
  const anyChw = chwFlow.some(Boolean);
  const bypassFlow = anyChw && (numeric(sys(SYSTEM_POINTS.bypassFlow)) ?? 0) > 0.5;
  const valvePct = Math.min(Math.max(numeric(sys(SYSTEM_POINTS.bypassValve)) ?? 0, 0), 100);
  // ambient wet bulb: every tower reports it, prefer a running one
  const wetBulb = (
    towers.find((a, i) => towerFlow[i] && a?.params.wet_bulb) ?? towers.find(Boolean)
  )?.params.wet_bulb;

  const load = numeric(sys(SYSTEM_POINTS.coolingLoad));
  const running = numeric(sys(SYSTEM_POINTS.chillersRunning));
  const supplyT = sys(SYSTEM_POINTS.supplyTemp);
  const returnT = sys(SYSTEM_POINTS.returnTemp);
  /** plant KPIs: a controller point with its value (or one derived from it) and condition */
  const kpis: { p: PlantPoint; label?: string; value?: string; unit?: string; sub?: string }[] = [
    {
      p: SYSTEM_POINTS.coolingLoad,
      value: load === null ? '--' : String(Math.round(load / KW_PER_RT)),
      unit: 'RT',
      sub: `${formatParamValue(sys(SYSTEM_POINTS.coolingLoad))} kW`,
    },
    { p: SYSTEM_POINTS.plantKw, unit: 'kW' },
    { p: SYSTEM_POINTS.plantEff, unit: 'kW/RT' },
    {
      p: SYSTEM_POINTS.chillersRunning,
      value: running === null ? '--' : `${Math.round(running)} / ${PLANT_CHILLERS.length}`,
    },
    {
      p: SYSTEM_POINTS.deltaT,
      label: 'CHW ΔT',
      unit: 'K',
      sub: `${formatParamValue(supplyT)} → ${formatParamValue(returnT)} °C`,
    },
    {
      p: SYSTEM_POINTS.bypassFlow,
      label: 'Bypass flow',
      unit: 'm³/h',
      sub: `FCV-801 ${formatParamValue(sys(SYSTEM_POINTS.bypassValve))} % open`,
    },
  ];

  const [x1, x2, x3] = COLS;
  return (
    <div className={styles['plant-overview']}>
      <div
        ref={panelRef}
        className={styles['plant-overview__panel']}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <header className={styles['po-header']}>
          <div className={styles['po-header__titles']}>
            <strong id={titleId} className={styles['po-header__title']}>
              Chiller plant overview
            </strong>
            <InfoTooltip title="Chiller plant overview" content={HELP} />
            <Badge
              color={stateBadgeColor(system?.status)}
              className={styles['po-badge']}
              title={`CHW plant controller ${PLANT_SYSTEM.replace('_', '-')}`}
            >
              {PLANT_SYSTEM.replace('_', '-')} · {titleCase(system?.status)}
            </Badge>
          </div>
          <div className={styles['po-header__meta']}>
            {replay ? (
              <ReplayAge time={dataUpdatedAt} isLoading={isLoading} />
            ) : (
              <LiveAge updatedAt={dataUpdatedAt} isError={isError} isLoading={isLoading} />
            )}
          </div>
          <button
            type="button"
            className={styles['po-header__close']}
            aria-label="Close plant overview"
            onClick={onClose}
          >
            <Close />
          </button>
        </header>

        <div className={styles['po-kpis']}>
          {kpis.map((k) => {
            const param = sys(k.p);
            const cond = param && isAbnormal(param) ? param.condition : null;
            const label = k.label ?? k.p.label;
            return (
              <TwinMetric
                key={k.p.alias}
                title={label}
                value={k.value ?? formatParamValue(param)}
                unit={k.unit}
                tone={cond ? CONDITION_COLOR[cond] : null}
                hint={[k.sub, cond ? titleCase(cond) : ''].filter(Boolean).join(' · ') || undefined}
              />
            );
          })}
        </div>

        <div className={styles['po-canvas']}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label="Chiller plant schematic: cooling towers, condenser water, chillers, chilled water and fab risers"
          >
            {/* ---------------------------------------------------- headers */}
            <Pipe d={`M${x3 + LEG} ${Y.cwr}H${x1 + 40}`} medium="cwr" flowing={anyCw} header />
            <Pipe d={`M${x1 - LEG} ${Y.cws}H${x3 - LEG}`} medium="cws" flowing={anyCw} header />
            <Pipe
              d={`M${x1 + LEG} ${Y.chws}H${X_SUP}V${Y.fabBottom}`}
              medium="chws"
              flowing={anyChw}
              header
            />
            <Pipe
              d={`M${X_RET} ${Y.fabBottom}V${Y.chwr}H${x1 - LEG}`}
              medium="chwr"
              flowing={anyChw}
              header
            />
            {CROSSINGS.map(([cx, cy]) => (
              <rect
                key={`${cx}-${cy}`}
                x={cx - 5}
                y={cy - 4}
                width={10}
                height={8}
                className={styles.gap}
              />
            ))}

            {/* --------------------------------------------- unit branches */}
            {COLS.map((x, i) => (
              <g key={x}>
                {/* tower n: header -> inlet, basin -> CW supply header */}
                <Pipe d={`M${x + 40} ${Y.cwr}V${Y.towerTop}`} medium="cwr" flowing={towerFlow[i]} />
                <Pipe
                  d={`M${x - 58} ${Y.basin + 5}H${x - LEG}V${Y.cws}`}
                  medium="cws"
                  flowing={towerFlow[i]}
                />
                {/* CW pump n -> condenser -> CW return to the roof */}
                <Pipe
                  d={`M${x - LEG} ${Y.cws}V${Y.ch + CH.cond + 16}H${x - SHELL_END}`}
                  medium="cws"
                  flowing={cwFlow[i]}
                />
                <Pipe
                  d={`M${x + SHELL_END} ${Y.ch + CH.cond + 6}H${x + LEG}V${Y.cwr}`}
                  medium="cwr"
                  flowing={cwFlow[i]}
                />
                {/* CHW return header -> CHW pump n -> evaporator -> CHW supply header */}
                <Pipe
                  d={`M${x - LEG} ${Y.chwr}V${Y.ch + CH.evap + 16}H${x - SHELL_END}`}
                  medium="chwr"
                  flowing={chwFlow[i]}
                />
                <Pipe
                  d={`M${x + SHELL_END} ${Y.ch + CH.evap + 6}H${x + LEG}V${Y.chws}`}
                  medium="chws"
                  flowing={chwFlow[i]}
                />
              </g>
            ))}
            <Pipe d={`M${X_BYP} ${Y.chws}V${Y.chwr}`} medium="chws" flowing={bypassFlow} />

            <PipeMarker x={(x1 + x2) / 2 + 8} y={Y.cwr} label="CWR" dir="left" medium="cwr" />
            <PipeMarker x={(x1 + x2) / 2} y={Y.cws} label="CWS" dir="right" medium="cws" />
            <PipeMarker x={(x1 + x2) / 2} y={Y.chws} label="CHWS" dir="right" medium="chws" />
            <PipeMarker x={(x1 + x2) / 2} y={Y.chwr} label="CHWR" dir="left" medium="chwr" />
            <Arrow x={X_SUP} y={328} dir="up" medium="chws" />
            <Arrow x={X_RET} y={348} dir="down" medium="chwr" />
            <Arrow x={X_BYP} y={420} dir="down" medium="chws" />

            {/* ------------------------------------------------------ units */}
            {COLS.map((x, i) => (
              <g key={x}>
                <Tower x={x} unit={PLANT_TOWERS[i]} asset={towers[i]} onSelect={onSelectUnit} />
                <Pump
                  x={x - LEG}
                  y={Y.cwp}
                  dir="down"
                  unit={PLANT_CW_PUMPS[i]}
                  asset={cwPumps[i]}
                  onSelect={onSelectUnit}
                />
                <Chiller
                  x={x}
                  unit={PLANT_CHILLERS[i]}
                  asset={chillers[i]}
                  onSelect={onSelectUnit}
                />
                <Pump
                  x={x - LEG}
                  y={Y.chwp}
                  dir="up"
                  unit={PLANT_CHW_PUMPS[i]}
                  asset={chwPumps[i]}
                  onSelect={onSelectUnit}
                />
              </g>
            ))}

            {/* ------------------------------------------ plant-level points */}
            <text x={660} y={84} className={styles['t-section']}>
              CONDENSER WATER
            </text>
            <text x={660} y={98} className={styles['t-sub']}>
              Towers CT-01..03 on the CUB roof
            </text>
            <DataTag x={660} y={22} w={150} rows={[{ point: WET_BULB, param: wetBulb }]} />
            <text x={660} y={184} className={styles['t-section']}>
              CHILLED WATER
            </text>
            <text x={660} y={198} className={styles['t-sub']}>
              Primary loop, bypass FCV-801
            </text>

            <DataTag
              x={646}
              y={316}
              w={110}
              rows={[
                { point: SYSTEM_POINTS.supplyTemp, param: supplyT },
                { point: SYSTEM_POINTS.plantFlow, param: sys(SYSTEM_POINTS.plantFlow) },
              ]}
              leader={[712, 350, 712, Y.chws - 2.5]}
            />
            <DataTag
              x={792}
              y={384}
              w={100}
              rows={[
                { point: SYSTEM_POINTS.returnTemp, param: returnT },
                { point: SYSTEM_POINTS.deltaT, param: sys(SYSTEM_POINTS.deltaT) },
              ]}
              leader={[892, 399, X_RET - 2.5, 399]}
            />

            {/* bypass control valve FCV-801: fill follows the valve position */}
            <g>
              <title>{`FCV-801 bypass valve: ${formatParamValue(sys(SYSTEM_POINTS.bypassValve))} % open`}</title>
              <line
                x1={X_BYP - 7}
                y1={Y.chwp}
                x2={X_BYP - 16}
                y2={Y.chwp}
                className={styles.valve}
              />
              <rect
                x={X_BYP - 26}
                y={Y.chwp - 6}
                width={10}
                height={12}
                rx={2}
                className={clsx(styles.valve, styles.instrument)}
              />
              <polygon
                points={`${X_BYP - 7},${Y.chwp - 10} ${X_BYP + 7},${Y.chwp - 10} ${X_BYP},${Y.chwp} ${X_BYP - 7},${Y.chwp + 10} ${X_BYP + 7},${Y.chwp + 10} ${X_BYP},${Y.chwp}`}
                className={styles.valve}
                style={{ fill: mix('var(--afdd-lochmara-500)', 15 + 0.85 * valvePct) }}
              />
              <text x={X_BYP + 14} y={Y.chwp - 6} className={styles['t-tag']}>
                FCV-801
              </text>
              <text x={X_BYP + 14} y={Y.chwp + 8}>
                <Reading param={sys(SYSTEM_POINTS.bypassValve)} unit="% open" />
              </text>
              <text x={X_BYP + 14} y={Y.chwp + 22}>
                <tspan className={styles['t-label']}>BYPASS</tspan>
                <Reading param={sys(SYSTEM_POINTS.bypassFlow)} unit="m³/h" dx={5} />
              </text>
            </g>

            {/* riser differential pressure DPT-801 across the fab supply / return risers */}
            <g>
              <title>DPT-801 riser differential pressure (fab supply - return)</title>
              <line x1={X_SUP + 2.5} y1={300} x2={836} y2={300} className={styles.impulse} />
              <line x1={864} y1={300} x2={X_RET - 2.5} y2={300} className={styles.impulse} />
              <circle cx={850} cy={300} r={14} className={styles.instrument} />
              <line x1={836} y1={300} x2={864} y2={300} className={styles.instrument} />
              <text x={850} y={297} textAnchor="middle" className={styles['t-isa']}>
                DPT
              </text>
              <text x={850} y={309} textAnchor="middle" className={styles['t-isa']}>
                801
              </text>
              <text x={850} y={279} textAnchor="middle" className={styles['t-label']}>
                RISER ΔP
              </text>
              <text x={850} y={332} textAnchor="middle">
                <Reading param={sys(SYSTEM_POINTS.riserDp)} unit={SYSTEM_POINTS.riserDp.unit} />
              </text>
            </g>

            {/* fab load: the MAU cooling coils of FAB1 */}
            <g>
              <rect
                x={780}
                y={Y.fabTop}
                width={140}
                height={Y.fabBottom - Y.fabTop}
                rx={4}
                className={styles.fab}
              />
              <text x={790} y={Y.fabTop + 17} className={styles['t-tag']}>
                FAB1 load
              </text>
              <text x={790} y={Y.fabTop + 30} className={styles['t-sub']}>
                MAU cooling coils
              </text>
              <ValueRow
                x={790}
                y={Y.fabTop + 48}
                w={120}
                point={SYSTEM_POINTS.fabFlow}
                param={sys(SYSTEM_POINTS.fabFlow)}
              />
            </g>
          </svg>
        </div>

        <footer className={styles['po-legend']}>
          {[
            StatusEnum.enum.RUNNING,
            StatusEnum.enum.IDLE,
            StatusEnum.enum['UNPLANNED DOWN'],
            StatusEnum.enum['PLANNED DOWN'],
            StatusEnum.enum.OFFLINE,
          ].map((s) => (
            <span key={s}>
              <i style={{ background: STATUS_COLOR[s] }} />
              {UNIT_STATE_LABEL[s]}
            </span>
          ))}
          <span className={styles['po-legend__sep']} />
          {(
            [
              ['chws', 'CHW supply'],
              ['chwr', 'CHW return'],
              ['cws', 'CW supply'],
              ['cwr', 'CW return'],
            ] as const
          ).map(([m, label]) => (
            <span key={m}>
              <b className={styles[`swatch--${m}`]} />
              {label}
            </span>
          ))}
          <span className={styles['po-legend__sep']} />
          <span>
            <em className={styles['po-legend__override']}>MAN</em>
            Operator override
          </span>
        </footer>
      </div>
    </div>
  );
};
