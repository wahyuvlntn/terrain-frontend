import { getMessageTranslation } from '@digital-twin/utils';
import { useSyncExternalStore } from 'react';
import {
  applyChatEvent,
  ChatMessage,
  FormBlock,
  finishAnswer,
  fromHistory,
  pendingAnswer,
  simulationFollowUpText,
  updateForm,
  userMessage,
} from './ai-assistant.messages';
import {
  ChatContextBody,
  ChatEvent,
  ChatRequestBody,
  Citation,
  FormSubmissionBody,
  getSession,
  NavigationTarget,
  streamChat,
} from './api/ai-assistant.api';
import { AssistantContext, getAssistantContext } from './assistant-context';

/**
 * State of the assistant panel, kept in a module store rather than in components: the shared
 * Layout rebuilds its router (and remounts everything under it) on some re-renders, and React
 * StrictMode double-runs effects. A stream therefore lives here, is started only from user actions
 * (or a finished simulation), and survives remounts, closing the panel, and navigation.
 *
 * The store has no UI: it moves the app to a place the agent opened through the navigator a
 * component inside the router registers (`setNavigator`), which also reports the user going
 * elsewhere (`userNavigated`), after which an answer on its way no longer moves them.
 */

export type AssistantState = {
  open: boolean;
  expanded: boolean;
  showSessions: boolean;
  sessionId: string | null;
  sessionTitle: string;
  messages: ChatMessage[];
  /** a stored conversation is loading */
  loading: boolean;
  loadError: string | null;
  streaming: boolean;
  /** the agent working on the current answer ('' before the first `agent` event) */
  activeAgent: string;
  /** spend today and the daily limit, from the latest `usage` event */
  budget: { todayUsd: number; limitUsd: number | null } | null;
  /** an answer finished while the panel was closed */
  unread: boolean;
  /** bumped whenever the server-side list of conversations may have changed */
  sessionsVersion: number;
  /** the cited document open in the viewer */
  document: Citation | null;
  /** the signed-in user this state belongs to (null until the panel is bound to one) */
  owner: string | null;
  /**
   * bumped by every request to open the panel, also while it is open (the twin's walk mode asks
   * again after the focus went back to the 3D view): the question box takes the focus each time
   */
  focusRequest: number;
};

const INITIAL: AssistantState = {
  open: false,
  expanded: false,
  showSessions: false,
  sessionId: null,
  sessionTitle: '',
  messages: [],
  loading: false,
  loadError: null,
  streaming: false,
  activeAgent: '',
  budget: null,
  unread: false,
  sessionsVersion: 0,
  document: null,
  owner: null,
  focusRequest: 0,
};

let state: AssistantState = INITIAL;

const listeners = new Set<() => void>();

const set = (patch: Partial<AssistantState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getState = () => state;

/** The panel state (re-renders on every change; messages keep their identity when unchanged) */
export const useAssistantState = () => useSyncExternalStore(subscribe, getState, getState);

const getOwner = () => state.owner;

/** The user the panel state belongs to (re-renders only when it changes) */
export const useAssistantOwner = () => useSyncExternalStore(subscribe, getOwner, getOwner);

// --------------------------------------------------------------------- storage

const storage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // storage unavailable (private mode, quota): the panel works without it
    }
  },
};

/** the last conversation of the signed-in user, reopened with the panel */
const sessionStorageKey = () =>
  `aiAssistant.session.${state.owner ?? storage.get('digital-twin-username') ?? ''}`;
const FOLLOW_UPS_KEY = 'aiAssistant.simulationFollowUps';

const rememberSession = (id: string | null) => storage.set(sessionStorageKey(), id);

