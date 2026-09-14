import { Button, TooltipContent } from '@digital-twin/components';
import {
  ChevronDown,
  ChevronUp,
  Close,
  Fullscreen,
  Keypad,
  Navigate,
  NotificationsActive,
  UserMan,
} from '@digital-twin/icons';
import clsx from 'clsx';
import { KeyboardEvent, SVGProps, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TwinAssetTarget } from '../../digital-twin.navigation';
import { TwinNode } from '../../digital-twin.types';
import { WalkLookMode } from '../../viewer/twin-viewer';
import { TeleportEquipment, TeleportLocation, TeleportMenu } from './teleport-menu';
import styles from './walk.module.scss';
import { TwinLiveEventFeed, WalkEventList, WalkEventToasts } from './walk-events';

const HELP_KEY = 'digitalTwin.walkHelpOpen';
/** without a stored choice the controls help starts open on a view at least this wide (px) */
const HELP_OPEN_MIN_WIDTH = 900;
/** how often the HUD re-reads where the player stands */
const PLACE_MS = 400;
/** the view's top edge kept clear for the bar: the dashboard card starts below it */
export const INSET_TOP_VAR = '--twin-inset-top';
/** gap between the bar and the card */
const INSET_GAP = 8;

/** keys walk mode takes document-wide (teleport menu, jump, move) that a focused control keeps */
const CONTROL_KEYS = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/**
 * Keyboard guard of the twin page while walking (its onKeyDown): on the page's own controls (the
 * HUD, teleport menu, dashboards, plant overview, tree) Tab moves the focus, Space presses the
 * button and the arrows navigate, instead of opening the teleport menu, jumping and moving. The
 * key stops before it reaches walk mode's document listener. The 3D view (`view`, focused by a
 * click into it) keeps them; letters (W A S D E T G F) stay walk keys everywhere.
 */
export const keepControlKeys = (e: KeyboardEvent, view: Element | null) => {
  if (!CONTROL_KEYS.has(e.code)) return;
  const target = e.target as Node;
  if (view?.contains(target)) return;
  e.stopPropagation();
};

/** the user's last choice, null when there is none */
const readHelpOpen = () => {
  try {
    const v = window.localStorage.getItem(HELP_KEY);
    return v === null ? null : v !== 'false';
  } catch {
    return null;
  }
};

export type WalkPanel = 'teleport' | 'events' | null;

/** the key list; mouse look reads differently when the browser refuses pointer lock */
const controlsFor = (lookMode: WalkLookMode): [string, string][] => [
  ['W A S D / arrows', 'Move'],
  ['Shift', 'Run'],
  ['Space', 'Jump'],
  lookMode === 'drag'
    ? ['Drag', 'Look around']
    : ['Mouse', 'Look around (click the view first, or drag)'],
  lookMode === 'drag'
    ? ['E / click', 'Select what the crosshair / the cursor points at']
    : ['E / click', 'Select what the crosshair points at'],
  ['T', 'Ask the AI assistant'],
  ['G', 'Go to the newest live event'],
  ['Tab', 'Teleport menu'],
  ['F', 'Full screen on / off'],
  ['Esc', lookMode === 'drag' ? 'Leave walk mode' : 'Free the mouse; again to leave walk mode'],
];

/** Material "fullscreen exit" glyph (the icon set has no exit variant of Fullscreen) */
const FullscreenExit = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
      fill="currentColor"
    />
  </svg>
);

