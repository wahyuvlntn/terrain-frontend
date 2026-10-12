import { InfoTooltip } from '@digital-twin/components';
import { ChevronLeftFill, ChevronRightFill } from '@digital-twin/icons';
import clsx from 'clsx';
import { ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { assistantStore } from '../ai-assistant/ai-assistant.store';
import { setAssistantContext } from '../ai-assistant/assistant-context';
import { TwinDetails, TwinToolbar, TwinTree } from './components';
import { EquipmentDashboard, InstrumentDashboard, TwinOverlay } from './components/overlay';
import { PLANT_OVERVIEW_HOST, PlantOverview } from './components/overlay/plant-overview';
import { ReplayBanner, ReplayBar } from './components/replay';
import {
  eventToVisit,
  keepControlKeys,
  useTwinLiveEvents,
  WalkHud,
  WalkHudHandle,
  WalkPanel,
} from './components/walk';
import { hasPlant, TWIN_NODE_OF_ASSET } from './digital-twin.bms';
import { useTwinFullscreen } from './digital-twin.fullscreen';
import { TwinWalkKey, useDigitalTwin } from './digital-twin.hook';
import styles from './digital-twin.module.scss';
import { twinLocationsWithScene } from './digital-twin.navigation';
import { ReplayProvider, useTwinSource } from './digital-twin.source';

const DETAILS_KEY = 'digitalTwin.detailsOpen';
const TREE_KEY = 'digitalTwin.treeOpen';
/** how long a navigation note stays over the view */
const NOTE_MS = 6000;

/** a side panel's open state, remembered per browser (open unless closed before) */
const readPanelOpen = (key: string) => {
  try {
    return window.localStorage.getItem(key) !== 'false';
  } catch {
    return true;
  }
};

type SidePanelProps = {
  /** localStorage key of the open state */
  storageKey: string;
  /** the side of the 3D view it stands on (the chevrons point that way to collapse) */
  side: 'left' | 'right';
  /** "Locations & assets", "Details" */
  label: string;
  className: string;
  children: ReactNode;
};

/**
 * A side panel that can be collapsed to a rail, to give the 3D view (and its dashboards) the
 * room. Collapsed, the panel only hides (the tree keeps its search and expanded items); the focus
 * moves to the rail's button and back to the panel's collapse button, so the keyboard stays
 * where it was.
 */
const SidePanel = ({ storageKey, side, label, className, children }: SidePanelProps) => {
  const [open, setOpen] = useState(() => readPanelOpen(storageKey));
  const id = useId();
  const collapseRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    (open ? collapseRef : railRef).current?.focus();
  }, [open]);
  const toggle = () => {
    refocus.current = true;
    setOpen((was) => {
      try {
        window.localStorage.setItem(storageKey, String(!was));
      } catch {
        // storage unavailable: the choice just isn't remembered
      }
      return !was;
    });
  };
  const Collapse = side === 'left' ? ChevronLeftFill : ChevronRightFill;
  const Expand = side === 'left' ? ChevronRightFill : ChevronLeftFill;
  return (
    <>
      <aside id={id} className={clsx(styles.panel, className)} hidden={!open} aria-label={label}>
        <button
          ref={collapseRef}
          type="button"
          className={styles.panel__collapse}
          title={`Hide ${label.toLowerCase()}`}
          aria-label={`Hide ${label.toLowerCase()}`}
          aria-expanded={true}
          aria-controls={id}
          onClick={toggle}
        >
          <Collapse />
        </button>
        {children}
      </aside>
      {!open ? (
        <button
          ref={railRef}
          type="button"
          className={clsx(styles.panel, styles['panel--rail'])}
          title={`Show ${label.toLowerCase()}`}
          aria-label={`Show ${label.toLowerCase()}`}
          aria-expanded={false}
          aria-controls={id}
          onClick={toggle}
        >
          <Expand />
          <span>{label}</span>
        </button>
      ) : null}
    </>
  );
};

