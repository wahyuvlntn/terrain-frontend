import { TooltipContent } from '@digital-twin/components';
import {
  ArrowUp,
  ChartMonitoring,
  Flowsheet,
  FlowsheetFill,
  HideEye,
  Home,
  Layers,
  LayersFill,
  Palette,
  ShowEyeFill,
  Tags,
  TagsFill,
  UserMan,
  UserManFill,
} from '@digital-twin/icons';
import clsx from 'clsx';
import { PointerEvent, ReactNode, useRef, useState } from 'react';

import styles from '../digital-twin.module.scss';

type ToolbarButtonProps = {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

/** Icon button with the app's tooltip bubble on hover / keyboard focus (left of the toolbar) */
const ToolbarButton = ({ title, active, disabled, onClick, children }: ToolbarButtonProps) => (
  <div className={styles['twin-toolbar__item']}>
    <button
      type="button"
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      className={clsx(
        styles['twin-toolbar__button'],
        active && styles['twin-toolbar__button--active']
      )}
      onClick={onClick}
    >
      {children}
    </button>
    <TooltipContent
      position="right"
      content={title}
      className={styles['twin-toolbar__tip']}
      contentStyle={{ fontSize: 14, lineHeight: '20px' }}
    />
  </div>
);

/** a press that moves further than this (px) is a drag onto the view, not a click */
const DRAG_PX = 8;

const inside = (el: Element | null | undefined, x: number, y: number) => {
  const r = el?.getBoundingClientRect();
  return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

export type WalkDragHandlers = {
  /** the button is dragged over the page: preview the landing spot; true / false = valid / not, null = not over the view */
  onDrag: (clientX: number, clientY: number) => boolean | null;
  /** dropped: land there (when over the view) */
  onDrop: (clientX: number, clientY: number) => void;
  /** the drag was cancelled (Esc, lost pointer) */
  onCancel: () => void;
};

type WalkButtonProps = WalkDragHandlers & {
  walking: boolean;
  disabled?: boolean;
  /** a plain click: enter walk mode at the view's entry point, or leave it */
  onToggle: () => void;
};

/**
 * Walk mode button (person icon): click to walk from the view's entry point, or drag it onto the
 * 3D view to choose where to land (the view previews the spot; a ghost person follows the pointer).
 * A drag released on the button itself is a click (a press that drifted); one released elsewhere
 * on the toolbar is cancelled (the toolbar is not a landing spot: the view behind it is hidden).
 */
const WalkButton = ({ walking, disabled, onToggle, onDrag, onDrop, onCancel }: WalkButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ x: number; y: number; id: number } | null>(null);
  /** the click event that follows a drag's pointerup is not a click */
  const dragged = useRef(false);
  const [ghost, setGhost] = useState<{ x: number; y: number; valid: boolean | null } | null>(null);
  /**
   * After a click the tooltip stays hidden until the pointer leaves the button: walk mode starts
   * under the pointer and a lingering tip would cover the HUD
   */
  const [quiet, setQuiet] = useState(false);
  const title = walking
    ? 'Leave walk mode'
    : 'Walk (first person): click, or drag onto the view to choose where to land';

  const toolbar = () => buttonRef.current?.closest('[data-twin-toolbar]');

  const end = (cancelled: boolean, e?: PointerEvent) => {
    const wasDragging = !!ghost;
    press.current = null;
    setGhost(null);
    if (!wasDragging) return;
    // back on the button: the click this pointerup dispatches goes through
    if (!cancelled && e && inside(buttonRef.current, e.clientX, e.clientY)) {
      onCancel();
      return;
    }
    // swallow the click this pointerup may still dispatch (same task), never a later one
    dragged.current = true;
    setTimeout(() => {
      dragged.current = false;
    }, 0);
    if (cancelled || !e || inside(toolbar(), e.clientX, e.clientY)) onCancel();
    else onDrop(e.clientX, e.clientY);
  };

  return (
    <div className={styles['twin-toolbar__item']}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={title}
        aria-pressed={walking}
        disabled={disabled}
        className={clsx(
          styles['twin-toolbar__button'],
          styles['twin-toolbar__button--walk'],
          walking && styles['twin-toolbar__button--active']
        )}
        onPointerLeave={() => setQuiet(false)}
        onFocus={() => setQuiet(false)}
        onPointerDown={(e) => {
          if (e.button !== 0 || disabled) return;
          press.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          dragged.current = false;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          if (!ghost && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_PX) return;
          // over the toolbar there is nowhere to land (no preview of the view hidden behind it)
          const overToolbar = inside(toolbar(), e.clientX, e.clientY);
          if (overToolbar) onCancel();
          setGhost({
            x: e.clientX,
            y: e.clientY,
            valid: overToolbar ? null : onDrag(e.clientX, e.clientY),
          });
        }}
        onPointerUp={(e) => end(false, e)}
        onPointerCancel={() => end(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && ghost) {
            e.stopPropagation();
            end(true);
          }
        }}
        onClick={(e) => {
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          setQuiet(true);
          e.currentTarget.blur();
          onToggle();
        }}
      >
        {walking ? <UserManFill /> : <UserMan />}
      </button>
      {ghost ? (
        <span
          className={styles['twin-toolbar__ghost']}
          data-valid={ghost.valid === null ? undefined : String(ghost.valid)}
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden="true"
        >
          <UserManFill />
        </span>
      ) : quiet ? null : (
        <TooltipContent
          position="right"
          content={title}
          className={styles['twin-toolbar__tip']}
          contentStyle={{ fontSize: 14, lineHeight: '20px' }}
        />
      )}
    </div>
  );
};

