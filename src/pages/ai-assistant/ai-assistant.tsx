import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  TooltipContent,
} from '@digital-twin/components';
import { Close, Fullscreen, InformationCircle, Messages, Plus } from '@digital-twin/icons';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  KeyboardEvent,
  PointerEvent,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { NavigationType, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import styles from './ai-assistant.module.scss';
import { assistantStore, useAssistantOwner, useAssistantState } from './ai-assistant.store';
import { ASSISTANT_QUERY } from './api/ai-assistant.api';
import { AssistantContext, getAssistantContext, useAssistantContext } from './assistant-context';
import { BudgetMeter } from './components/budget-meter';
import { Composer } from './components/composer';
import { LEVO_ALERT_MS, Levo, LevoAlert, LevoMood, useLevoAlert } from './components/levo';
import { MessageList } from './components/message-list';
import { PdfDialog } from './components/pdf-dialog';
import { SectionHighlight } from './components/section-highlight';
import { SessionList } from './components/session-list';
import { canOpenTarget, navigationLink, navigationState, PAGE_TITLE } from './navigation';

// ---------------------------------------------------------------- panel size

type Size = { width: number; height: number };

const SIZE_KEY = 'aiAssistant.panelSize';
const MIN: Size = { width: 340, height: 420 };
/** room left around the panel inside the window */
const MARGIN = 32;
const KEY_STEP = 24;

/**
 * Set on the document root: the room LEVO takes at the bottom right of the window (20 px offset +
 * 80 px LEVO + a 12 px gap, see `.launcher`). Pages pad their controls there with
 * `var(--ai-launcher-inset, 0px)`.
 */
const LAUNCHER_INSET_VAR = '--ai-launcher-inset';
const LAUNCHER_INSET = '112px';

const clampSize = ({ width, height }: Size): Size => ({
  width: Math.round(Math.max(MIN.width, Math.min(width, window.innerWidth - MARGIN))),
  height: Math.round(Math.max(MIN.height, Math.min(height, window.innerHeight - MARGIN))),
});

const initialSize = (): Size => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SIZE_KEY) ?? 'null');
    if (saved && typeof saved.width === 'number' && typeof saved.height === 'number') {
      return clampSize(saved);
    }
  } catch {
    // no stored size
  }
  return clampSize({ width: 440, height: Math.min(680, window.innerHeight - 48) });
};

/** which way the resize grip grows the panel: -1 left / up, 1 right / down */
type Grip = { x: -1 | 1; y: -1 | 1 };

/** The panel size: dragged from its corner away from LEVO (`grip`, set as the bubble moves), remembered */
const usePanelSize = (grip: { current: Grip }) => {
  const [size, setSize] = useState<Size>(initialSize);
  const drag = useRef<{ x: number; y: number; size: Size } | null>(null);

  const save = useCallback((next: Size) => {
    try {
      window.localStorage.setItem(SIZE_KEY, JSON.stringify(next));
    } catch {
      // the size is just not remembered
    }
  }, []);

  useEffect(() => {
    const onResize = () => setSize((s) => clampSize(s));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handle = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { x: e.clientX, y: e.clientY, size };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d) return;
      setSize(
        clampSize({
          width: d.size.width + grip.current.x * (e.clientX - d.x),
          height: d.size.height + grip.current.y * (e.clientY - d.y),
        })
      );
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      if (!drag.current) return;
      drag.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setSize((s) => {
        save(s);
        return s;
      });
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      // the arrow moves the grip
      const move: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const step = move[e.key];
      if (!step) return;
      e.preventDefault();
      const next = clampSize({
        width: size.width + grip.current.x * step[0] * KEY_STEP,
        height: size.height + grip.current.y * step[1] * KEY_STEP,
      });
      setSize(next);
      save(next);
    },
  };

  return { size, handle };
};

// ---------------------------------------------------------------- free placement

/** Distance from the window's right / bottom edge: LEVO stays anchored there */
type Pos = { right: number; bottom: number };