/**
 * Focus the AI assistant's question box when its panel is open already (T while walking): it
 * moves the focus there itself only when it opens. While a conversation loads the box is
 * disabled and the panel takes the focus, as it does itself.
 */
const focusOpenAssistant = () => {
  const panel = document.querySelector<HTMLElement>('[data-ai-assistant-panel]:not([hidden])');
  if (!panel) return;
  (panel.querySelector<HTMLElement>('textarea:not(:disabled)') ?? panel).focus();
};

/**
 * Digital twin page. The data source is the live plant, or the replay of a simulation job when
 * the URL carries `?replay=<job>` (the provider is always there, so switching never reloads 3D).
 * Deep links and the AI assistant open a target with `?asset=&param=&location=&panel=&view=walk`
 * (digital-twin.navigation.ts).
 */
export const DigitalTwin = () => (
  <ReplayProvider>
    <DigitalTwinView />
  </ReplayProvider>
);

const DigitalTwinView = () => {
  /** keys of walk mode, handled below (they need the event feed and the panels) */
  const walkKeyRef = useRef<(key: TwinWalkKey) => void>(() => undefined);
  const {
    containerRef,
    viewerRef,
    overlay,
    activeAssetAlias,
    selectParameter,
    hasInstrument,
    selectAsset,
    tree,
    locationTree,
    path,
    activeId,
    activeNode,
    selectionKey,
    hoverNode,
    scopeId,
    scopeName,
    hasModels,
    hasEquipment,
    isLocationsLoading,
    isLocationsError,
    isLoading,
    progress,
    error,
    isolate,
    setIsolate,
    showTags,
    setShowTags,
    statusTint,
    setStatusTint,
    seeThrough,
    setSeeThrough,
    labelsOnHover,
    setLabelsOnHover,
    selectNode,
    goUp,
    resetView,
    overviewOpen,
    setOverviewOpen,
    note,
    showNote,
    walk,
    exitHold,
    walkTarget,
    toggleWalk,
    previewWalk,
    dropWalk,
    cancelWalkDrag,
    exitWalk,
    teleport,
    assetTarget,
    walkPlace,
    teleportEquipment,
  } = useDigitalTwin({
    labelClassName: styles['twin-label'],
    badgeClassName: styles['twin-badge'],
    onWalkKey: (key) => walkKeyRef.current(key),
  });
  const replay = useTwinSource().replay;
  const walking = walk.walking;

  // tell the AI assistant what the user is looking at (selection, its equipment, a replayed job,
  // walk mode)
  const assetAlias = overlay?.asset.alias ?? activeAssetAlias;
  const replayJobId = replay?.jobId ?? undefined;
  useEffect(() => {
    setAssistantContext({
      page: 'digital-twin',
      nodeId: activeId || undefined,
      assetAlias,
      replayJobId,
      view: walking ? 'walk' : undefined,
    });
  }, [activeId, assetAlias, replayJobId, walking]);
  useEffect(
    () => () =>
      setAssistantContext({
        page: undefined,
        nodeId: undefined,
        assetAlias: undefined,
        replayJobId: undefined,
        view: undefined,
      }),
    []
  );
  /**
   * A closed dashboard stays closed for that selection only: selecting another node, or the same
   * node again, reopens it (so does the toolbar toggle).
   */
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const dashboardOpen = !!overlay && dismissedKey !== selectionKey;

  /**
   * BMS plant overview over the 3D view; while it is shown the selection's dashboard is hidden.
   * Only a twin that holds the chiller plant shows it, whatever `overviewOpen` says.
   */
  const plantAvailable = useMemo(() => hasPlant(tree), [tree]);
  const overviewShown = overviewOpen && plantAvailable;
  const dashboardShown = !!overlay && dashboardOpen && !overviewShown && !isLoading;
  const closeOverview = useCallback(() => setOverviewOpen(false), [setOverviewOpen]);
  /** a unit clicked in the overview: select its 3D equipment so its dashboard shows */
  const showUnit = useCallback(
    (alias: string) => {
      setOverviewOpen(false);
      const nodeId = TWIN_NODE_OF_ASSET.get(alias);
      // selectAsset only finds equipment of the rendered scope; anything else (e.g. a tower while
      // the plant room is shown) is selected by its node, which renders it on its own
      if (nodeId && !viewerRef.current?.getNode(nodeId)) selectNode(nodeId);
      else selectAsset(alias);
    },
    [viewerRef, selectNode, selectAsset, setOverviewOpen]
  );

  // ------------------------------------------------------------------ walk mode
  /** live alarms / faults / anomalies / trips: polled only while walking through the live plant */
  const feed = useTwinLiveEvents(walking && !replay);
  /** the HUD's drop-down: teleport menu or the recent events */
  const [walkPanel, setWalkPanel] = useState<WalkPanel>(null);
  /** the HUD's controls help (C) and event toasts (Esc) */
  const hudRef = useRef<WalkHudHandle>(null);
  useEffect(() => {
    if (!walking) setWalkPanel(null);
  }, [walking]);
  /**
   * Full screen (walk mode only): the 3D view covers the window, under the AI assistant, toasts
   * and pop-ups; the browser's full screen when it grants it, else maximised in the window
   */
  const fullscreen = useTwinFullscreen(walking);
  /** a user gesture: F, or the HUD's button. Mouse look locked before resumes once in full screen */
  const toggleFullscreen = () => {
    const relock = walk.locked;
    fullscreen.toggle(() => {
      if (relock && !document.pointerLockElement) viewerRef.current?.lockPointer();
    });
  };

  walkKeyRef.current = (key) => {
    switch (key) {
      case 'T':
        // the viewer has freed the mouse; the assistant focuses its question box when it opens,
        // and here when it is open already
        assistantStore.setOpen(true);
        focusOpenAssistant();
        break;
      case 'F':
        toggleFullscreen();
        break;
      case 'G': {
        if (replay) {
          showNote('Live events are off during a replay');
          break;
        }
        // the newest event on equipment in 3D (one without a model would leave the player put)
        const next = eventToVisit(feed.events, assetTarget);
        if (next) {
          setWalkPanel(null);
          teleport({ kind: 'asset', alias: next.asset.alias });
        } else
          showNote(
            feed.events.length
              ? 'None of the live events is on equipment modelled in 3D'
              : 'No live events yet'
          );
        break;
      }
      case 'Tab':
        setWalkPanel((p) => (p === 'teleport' ? null : 'teleport'));
        break;
      case 'C':
        hudRef.current?.toggleHelp();
        break;
      case 'Escape':
        // a press closes one thing: the HUD's drop-down, the plant overview (its own handler),
        // the dashboard, else the newest live event notification. Holding Esc leaves (Exit).
        if (walkPanel) setWalkPanel(null);
        else if (overviewShown) break;
        else if (dashboardShown) setDismissedKey(selectionKey);
        else hudRef.current?.dismissToast();
        break;
      case 'Exit':
        exitWalk();
        break;
    }
  };

  const teleportLocations = useMemo(
    () =>
      twinLocationsWithScene(locationTree).map(({ node, depth }) => ({
        id: node.id,
        name: node.name,
        depth,
        current: node.id === scopeId,
      })),
    [locationTree, scopeId]
  );

  /** a teleport from the menu: mouse look resumes at once (the click is the user gesture) */
  const teleportFromMenu = (target: Parameters<typeof teleport>[0]) => {
    setWalkPanel(null);
    teleport(target);
    viewerRef.current?.lockPointer();
  };

  // navigation notes fade after a few seconds
  const [noteText, setNoteText] = useState<string | null>(null);
  useEffect(() => {
    if (!note) return;
    setNoteText(note.text);
    const timer = setTimeout(() => setNoteText(null), NOTE_MS);
    return () => clearTimeout(timer);
  }, [note]);

  return (
    // while walking, the page's controls keep Tab, Space and the arrows (walk mode takes them
    // document-wide, for the 3D view)
    <div
      className={styles['digital-twin']}
      onKeyDown={walking ? (e) => keepControlKeys(e, containerRef.current) : undefined}
    >
      <div className={styles['digital-twin__header']}>
        <nav className={styles['digital-twin__crumbs']} aria-label="Digital twin path">
          {path.map((node, i) => (
            <span key={node.id} className={styles['digital-twin__crumb']}>
              {i > 0 && <ChevronRightFill />}
              <button
                type="button"
                className={clsx(i === path.length - 1 && styles['digital-twin__crumb--current'])}
                onClick={() => selectNode(node.id)}
              >
                {node.name}
              </button>
            </span>
          ))}
        </nav>
        <InfoTooltip
          title="3D navigation"
          content={
            <>
              Click: drill down one level
              <br />
              Double-click: frame the object
              <br />
              Esc: up one level
              <br />
              Drag: orbit · Right-drag: pan · Wheel: zoom
              <br />
              Walk button (person): walk through the plant in first person; drag it onto the view to
              choose where to land. F while walking: full screen, C: controls, hold Esc: leave
            </>
          }
        />
      </div>

      {replay ? <ReplayBanner replay={replay} /> : null}

      <div
        className={clsx(
          styles['digital-twin__body'],
          fullscreen.immersive && styles['digital-twin__body--immersive'],
          PLANT_OVERVIEW_HOST
        )}
      >
        {/* the side panels collapse to rails, giving the 3D view (and its dashboards) the width */}
        <SidePanel
          storageKey={TREE_KEY}
          side="left"
          label="Locations & assets"
          className={styles['panel--tree']}
        >
          <TwinTree
            tree={tree}
            activeId={activeId}
            path={path}
            isLoading={isLocationsLoading}
            isError={isLocationsError}
            onSelect={selectNode}
          />
        </SidePanel>

        <section
          className={clsx(
            styles.viewport,
            replay && styles['viewport--replay'],
            walking && styles['viewport--walk']
          )}
        >
          <div
            ref={containerRef}
            className={styles.viewport__canvas}
            tabIndex={0}
            // Esc closes the plant overview first (its own handler), then goes up; in walk mode
            // Esc frees the mouse, then leaves walk mode (the viewer reports it)
            onKeyDown={(e) =>
              e.key === 'Escape' && !overviewShown && !viewerRef.current?.isWalking() && goUp()
            }
          />
          {walking ? (
            <WalkHud
              handleRef={hudRef}
              locked={walk.locked}
              exitHold={exitHold}
              lookMode={walk.lookMode}
              fullscreen={{ on: fullscreen.immersive, onToggle: toggleFullscreen }}
              target={walkTarget}
              place={walkPlace}
              scopeName={scopeName}
              panel={walkPanel}
              onPanel={setWalkPanel}
              onExit={exitWalk}
              teleport={{
                locations: teleportLocations,
                equipment: teleportEquipment,
                onLocation: (id) => teleportFromMenu({ kind: 'location', locationId: id }),
                onEquipment: (id) => teleportFromMenu({ kind: 'equipment', nodeId: id }),
              }}
              events={{
                available: !replay,
                feed,
                targetOf: assetTarget,
                onTeleport: (alias) => {
                  // the equipment's dashboard opens: the event list makes way for it
                  setWalkPanel(null);
                  teleport({ kind: 'asset', alias });
                },
              }}
            />
          ) : null}
          <TwinToolbar
            walk={{
              walking,
              disabled: isLoading || !hasModels,
              onToggle: toggleWalk,
              onDrag: previewWalk,
              onDrop: dropWalk,
              onCancel: cancelWalkDrag,
            }}
            isolate={isolate}
            showTags={showTags}
            labelsOnHover={labelsOnHover}
            statusTint={statusTint}
            seeThrough={seeThrough}
            onUp={goUp}
            onReset={resetView}
            onToggleIsolate={() => setIsolate((v) => !v)}
            onToggleTags={() => setShowTags((v) => !v)}
            onToggleLabelsOnHover={() => setLabelsOnHover(!labelsOnHover)}
            onToggleStatusTint={() => setStatusTint(!statusTint)}
            onToggleSeeThrough={() => setSeeThrough(!seeThrough)}
            dashboard={overlay ? dashboardOpen && !overviewShown : undefined}
            onToggleDashboard={() => {
              // the dashboard is hidden behind an open overview: showing it closes the overview
              if (overviewShown) {
                setOverviewOpen(false);
                setDismissedKey(null);
              } else setDismissedKey(dashboardOpen ? selectionKey : null);
            }}
            overview={plantAvailable ? overviewOpen : undefined}
            onToggleOverview={() => setOverviewOpen((v) => !v)}
          />
          {overlay && dashboardShown ? (
            <TwinOverlay
              viewerRef={viewerRef}
              nodeId={overlay.nodeId}
              onClose={() => setDismissedKey(selectionKey)}
            >
              {overlay.type === 'equipment' ? (
                <EquipmentDashboard
                  key={overlay.asset.id}
                  asset={overlay.asset}
                  onParameterClick={(alias) => selectParameter(overlay.equipmentNodeId, alias)}
                  hasInstrument={(alias) => hasInstrument(overlay.equipmentNodeId, alias)}
                  onPlantOverview={plantAvailable ? () => setOverviewOpen(true) : undefined}
                />
              ) : (
                <InstrumentDashboard
                  key={`${overlay.asset.id}-${overlay.paramAlias}`}
                  asset={overlay.asset}
                  paramAlias={overlay.paramAlias}
                  tag={overlay.tag}
                  partName={overlay.partName}
                  onEquipmentClick={() => selectAsset(overlay.asset.alias)}
                />
              )}
            </TwinOverlay>
          ) : null}
          {hoverNode && !isLoading && !walking ? (
            <div className={styles.viewport__hover}>
              {hoverNode.name}
              {hoverNode.props.dt_tag && hoverNode.kind !== 'equipment' ? (
                <em>{String(hoverNode.props.dt_tag)}</em>
              ) : null}
            </div>
          ) : null}
          {isLoading ? (
            <div className={styles.viewport__loading}>
              <span>Loading 3D model… {Math.round(progress * 100)}%</span>
              <div className={styles.viewport__progress}>
                <div style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          ) : null}
          {error ? <div className={styles.viewport__error}>{error}</div> : null}
          {hasModels && !hasEquipment && !isLoading && !error ? (
            <div className={styles.viewport__note}>
              No equipment modelled in {activeNode?.name ?? 'this location'} yet
            </div>
          ) : null}
          {noteText ? (
            <div className={styles.viewport__notice} role="status">
              {noteText}
            </div>
          ) : null}
          {!hasModels && !isLocationsLoading && !error ? (
            <div className={styles.viewport__empty}>
              <strong>No 3D model for {activeNode?.name ?? 'this location'}</strong>
              <span>Pick a location with equipment</span>
            </div>
          ) : null}
          {replay?.index ? <ReplayBar replay={replay} index={replay.index} /> : null}
        </section>

        <SidePanel
          storageKey={DETAILS_KEY}
          side="right"
          label="Details"
          className={styles['panel--details']}
        >
          <TwinDetails
            node={activeNode}
            binding={
              overlay && overlay.nodeId === activeNode?.id
                ? overlay.type === 'equipment'
                  ? overlay.asset.alias
                  : `${overlay.asset.alias} · ${overlay.paramAlias}`
                : null
            }
            onSelect={selectNode}
          />
        </SidePanel>

        {/* centred over the whole workspace, so the schematic stays legible beside the side panels */}
        {overviewShown ? (
          <PlantOverview
            onClose={closeOverview}
            onSelectUnit={showUnit}
            returnFocus={() => containerRef.current}
          />
        ) : null}
      </div>
    </div>
  );
};