/** Crosshair in the view centre with the name and tag of what it points at */
const Crosshair = ({
  target,
  locked,
  lookMode,
}: {
  target?: TwinNode;
  locked: boolean;
  lookMode: WalkLookMode;
}) => {
  const tag = target?.props.dt_tag ? String(target.props.dt_tag) : '';
  return (
    <div className={styles['walk-aim']} aria-hidden={!target}>
      <div className={clsx(styles['walk-aim__cross'], target && styles['walk-aim__cross--on'])} />
      {target ? (
        <div className={styles['walk-aim__target']} role="status">
          <strong>{target.name}</strong>
          {tag && tag !== target.name ? <em>{tag}</em> : null}
          <span>
            <kbd className={styles['walk-key']}>E</kbd> select
          </span>
        </div>
      ) : null}
      {!locked ? (
        <div className={styles['walk-aim__hint']}>
          {lookMode === 'drag'
            ? 'Drag to look around · click to select'
            : 'Click the view to look around'}{' '}
          · <kbd className={styles['walk-key']}>Esc</kbd> leaves walk mode
        </div>
      ) : null}
    </div>
  );
};

/**
 * Controls help: a key list that folds to a single chip. The choice is remembered per browser;
 * before there is one, it starts open unless the view is narrow (it would cover much of it).
 */