const LAUNCHER_POS_KEY = 'aiAssistant.launcherPos';
/** LEVO's box (the launcher) */
const LEVO = 80;
const LAUNCHER_BOX = { width: LEVO, height: LEVO };
const EDGE = 12;
/** room between LEVO and the chat bubble, for the bubble's tail */
const TAIL_GAP = 14;
/** pointer travel before a press becomes a drag (a shorter one stays a click) */
const DRAG_SLOP = 4;

const readPos = (key: string): Pos | null => {
  try {
    const p = JSON.parse(window.localStorage.getItem(key) ?? 'null');
    return p && typeof p.right === 'number' && typeof p.bottom === 'number' ? p : null;
  } catch {
    return null;
  }
};

const savePos = (key: string, pos: Pos) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(pos));
  } catch {
    // the place is just not remembered
  }
};

const clampPos = (p: Pos, box: Size): Pos => ({
  right: Math.round(
    Math.min(Math.max(p.right, EDGE), Math.max(EDGE, window.innerWidth - box.width - EDGE))
  ),
  bottom: Math.round(
    Math.min(Math.max(p.bottom, EDGE), Math.max(EDGE, window.innerHeight - box.height - EDGE))
  ),
});

/**
 * Drag an element anywhere in the window (pointer); it keeps inside the window and its place is
 * remembered. Presses on buttons, fields, links and the resize grip are left alone, unless the
 * element itself is the button (the launcher: `data-drag-handle`).
 */
const useDragPosition = (key: string, box: Size, fallback: () => Pos) => {
  const [pos, setPos] = useState<Pos>(() => clampPos(readPos(key) ?? fallback(), box));
  /** a press is moving the element now */
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; from: Pos; moved: boolean } | null>(null);
  /** the last press moved the element: its click is not a click */
  const moved = useRef(false);
  const boxRef = useRef(box);
  boxRef.current = box;

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p, boxRef.current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // a larger panel (resized) must still fit where it is
  useEffect(
    () => setPos((p) => clampPos(p, { width: box.width, height: box.height })),
    [box.width, box.height]
  );

  const end = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d?.moved) return;
    moved.current = true;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    setPos((p) => {
      savePos(key, p);
      return p;
    });
  };

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      const target = e.target as HTMLElement;
      if (
        e.button !== 0 ||
        target.closest(
          'button:not([data-drag-handle]), input, textarea, select, a, [role="separator"]'
        )
      )
        return;
      drag.current = { x: e.clientX, y: e.clientY, from: pos, moved: false };
      moved.current = false;
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved) {
        if (Math.hypot(dx, dy) < DRAG_SLOP) return;
        d.moved = true;
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      setPos(clampPos({ right: d.from.right - dx, bottom: d.from.bottom - dy }, boxRef.current));
    },
    onPointerUp: end,
    // the browser took the pointer over (touch): the drag ends where it is
    onPointerCancel: end,
  };

  return {
    pos,
    dragging,
    handlers,
    /** true once after a drag, so the click that ends it is ignored */
    consumeMoved: () => {
      const m = moved.current;
      moved.current = false;
      return m;
    },
  };
};

/**
 * The chat bubble's place: above LEVO, or below it when the room above is too small for it and
 * the room below is larger; lined up with LEVO's right edge on the right half of the window (else
 * its left edge), inside the window, its tail (`tail`, from its left) pointing at LEVO. `grip`:
 * the resize grip sits on the corner away from LEVO.
 */
