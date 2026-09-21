import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  TooltipContent,
} from '@digital-twin/components';
import {
  Close,
  Fullscreen,
  InformationCircle,
  MessageEllipsesFill,
  Messages,
  Plus,
} from '@digital-twin/icons';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  KeyboardEvent,
  PointerEvent,
  useCallback,
  useContext,
  useEffect,
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
import { MessageList } from './components/message-list';
import { PdfDialog } from './components/pdf-dialog';
import { SectionHighlight } from './components/section-highlight';
import { SessionList } from './components/session-list';
import { canOpenTarget, navigationLink, PAGE_TITLE } from './navigation';

// ---------------------------------------------------------------- panel size

type Size = { width: number; height: number };

const SIZE_KEY = 'aiAssistant.panelSize';
const MIN: Size = { width: 340, height: 420 };
/** room left around the panel inside the window */
const MARGIN = 32;
const KEY_STEP = 24;

/**
 * Set on the document root while the launcher shows: the room it takes at the bottom right of the
 * window (20 px offset + 52 px button + a 12 px gap, see `.launcher`). Pages pad their controls
 * there with `var(--ai-launcher-inset, 0px)`.
 */
const LAUNCHER_INSET_VAR = '--ai-launcher-inset';
const LAUNCHER_INSET = '84px';

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

/** The panel size: dragged from its top-left corner (it is anchored bottom-right), remembered */
const usePanelSize = () => {
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
          width: d.size.width + (d.x - e.clientX),
          height: d.size.height + (d.y - e.clientY),
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
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [KEY_STEP, 0],
        ArrowRight: [-KEY_STEP, 0],
        ArrowUp: [0, KEY_STEP],
        ArrowDown: [0, -KEY_STEP],
      };
      const step = delta[e.key];
      if (!step) return;
      e.preventDefault();
      const next = clampSize({ width: size.width + step[0], height: size.height + step[1] });
      setSize(next);
      save(next);
    },
  };

  return { size, handle };
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
        navigate(link);
        return true;
      }),
    [navigate]
  );
};

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
  const { size, handle } = usePanelSize();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(open);
  const focusSeen = useRef(focusRequest);
  useAssistantNavigator();

  // the conversation list follows new answers, titles and deletions
  useEffect(() => {
    if (sessionsVersion) void queryClient.invalidateQueries({ queryKey: ASSISTANT_QUERY.sessions });
  }, [queryClient, sessionsVersion]);

  // the launcher's footprint, for pages that keep their bottom-right controls clear of it
  useLayoutEffect(() => {
    if (open) return;
    const root = document.documentElement.style;
    root.setProperty(LAUNCHER_INSET_VAR, LAUNCHER_INSET);
    return () => {
      root.removeProperty(LAUNCHER_INSET_VAR);
    };
  }, [open]);

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
      {!open ? (
        <button
          ref={launcherRef}
          type="button"
          className={clsx(styles.launcher, streaming && styles['launcher--busy'])}
          onClick={() => assistantStore.setOpen(true)}
          aria-label={
            streaming
              ? 'Open AI assistant (answering)'
              : unread
                ? 'Open AI assistant (new answer)'
                : 'Open AI assistant'
          }
          aria-expanded={false}
          title="AI assistant"
        >
          <MessageEllipsesFill aria-hidden="true" />
          {unread && !streaming ? (
            <span className={styles.launcher__dot} aria-hidden="true" />
          ) : null}
        </button>
      ) : null}

      {mounted ? (
        <section
          ref={panelRef}
          tabIndex={-1}
          className={clsx(styles.panel, expanded && styles['panel--expanded'])}
          style={expanded ? undefined : { width: size.width, height: size.height }}
          role="dialog"
          aria-modal="false"
          aria-label="AI assistant"
          hidden={!open}
          onKeyDown={onPanelKeyDown}
          // pages with their own keyboard handling (the twin's walk mode) leave keys in here alone
          data-ai-assistant-panel=""
        >
          {!expanded ? (
            <div
              className={styles.panel__resize}
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

          <header className={styles.panel__header}>
            <MessageEllipsesFill aria-hidden="true" className={styles.panel__logo} />
            <div className={styles.panel__titles}>
              <strong>
                AI Assistant
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