const WalkHelp = ({ lookMode }: { lookMode: WalkLookMode }) => {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(() => readHelpOpen() ?? true);
  useLayoutEffect(() => {
    const width = ref.current?.parentElement?.clientWidth ?? 0;
    if (readHelpOpen() === null && width && width < HELP_OPEN_MIN_WIDTH) setOpen(false);
  }, []);
  const toggle = () =>
    setOpen((o) => {
      try {
        window.localStorage.setItem(HELP_KEY, String(!o));
      } catch {
        // storage unavailable: the choice just isn't remembered
      }
      return !o;
    });
  return (
    <section
      ref={ref}
      className={clsx(styles['walk-panel'], styles['walk-help'])}
      aria-label="Walk controls"
    >
      <button
        type="button"
        className={styles['walk-help__toggle']}
        aria-expanded={open}
        onClick={toggle}
      >
        <Keypad aria-hidden="true" />
        <span>Controls</span>
        {open ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
      </button>
      {open ? (
        <dl className={styles['walk-help__keys']}>
          {controlsFor(lookMode).map(([keys, action]) => (
            <div key={keys}>
              <dt>{keys}</dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
};

type WalkHudProps = {
  /** mouse look is on (pointer locked) */
  locked: boolean;
  /** pointer lock, or drag-look when the browser refuses pointer lock */
  lookMode: WalkLookMode;
  /** full screen (F): on / off and the toggle (runs in the click, a user gesture) */
  fullscreen: { on: boolean; onToggle: () => void };
  /** what the crosshair points at */
  target?: TwinNode;
  /** name of the building part the player stands in (polled), null outside every one */
  place: () => string | null;
  /** the rendered scope, shown when the player stands in no building part */
  scopeName: string;
  panel: WalkPanel;
  onPanel: (panel: WalkPanel) => void;
  onExit: () => void;
  teleport: {
    locations: TeleportLocation[];
    equipment: TeleportEquipment[];
    onLocation: (id: string) => void;
    onEquipment: (id: string) => void;
  };
  events: {
    /** false while a simulation is replayed (the feed is live only) */
    available: boolean;
    feed: TwinLiveEventFeed;
    targetOf: (alias: string) => TwinAssetTarget | 'wait';
    onTeleport: (alias: string) => void;
  };
};

/**
 * Heads-up display of walk mode over the 3D view: where the player is, Teleport / Events / Exit,
 * the crosshair with its target, the controls help and the live event toasts. The equipment and
 * instrument dashboards keep working as in the orbit view.
 */
export const WalkHud = ({
  locked,
  lookMode,
  fullscreen,
  target,
  place,
  scopeName,
  panel,
  onPanel,
  onExit,
  teleport,
  events,
}: WalkHudProps) => {
  const [where, setWhere] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setWhere(place());
    read();
    const timer = setInterval(read, PLACE_MS);
    return () => clearInterval(timer);
  }, [place]);

  // the dashboard card starts below the bar instead of under it (the bar wraps on a narrow view,
  // so its height varies): its bottom edge goes to the view as --twin-inset-top
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = rootRef.current?.parentElement;
    const bar = barRef.current;
    if (!host || !bar) return;
    const publish = () => {
      const bottom =
        bar.getBoundingClientRect().bottom - host.getBoundingClientRect().top - host.clientTop;
      host.style.setProperty(INSET_TOP_VAR, `${Math.ceil(bottom + INSET_GAP)}px`);
    };
    publish();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    ro?.observe(bar);
    return () => {
      ro?.disconnect();
      host.style.removeProperty(INSET_TOP_VAR);
    };
  }, []);

  const count = events.feed.events.length;
  return (
    <div ref={rootRef} className={styles.walk}>
      <div className={styles['walk-top']}>
        <div ref={barRef} className={clsx(styles['walk-panel'], styles['walk-bar'])}>
          <div className={styles['walk-bar__place']} title="Where you are">
            <UserMan aria-hidden="true" />
            <div>
              <span>{where ? 'You are in' : 'Walking in'}</span>
              <strong>{where ?? scopeName}</strong>
            </div>
          </div>
          <div className={styles['walk-bar__actions']}>
            <Button
              icon={<Navigate />}
              color={panel === 'teleport' ? 'default-primary' : 'default-secondary'}
              className={styles['walk-btn']}
              aria-expanded={panel === 'teleport'}
              onClick={() => onPanel(panel === 'teleport' ? null : 'teleport')}
            >
              Teleport <kbd className={styles['walk-key']}>Tab</kbd>
            </Button>
            {events.available ? (
              <Button
                icon={<NotificationsActive />}
                color={panel === 'events' ? 'default-primary' : 'default-secondary'}
                className={styles['walk-btn']}
                aria-expanded={panel === 'events'}
                onClick={() => onPanel(panel === 'events' ? null : 'events')}
              >
                Events{count ? <span className={styles['walk-count']}>{count}</span> : null}
              </Button>
            ) : null}
            <div className={styles['walk-tip-host']}>
              <Button
                icon={fullscreen.on ? <FullscreenExit /> : <Fullscreen />}
                color={fullscreen.on ? 'default-primary' : 'default-secondary'}
                className={clsx(styles['walk-btn'], styles['walk-btn--icon'])}
                aria-label={fullscreen.on ? 'Exit full screen (F)' : 'Full screen (F)'}
                aria-pressed={fullscreen.on}
                onClick={(e) => {
                  // the tip would stay up on the focused button over the view
                  e.currentTarget.blur();
                  fullscreen.onToggle();
                }}
              />
              <TooltipContent
                position="top-end"
                content={fullscreen.on ? 'Exit full screen (F)' : 'Full screen (F)'}
                className={styles['walk-tip']}
                contentStyle={{ fontSize: 14, lineHeight: '20px' }}
              />
            </div>
            <Button icon={<Close />} className={styles['walk-btn']} onClick={onExit}>
              Exit walk
            </Button>
          </div>
        </div>
        {panel === 'teleport' ? (
          <TeleportMenu {...teleport} onClose={() => onPanel(null)} />
        ) : panel === 'events' && events.available ? (
          <section
            className={clsx(styles['walk-panel'], styles['walk-events'])}
            aria-label="Live events"
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return;
              e.stopPropagation();
              onPanel(null);
            }}
          >
            <h5 className={styles['walk-menu__heading']}>Live events · last hour</h5>
            <WalkEventList
              feed={events.feed}
              targetOf={events.targetOf}
              onTeleport={events.onTeleport}
            />
          </section>
        ) : null}
      </div>
      <Crosshair target={target} locked={locked} lookMode={lookMode} />
      <WalkHelp lookMode={lookMode} />
      {events.available ? (
        <WalkEventToasts
          feed={events.feed}
          targetOf={events.targetOf}
          onTeleport={events.onTeleport}
        />
      ) : null}
    </div>
  );
};