const bubbleAt = (levo: Pos, size: Size, expanded: boolean) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const levoLeft = vw - levo.right - LEVO;
  const levoTop = vh - levo.bottom - LEVO;
  const roomAbove = levoTop - TAIL_GAP - EDGE;
  const roomBelow = vh - levoTop - LEVO - TAIL_GAP - EDGE;
  const want = expanded ? { width: 980, height: vh } : size;
  const down = roomAbove < Math.min(want.height, MIN.height) && roomBelow > roomAbove;
  const width = Math.min(want.width, vw - 2 * EDGE);
  const height = Math.max(0, Math.min(want.height, down ? roomBelow : roomAbove));
  const onRight = levoLeft + LEVO / 2 > vw / 2;
  const left = Math.max(
    EDGE,
    Math.min(onRight ? levoLeft + LEVO - width : levoLeft, vw - width - EDGE)
  );
  return {
    left,
    top: down ? levoTop + LEVO + TAIL_GAP : levoTop - TAIL_GAP - height,
    width,
    height,
    tail: Math.max(24, Math.min(levoLeft + LEVO / 2 - left, width - 24)),
    down,
    grip: { x: onRight ? -1 : 1, y: down ? 1 : -1 } as Grip,
  };
};

// ---------------------------------------------------------------- context label

const pageLabel = (page: string) =>
  (PAGE_TITLE as Partial<Record<string, string>>)[page] ?? page.replace(/-/g, ' ');

const contextLabel = (c: AssistantContext) =>
  [
    c.page ? pageLabel(c.page) : '',
    c.assetAlias ?? '',
    typeof c.replayJobId === 'number' ? `replay of simulation #${c.replayJobId}` : '',
    c.view === 'walk' ? 'walk mode' : '',
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Register the store's navigator: the agent's `navigate` events of a question the user asked open
 * their page at once (react-router, inside the router), when the user may read that page. Also
 * tells the store when the user goes somewhere else by themselves (a link, Back), so an answer on
 * its way leaves them there; a page updating its own URL (replace: the twin applying a target,
 * a section highlight dropping its parameter) and the navigator's own moves don't count.
 */
const useAssistantNavigator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const { hasPermission } = useContext(AuthCtx);
  const access = useRef(hasPermission);
  access.current = hasPermission;
  const here = useRef(location);
  here.current = location;
  /** the URL the navigator opened last, until the router reports the move */
  const opened = useRef<string | null>(null);
  const seen = useRef(location.key);

  useEffect(() => {
    if (seen.current === location.key) return;
    seen.current = location.key;
    if (navigationType === NavigationType.Replace) return;
    const own = opened.current === `${location.pathname}${location.search}`;
    opened.current = null;
    if (!own) assistantStore.userNavigated();
  }, [location, navigationType]);

  useEffect(
    () =>
      assistantStore.setNavigator((target) => {
        if (!canOpenTarget(target, access.current)) return false;
        const link = navigationLink(target, here.current);
        opened.current = link;
        navigate(link, { state: navigationState(target, here.current) });
        return true;
      }),
    [navigate]
  );
};

// ---------------------------------------------------------------- LEVO's alert bubble

/**
 * What LEVO says about the fault or trip that just came in, beside the launcher: on the side of
 * the window's centre, so it stays inside the window wherever the launcher was dragged. Fades
 * out after LEVO_ALERT_MS. Decorative: the launcher's label says the same.
 */
const LevoSays = ({ alert, at }: { alert: LevoAlert; at: Pos }) => (
  <span
    className={clsx(styles.say, styles[`say--${alert.level}`])}
    data-v={at.bottom < window.innerHeight / 2 ? 'up' : 'down'}
    data-h={at.right < window.innerWidth / 2 ? 'right' : 'left'}
    style={{ animationDuration: `${LEVO_ALERT_MS}ms` }}
    aria-hidden="true"
  >
    <strong>{alert.label}</strong>
    {alert.text}
  </span>
);

// ---------------------------------------------------------------- panel