type TwinToolbarProps = {
  /** walk mode (first person): on / off and its drag-to-land handlers */
  walk: WalkDragHandlers & { walking: boolean; disabled?: boolean; onToggle: () => void };
  isolate: boolean;
  showTags: boolean;
  /** 3D equipment tinted by its live status (standby, trip, maintenance, offline) */
  statusTint: boolean;
  /** building walls, slabs and roofs translucent (true) or solid (false) */
  seeThrough: boolean;
  /** dashboard of the selection: open / closed, or undefined when the selection has none */
  dashboard?: boolean;
  /** BMS plant overview: open / closed, or undefined when the twin has no chiller plant */
  overview?: boolean;
  onUp: () => void;
  onReset: () => void;
  onToggleIsolate: () => void;
  onToggleTags: () => void;
  onToggleStatusTint: () => void;
  onToggleSeeThrough: () => void;
  onToggleDashboard: () => void;
  onToggleOverview: () => void;
};

export const TwinToolbar = ({
  walk,
  isolate,
  showTags,
  statusTint,
  seeThrough,
  dashboard,
  overview,
  onUp,
  onReset,
  onToggleIsolate,
  onToggleTags,
  onToggleStatusTint,
  onToggleSeeThrough,
  onToggleDashboard,
  onToggleOverview,
}: TwinToolbarProps) => (
  <div className={styles['twin-toolbar']} data-twin-toolbar="">
    <WalkButton {...walk} />
    <ToolbarButton title={walk.walking ? 'Up one level' : 'Up one level (Esc)'} onClick={onUp}>
      <ArrowUp />
    </ToolbarButton>
    <ToolbarButton
      title={walk.walking ? 'Frame selection (orbit view only)' : 'Frame selection'}
      disabled={walk.walking}
      onClick={onReset}
    >
      <Home />
    </ToolbarButton>
    <ToolbarButton title="Isolate selection" active={isolate} onClick={onToggleIsolate}>
      {isolate ? <LayersFill /> : <Layers />}
    </ToolbarButton>
    <ToolbarButton title="Show instrument tags" active={showTags} onClick={onToggleTags}>
      {showTags ? <TagsFill /> : <Tags />}
    </ToolbarButton>
    <ToolbarButton
      title="Status tint (standby, trip, maintenance, offline)"
      active={statusTint}
      onClick={onToggleStatusTint}
    >
      <Palette />
    </ToolbarButton>
    <ToolbarButton
      title={
        seeThrough
          ? 'See-through walls: on (click for solid walls)'
          : 'See-through walls: off, walls are solid (click to see through them)'
      }
      active={seeThrough}
      onClick={onToggleSeeThrough}
    >
      {seeThrough ? <ShowEyeFill /> : <HideEye />}
    </ToolbarButton>
    <ToolbarButton
      title={
        dashboard === undefined
          ? 'Dashboard: select equipment or an instrument'
          : dashboard
            ? 'Hide dashboard'
            : 'Show dashboard'
      }
      active={dashboard}
      disabled={dashboard === undefined}
      onClick={onToggleDashboard}
    >
      <ChartMonitoring />
    </ToolbarButton>
    <ToolbarButton
      title={
        overview === undefined
          ? 'Plant overview: no chiller plant here'
          : overview
            ? 'Hide plant overview'
            : 'Plant overview'
      }
      active={overview}
      disabled={overview === undefined}
      onClick={onToggleOverview}
    >
      {overview ? <FlowsheetFill /> : <Flowsheet />}
    </ToolbarButton>
  </div>
);