const followUpsSent = (): number[] => {
  try {
    const list = JSON.parse(storage.get(FOLLOW_UPS_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((v) => typeof v === 'number') : [];
  } catch {
    return [];
  }
};

// --------------------------------------------------------------------- helpers

/** A user-facing message for anything a request can throw (Error, HttpError, string) */
export const errorText = (e: unknown, fallback: string) => {
  const message =
    typeof e === 'string'
      ? e
      : e instanceof Error
        ? e.message
        : (e as { message?: unknown })?.message;
  return typeof message === 'string' && message.trim()
    ? getMessageTranslation(message.trim())
    : fallback;
};

const toContextBody = (c: AssistantContext): ChatContextBody | undefined => {
  const body: ChatContextBody = {};
  if (c.page) body.page = c.page;
  if (c.nodeId) body.node_id = c.nodeId;
  if (c.assetAlias) body.asset_alias = c.assetAlias;
  if (typeof c.replayJobId === 'number') body.replay_job_id = c.replayJobId;
  if (c.view) body.view = c.view;
  return Object.keys(body).length ? body : undefined;
};

const updateMessage = (id: string, update: (m: ChatMessage) => ChatMessage) => {
  const i = state.messages.findIndex((m) => m.id === id);
  if (i < 0) return;
  const next = update(state.messages[i]);
  if (next === state.messages[i]) return;
  const messages = state.messages.slice();
  messages[i] = next;
  set({ messages });
};

// --------------------------------------------------------------------- streaming

/** the request of the answer being streamed */
let controller: AbortController | null = null;
/** identifies the current stream; events of an older one are dropped */
let runSeq = 0;
/** identifies the current conversation load */
let loadSeq = 0;
/** automatic messages waiting for the current answer to finish */
let queue: { text: string; sessionId: string | null }[] = [];
/** events are applied in small batches (one render per batch, not per token) */
const BATCH_MS = 40;

/**
 * Opens a target in the app (registered by the panel); false when the user may not open its page
 * (the agent does not know the user's page permissions).
 */
export type AssistantNavigator = (target: NavigationTarget) => boolean;
let appNavigator: AssistantNavigator | null = null;

/**
 * How often the user went somewhere else by themselves (a link, Back), as the navigator's
 * component reports it (`userNavigated`); a page updating its own URL and the navigator's own
 * moves don't count. An answer moves the user only while this is unchanged since the question.
 */
let userMoves = 0;

/**
 * The user is busy with a field of the page (typing, choosing): moving them would drop what they
 * entered. The assistant's own question box doesn't count.
 */
const busyInPage = () => {
  const el = typeof document === 'undefined' ? null : document.activeElement;
  if (!(el instanceof HTMLElement) || el.closest('[data-ai-assistant-panel]')) return false;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el.isContentEditable === true
  );
};

const flushQueue = () => {
  if (state.streaming || state.loading) return;
  const i = queue.findIndex((q) => q.sessionId === state.sessionId);
  // automatic messages of a conversation the user has left are dropped
  const next = i >= 0 ? queue[i] : undefined;
  queue = queue.filter((q) => q.sessionId === state.sessionId && q !== next);
  if (next) send(next.text, { automatic: true });
};

/**
 * Send a message in the current conversation (a new one when none is open) and stream the answer.
 * Returns false when nothing was sent: empty text, or busy (an automatic message is queued then).
 */
const send = (
  text: string,
  options: { automatic?: boolean; form?: FormSubmissionBody } = {}
): boolean => {
  const message = text.trim();
  if (!message) return false;
  if (state.streaming || state.loading) {
    if (options.automatic) queue.push({ text: message, sessionId: state.sessionId });
    return false;
  }

  const question = userMessage(message, !!options.automatic);
  const answer = pendingAnswer();
  const run = ++runSeq;
  const ctrl = new AbortController();
  controller = ctrl;

  const context = toContextBody(getAssistantContext());
  const body: ChatRequestBody = {
    message,
    ...(state.sessionId ? { session_id: state.sessionId } : {}),
    ...(context ? { context } : {}),
    ...(options.form ? { form: options.form } : {}),
  };
  const formId = options.form?.form_id ?? null;
  set({
    messages: [...state.messages, question, answer],
    streaming: true,
    activeAgent: '',
    loadError: null,
  });

  let finished = false;
  let pending: ChatEvent[] = [];
  // an answer to the user's own question opens the places its agent navigates to at once, as
  // long as the user stays where they asked (see `flush`); the panel's automatic messages
  // (simulation follow-ups) never move the user
  const followNavigation = !options.automatic;
  const origin = userMoves;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (run !== runSeq || !pending.length) return;
    const events = pending;
    pending = [];
    const patch: Partial<AssistantState> = {};
    const destinations: NavigationTarget[] = [];
    for (const e of events) {
      if (e.type === 'session') {
        patch.sessionId = e.sessionId;
        if (e.title.trim()) patch.sessionTitle = e.title.trim();
        patch.sessionsVersion = (patch.sessionsVersion ?? state.sessionsVersion) + 1;
        rememberSession(e.sessionId);
        // automatic messages queued before the conversation had an id belong to it
        queue = queue.map((q) => (q.sessionId === null ? { ...q, sessionId: e.sessionId } : q));
      } else if (e.type === 'agent') {
        patch.activeAgent = e.name;
      } else if (e.type === 'usage' && e.usage.todayUsd !== null) {
        patch.budget = { todayUsd: e.usage.todayUsd, limitUsd: e.usage.limitUsd };
      } else if (e.type === 'simulation') {
        observeJob(e.simulation.jobId, e.simulation.status);
      } else if (e.type === 'form_result') {
        // the submitted form sits in an earlier answer: mark it carried out (or editable again)
        patch.messages = updateForm(patch.messages ?? state.messages, e.formId, {
          state: e.ok ? 'done' : 'failed',
          message: e.message,
        });
      } else if (e.type === 'navigate' && followNavigation) {
        destinations.push(e.target);
      }
    }
    if (Object.keys(patch).length) set(patch);
    updateMessage(answer.id, (m) => events.reduce(applyChatEvent, m));
    // a user who went elsewhere since asking, or is filling in a field of the page, stays where
    // they are: the answer's navigation card leads there. Several in one batch: the last one the
    // user may open wins
    if (!destinations.length || userMoves !== origin || busyInPage()) return;
    for (let i = destinations.length - 1; i >= 0; i--) {
      if (!appNavigator?.(destinations[i])) continue;
      // the panel steps aside so the place it opened is not hidden behind it (the answer goes on
      // streaming; the launcher shows it and its unread dot)
      if (state.open) set({ open: false, document: null });
      break;
    }
  };

  const onEvent = (e: ChatEvent) => {
    if (run !== runSeq) return;
    if (e.type === 'done') finished = true;
    pending.push(e);
    if (!timer) timer = setTimeout(flush, BATCH_MS);
  };

  type Outcome = { stopped: boolean; error: string | null; lost?: boolean };
  streamChat(body, onEvent, ctrl.signal)
    .then(
      (): Outcome => ({
        stopped: false,
        error: finished ? null : 'The connection closed before the answer was complete.',
      })
    )
    .catch((e: unknown): Outcome => {
      if (ctrl.signal.aborted) return { stopped: true, error: null };
      // the conversation was deleted meanwhile (another tab, another device)
      if (body.session_id && (e as { statusCode?: number } | null)?.statusCode === 404) {
        return {
          stopped: false,
          lost: true,
          error: 'That conversation no longer exists. Your next message starts a new one.',
        };
      }
      return { stopped: false, error: errorText(e, 'The assistant could not be reached.') };
    })
    .then((outcome) => {
      if (run !== runSeq) return;
      flush();
      controller = null;
      updateMessage(answer.id, (m) =>
        finishAnswer(m, { stopped: outcome.stopped, error: m.error ?? outcome.error })
      );
      if (outcome.lost && state.sessionId === body.session_id) {
        rememberSession(null);
        set({ sessionId: null, sessionTitle: '' });
      }
      // a submission whose outcome never arrived (refused request, lost connection)
      if (formId && formState(formId) === 'submitting') {
        set({
          messages: updateForm(state.messages, formId, {
            state: 'failed',
            message:
              'The form could not be sent. Check the order or simulation before sending it again.',
          }),
        });
      }
      set({
        streaming: false,
        activeAgent: '',
        unread: !state.open,
        sessionsVersion: state.sessionsVersion + 1,
      });
      flushQueue();
    });
  return true;
};

