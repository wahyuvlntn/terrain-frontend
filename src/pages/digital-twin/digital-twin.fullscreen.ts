import { useCallback, useEffect, useReducer, useRef } from 'react';

/**
 * Full screen of walk mode. `immersive`: the twin's 3D view covers the whole window (the page's
 * immersive layout). `native`: the browser shows the document in full screen too. A browser that
 * refuses full screen (or has none) still gets the immersive layout, maximised in its window.
 */
export type TwinFullscreenState = { immersive: boolean; native: boolean };

export type TwinFullscreenAction =
  /** the user asked for full screen: the layout goes immersive at once, the browser may follow */
  | { type: 'enter' }
  /** the user left full screen (toggle, F, leaving walk mode) */
  | { type: 'leave' }
  /** the document entered (true) or left (false) the browser's full screen (fullscreenchange) */
  | { type: 'native'; on: boolean };

export const FULLSCREEN_OFF: TwinFullscreenState = { immersive: false, native: false };

export const fullscreenReducer = (
  state: TwinFullscreenState,
  action: TwinFullscreenAction
): TwinFullscreenState => {
  switch (action.type) {
    case 'enter':
      return state.immersive ? state : { immersive: true, native: false };
    case 'leave':
      return state.immersive || state.native ? FULLSCREEN_OFF : state;
    case 'native':
      // the browser's full screen counts only while the page asked for it
      if (action.on) return state.immersive && !state.native ? { ...state, native: true } : state;
      // the browser left full screen (Esc, its own UI): so does the page; a maximised layout
      // whose full screen the browser refused is left alone
      return state.native ? FULLSCREEN_OFF : state;
  }
};

/**
 * Asks the browser to show the whole document in full screen (so the AI assistant, toasts and
 * pop-ups stay visible over the 3D view). Resolves true when it did, false when it refused or
 * can't (the page then stays maximised in the window).
 */
export const requestDocumentFullscreen = async (doc: Document = document): Promise<boolean> => {
  const root = doc.documentElement;
  if (!doc.fullscreenEnabled || typeof root.requestFullscreen !== 'function') return false;
  if (doc.fullscreenElement === root) return true;
  try {
    await root.requestFullscreen({ navigationUI: 'hide' });
    return true;
  } catch {
    return false;
  }
};

/** Leaves the browser's full screen when the document is in it */
export const exitDocumentFullscreen = (doc: Document = document) => {
  if (!doc.fullscreenElement || typeof doc.exitFullscreen !== 'function') return;
  doc.exitFullscreen().catch(() => undefined);
};

/**
 * Full screen of walk mode for the twin page. `toggle` must run in a user gesture (a click, the F
 * key); its `afterEnter` runs once the browser is in full screen (e.g. to take the pointer back).
 * The toggle, leaving walk mode, the browser's own exit (Esc) and leaving the page end it.
 */
export const useTwinFullscreen = (walking: boolean) => {
  const [state, dispatch] = useReducer(fullscreenReducer, FULLSCREEN_OFF);
  /** what the user wants now: a full screen granted after they left again is undone */
  const wanted = useRef(false);

  useEffect(() => {
    const onChange = () => dispatch({ type: 'native', on: !!document.fullscreenElement });
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      // leaving the page leaves full screen
      if (wanted.current) exitDocumentFullscreen();
    };
  }, []);

  const leave = useCallback(() => {
    const was = wanted.current;
    wanted.current = false;
    dispatch({ type: 'leave' });
    if (was) exitDocumentFullscreen();
  }, []);

  const enter = useCallback((afterEnter?: () => void) => {
    wanted.current = true;
    dispatch({ type: 'enter' });
    requestDocumentFullscreen().then((ok) => {
      if (!ok) return;
      if (!wanted.current) exitDocumentFullscreen();
      else afterEnter?.();
    });
  }, []);

  const toggle = useCallback(
    (afterEnter?: () => void) => (state.immersive ? leave() : enter(afterEnter)),
    [state.immersive, enter, leave]
  );

  // the browser left full screen by itself (Esc): nothing to undo any more
  useEffect(() => {
    if (!state.immersive) wanted.current = false;
  }, [state.immersive]);

  // full screen belongs to walk mode
  useEffect(() => {
    if (!walking) leave();
  }, [walking, leave]);

  return { ...state, toggle, leave };
};
