import { useSyncExternalStore } from 'react';

/**
 * What the user is looking at, sent with every chat message so the assistant can answer "this
 * unit" questions. Pages publish it with `setAssistantContext` (e.g. the digital twin: selected
 * node, its equipment alias, the replayed simulation job, walk mode); the assistant reads it when
 * sending.
 *
 * This module is deliberately tiny and free of UI imports: pages import it without pulling in the
 * assistant bundle.
 */
export type AssistantContext = {
  page?: string;
  nodeId?: string;
  assetAlias?: string;
  replayJobId?: number;
  /** the twin's camera mode: 'walk' while in first-person walk mode (unset otherwise) */
  view?: string;
};

type State = {
  context: AssistantContext;
  /** first path segment of the page that published `context` */
  scope: string;
};

/** First path segment of a pathname ('/digital-twin/x' → 'digital-twin', '/' → '') */
export const pageOfPath = (pathname: string) => pathname.split('/').filter(Boolean)[0] ?? '';

const currentScope = () =>
  typeof window === 'undefined' ? '' : pageOfPath(window.location.pathname);

let state: State = { context: {}, scope: '' };
const listeners = new Set<() => void>();

const KEYS: (keyof AssistantContext)[] = ['page', 'nodeId', 'assetAlias', 'replayJobId', 'view'];

const sameContext = (a: AssistantContext, b: AssistantContext) => KEYS.every((k) => a[k] === b[k]);

/** Drops undefined / null / empty values so the snapshot only holds what is set */
const compact = (c: AssistantContext): AssistantContext => {
  const out: AssistantContext = {};
  for (const k of KEYS) {
    const v = c[k];
    if (v === undefined || v === null || v === '') continue;
    if (k === 'replayJobId') {
      if (typeof v === 'number' && Number.isFinite(v)) out.replayJobId = v;
    } else if (typeof v === 'string') {
      out[k as Exclude<keyof AssistantContext, 'replayJobId'>] = v;
    }
  }
  return out;
};

/**
 * Merge `partial` into the context of the current page (a key set to `undefined` clears it).
 * Context published by another page is dropped first, so a page never inherits stale fields
 * (e.g. the twin's selected asset) after navigation, even if it never cleaned up.
 */
export const setAssistantContext = (partial: Partial<AssistantContext>) => {
  const scope = currentScope();
  const base = state.scope === scope ? state.context : {};
  const context = compact({ ...base, ...partial });
  if (state.scope === scope && sameContext(context, state.context)) return;
  state = { context, scope };
  listeners.forEach((l) => l());
};

/** Clear everything the current page published */
export const clearAssistantContext = () => {
  if (!Object.keys(state.context).length) return;
  state = { context: {}, scope: currentScope() };
  listeners.forEach((l) => l());
};

/**
 * The context to send for the page at `pathname`: the published fields when that page published
 * them, else only `page` (derived from the path when the page did not name itself).
 */
export const getAssistantContext = (pathname?: string): AssistantContext => {
  const scope = pageOfPath(
    pathname ?? (typeof window === 'undefined' ? '/' : window.location.pathname)
  );
  const own = state.scope === scope ? state.context : {};
  const page = own.page ?? scope;
  return page ? { ...own, page } : { ...own };
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const snapshot = () => state.context;

/**
 * The context as last published (re-renders when a page changes it). It may belong to a page
 * the user has left: `getAssistantContext(pathname)` gives what is sent for the current page.
 */
export const useAssistantContext = (): AssistantContext =>
  useSyncExternalStore(subscribe, snapshot, snapshot);