const findForm = (formId: string): FormBlock | null => {
  for (const m of state.messages) {
    for (const b of m.blocks) if (b.kind === 'form' && b.form.formId === formId) return b;
  }
  return null;
};

const formState = (formId: string) => findForm(formId)?.state ?? null;

/**
 * Submit a form of the conversation: its values go with a message (`summary`, shown as the user's
 * message) and the service carries it out before the agent answers. False when it cannot be sent
 * now (an answer is streaming, or the form is gone or already done).
 */
const submitForm = (formId: string, values: Record<string, unknown>, summary: string): boolean => {
  const block = findForm(formId);
  if (!block || block.state === 'done' || block.state === 'submitting') return false;
  if (state.streaming || state.loading) return false;
  set({ messages: updateForm(state.messages, formId, { state: 'submitting', message: '' }) });
  const sent = send(summary, {
    form: { form_id: formId, kind: block.form.kind, values, context: block.form.context },
  });
  if (!sent) set({ messages: updateForm(state.messages, formId, { state: 'open' }) });
  return sent;
};

// --------------------------------------------------------------------- conversations

const openSession = async (sessionId: string) => {
  if (state.streaming) return;
  const seq = ++loadSeq;
  set({
    sessionId,
    sessionTitle: '',
    messages: [],
    loading: true,
    loadError: null,
  });
  rememberSession(sessionId);
  try {
    const detail = await getSession(sessionId);
    if (seq !== loadSeq) return;
    set({
      sessionId: detail.id,
      sessionTitle: detail.title,
      messages: detail.messages.map(fromHistory),
      loading: false,
    });
    flushQueue();
  } catch (e) {
    if (seq !== loadSeq) return;
    if ((e as { statusCode?: number } | null)?.statusCode === 404) {
      rememberSession(null);
      set({
        sessionId: null,
        loading: false,
        loadError: 'That conversation no longer exists. A new one has been started.',
      });
    } else {
      set({ loading: false, loadError: errorText(e, 'The conversation could not be loaded.') });
    }
  }
};