const Assistant = () => {
  const state = useAssistantState();
  const {
    open,
    expanded,
    showSessions,
    streaming,
    loading,
    messages,
    sessionId,
    sessionTitle,
    activeAgent,
    unread,
    sessionsVersion,
    focusRequest,
  } = state;
  const location = useLocation();
  useAssistantContext(); // re-render when the page publishes new context
  const context = getAssistantContext(location.pathname);
  const queryClient = useQueryClient();
  const grip = useRef<Grip>({ x: -1, y: -1 });
  const { size, handle } = usePanelSize(grip);
  // LEVO, and the chat bubble with it (dragged by LEVO or by the bubble's header)
  const launcher = useDragPosition(LAUNCHER_POS_KEY, LAUNCHER_BOX, () => ({
    right: 20,
    bottom: 20,
  }));
  const bubble = bubbleAt(launcher.pos, size, expanded);
  grip.current = bubble.grip;
  const panelId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(open);
  const focusSeen = useRef(focusRequest);
  useAssistantNavigator();
  const alert = useLevoAlert();
  const mood: LevoMood = launcher.dragging
    ? 'drag'
    : alert
      ? alert.level
      : streaming
        ? 'busy'
        : unread && !open
          ? 'unread'
          : 'idle';

  // the conversation list follows new answers, titles and deletions
  useEffect(() => {
    if (sessionsVersion) void queryClient.invalidateQueries({ queryKey: ASSISTANT_QUERY.sessions });
  }, [queryClient, sessionsVersion]);

  // LEVO's footprint, for pages that keep their bottom-right controls clear of it
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty(LAUNCHER_INSET_VAR, LAUNCHER_INSET);
    return () => {
      root.removeProperty(LAUNCHER_INSET_VAR);
    };
  }, []);

  // focus moves into the panel (the question box) whenever it opens, also when a page opens it
  // (the twin's walk mode), and back to the launcher when it closes. A request to open the panel
  // while it is open (`focusRequest`: the twin's T key after a click put the focus on the 3D
  // view) brings the focus back too. While a conversation loads the question box is disabled, so
  // the panel itself holds the focus (Esc keeps working) until the box is ready. Focus dropped to
  // the page inside the open panel (the conversation list closed, a conversation was chosen) also
  // returns to the box.
  // biome-ignore lint/correctness/useExhaustiveDependencies: showSessions: the list closing drops the focus
  useEffect(() => {
    const asked = focusSeen.current !== focusRequest;
    focusSeen.current = focusRequest;
    if (open) {
      const panel = panelRef.current;
      const active = document.activeElement;
      const lost = !active || active === document.body || active === panel;
      if (!wasOpen.current || lost || asked) {
        if (loading) panel?.focus();
        else inputRef.current?.focus();
      }
    } else if (wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open, loading, showSessions, focusRequest]);

  const onPanelKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    e.stopPropagation();
    if (showSessions) assistantStore.setShowSessions(false);
    else assistantStore.setOpen(false);
  };

  // once used, the panel stays mounted while closed, so simulation cards keep following their
  // jobs (and the follow-up message is sent) in the background
  const mounted = open || messages.length > 0 || loading;

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={styles.launcher}
        style={{ right: launcher.pos.right, bottom: launcher.pos.bottom }}
        data-drag-handle=""
        {...launcher.handlers}
        onClick={() => {
          if (launcher.consumeMoved()) return;
          assistantStore.setOpen(!open);
        }}
        aria-label={`${open ? 'Close' : 'Open'} LEVO${
          streaming ? ' (answering)' : unread && !open ? ' (new answer)' : ''
        }${alert ? `, ${alert.label}: ${alert.text}` : ''}`}
        aria-expanded={open}
        aria-controls={mounted ? panelId : undefined}
        title="LEVO"
      >
        <Levo key={alert?.at} mood={mood} />
        {alert && !open && !launcher.dragging ? <LevoSays alert={alert} at={launcher.pos} /> : null}
      </button>

      {mounted ? (
        <section
          id={panelId}
          ref={panelRef}
          tabIndex={-1}
          className={styles.panel}
          style={{ left: bubble.left, top: bubble.top, width: bubble.width, height: bubble.height }}
          role="dialog"
          aria-modal="false"
          aria-label="LEVO"
          hidden={!open}
          onKeyDown={onPanelKeyDown}
          // pages with their own keyboard handling (the twin's walk mode) leave keys in here alone
          data-ai-assistant-panel=""
        >
          {!expanded ? (
            <div
              className={styles.panel__resize}
              data-grip={`${bubble.grip.y < 0 ? 't' : 'b'}${bubble.grip.x < 0 ? 'l' : 'r'}`}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the assistant panel (arrow keys)"
              aria-valuemin={MIN.width}
              aria-valuemax={window.innerWidth - MARGIN}
              aria-valuenow={size.width}
              tabIndex={0}
              {...handle}
            />
          ) : null}

          <header
            className={styles.panel__header}
            data-draggable=""
            title="Drag to move LEVO"
            {...launcher.handlers}
          >
            <div className={styles.panel__titles}>
              <strong>
                LEVO
                <span className={styles.panel__info}>
                  <InformationCircle aria-label="About the answers" tabIndex={0} />
                  <TooltipContent
                    position="top-start"
                    content="AI answers can be wrong: check important values. Answers cite their sources; simulations need your approval."
                    className={styles.panel__tip}
                    contentStyle={{ fontSize: 14, lineHeight: '20px' }}
                  />
                </span>
              </strong>
              <span title={sessionTitle || undefined}>
                {loading ? 'Loading…' : sessionTitle || 'New conversation'}
              </span>
            </div>
            <button
              type="button"
              className={styles.icon}
              aria-pressed={showSessions}
              aria-label="Conversations"
              title="Conversations"
              onClick={() => assistantStore.setShowSessions(!showSessions)}
            >
              <Messages />
            </button>
            <button
              type="button"
              className={styles.icon}
              aria-label="New conversation"
              title="New conversation"
              disabled={streaming || (!sessionId && !messages.length)}
              onClick={() => {
                assistantStore.newChat();
                inputRef.current?.focus();
              }}
            >
              <Plus />
            </button>
            <button
              type="button"
              className={styles.icon}
              aria-pressed={expanded}
              aria-label={expanded ? 'Restore panel size' : 'Enlarge panel'}
              title={expanded ? 'Restore size' : 'Enlarge'}
              onClick={() => assistantStore.toggleExpanded()}
            >
              <Fullscreen />
            </button>
            <button
              type="button"
              className={styles.icon}
              aria-label="Close the assistant"
              title="Close (Esc)"
              onClick={() => assistantStore.setOpen(false)}
            >
              <Close />
            </button>
          </header>

          <div className={styles.panel__body}>
            {showSessions && open ? (
              <SessionList currentId={sessionId} streaming={streaming} />
            ) : null}
            <div className={styles.chat}>
              <MessageList
                messages={messages}
                activeAgent={activeAgent}
                loading={loading}
                loadError={state.loadError}
                sessionId={sessionId}
                context={context}
                disabled={streaming || loading}
              />
              <Composer
                ref={inputRef}
                streaming={streaming}
                disabled={loading}
                contextLabel={contextLabel(context)}
              />
              <BudgetMeter budget={state.budget} />
            </div>
          </div>
          <PdfDialog />
        </section>
      ) : null}
      {mounted && open ? (
        <span
          className={styles.tail}
          data-down={bubble.down ? '' : undefined}
          style={{
            left: bubble.left + bubble.tail,
            top: bubble.down ? bubble.top : bubble.top + bubble.height,
          }}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
};

/**
 * The floating AI assistant (DESIGN.md 7): a launcher at the bottom right of every page and a
 * resizable chat panel. Shown only to users with AI Assistant › Read; everything it shows comes
 * from the agent service with the user's own session and permissions. It also highlights the page
 * section its links ask for (`?section=`) on every page.
 */
export const AiAssistant = () => {
  const { userData, username, hasPermission } = useContext(AuthCtx);
  const owner = useAssistantOwner();
  const user = username ?? '';
  const allowed =
    !!userData &&
    hasPermission(PermissionGroupAliasEnum.enum.aiassistant, PermissionAliasEnum.enum.read);

  // the panel shows only state that belongs to the signed-in user
  useLayoutEffect(() => {
    if (allowed) assistantStore.bindUser(user);
  }, [allowed, user]);

  if (!allowed) return null;
  return (
    <>
      <SectionHighlight />
      {owner === user ? <Assistant /> : null}
    </>
  );
};