const newChat = () => {
  if (state.streaming) return;
  loadSeq++;
  rememberSession(null);
  set({
    sessionId: null,
    sessionTitle: '',
    messages: [],
    loading: false,
    loadError: null,
    showSessions: false,
  });
};

let restored = false;

// --------------------------------------------------------------------- simulations

const ACTIVE_JOB = new Set(['PROPOSED', 'QUEUED', 'RUNNING', 'ANALYZING']);
const FINISHED_JOB = new Set(['SUCCEEDED', 'FAILED']);
/** the last status this page saw per simulation job */
const jobStatusSeen = new Map<number, string>();

/**
 * Record the status of a simulation job shown in the conversation. When this page saw the job
 * pending or running and now sees it finished, the panel asks the assistant (once per job, also
 * across reloads) to summarise the results. Jobs that finished before they were seen here (an old
 * conversation) never trigger a message.
 */
const observeJob = (jobId: number, status: string) => {
  const previous = jobStatusSeen.get(jobId);
  jobStatusSeen.set(jobId, status);
  if (!previous || !ACTIVE_JOB.has(previous) || !FINISHED_JOB.has(status)) return;
  const sent = followUpsSent();
  if (sent.includes(jobId)) return;
  storage.set(FOLLOW_UPS_KEY, JSON.stringify([...sent, jobId].slice(-200)));
  send(simulationFollowUpText(jobId), { automatic: true });
};

// --------------------------------------------------------------------- actions

export const assistantStore = {
  getState,

  /**
   * Bind the panel to the signed-in user. Sign-out reloads the app today, but should another user
   * ever sign in within the same page, the previous user's conversation, stream and pending
   * follow-ups are dropped instead of being shown to them.
   */
  bindUser(username: string) {
    if (state.owner === username) return;
    if (state.owner !== null) {
      controller?.abort();
      controller = null;
      runSeq++; // the aborted stream's late events and outcome are ignored
      loadSeq++;
      queue = [];
      jobStatusSeen.clear();
      restored = false;
      set({ ...INITIAL, owner: username });
      return;
    }
    set({ owner: username });
  },

  setOpen(open: boolean) {
    if (open && state.open) {
      // already open: only the focus returns to the question box
      set({ focusRequest: state.focusRequest + 1 });
      return;
    }
    if (open === state.open) return;
    set(
      open
        ? { open, unread: false, focusRequest: state.focusRequest + 1 }
        : { open, document: null }
    );
    // reopen the user's last conversation the first time the panel opens
    if (open && !restored) {
      restored = true;
      const last = storage.get(sessionStorageKey());
      if (last && !state.sessionId && !state.messages.length) void openSession(last);
    }
  },

  toggleExpanded() {
    set({ expanded: !state.expanded });
  },

  setShowSessions(showSessions: boolean) {
    set({ showSessions });
  },

  send,

  submitForm,

  /** Stop the answer being streamed (what arrived so far stays) */
  stop() {
    controller?.abort();
  },

  /** Ask the last question again */
  retry() {
    const last = [...state.messages].reverse().find((m) => m.role === 'user');
    const text = last?.blocks[0]?.kind === 'text' ? last.blocks[0].text : '';
    if (text) send(text);
  },

  newChat,
  openSession,

  /** A conversation was deleted on the server */
  sessionDeleted(sessionId: string) {
    if (sessionId === state.sessionId) newChat();
    set({ sessionsVersion: state.sessionsVersion + 1 });
  },

  openDocument(document: Citation | null) {
    set({ document });
  },

  observeJob,

  /**
   * Register the function that opens a navigation target (one at a time); returns its removal,
   * which leaves a newer registration in place (StrictMode, remounts).
   */
  setNavigator(next: AssistantNavigator) {
    appNavigator = next;
    return () => {
      if (appNavigator === next) appNavigator = null;
    };
  },

  /**
   * The user went somewhere else by themselves (reported by the navigator's component): answers
   * already on their way no longer move them.
   */
  userNavigated() {
    userMoves++;
  },
};
