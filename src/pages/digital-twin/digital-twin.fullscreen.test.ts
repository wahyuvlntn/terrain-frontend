import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FULLSCREEN_OFF,
  fullscreenReducer,
  requestDocumentFullscreen,
  TwinFullscreenState,
  useTwinFullscreen,
} from './digital-twin.fullscreen';

const IMMERSIVE: TwinFullscreenState = { immersive: true, native: false };
const NATIVE: TwinFullscreenState = { immersive: true, native: true };

describe('fullscreenReducer', () => {
  it('goes immersive at once and native when the browser follows', () => {
    expect(fullscreenReducer(FULLSCREEN_OFF, { type: 'enter' })).toEqual(IMMERSIVE);
    expect(fullscreenReducer(IMMERSIVE, { type: 'native', on: true })).toEqual(NATIVE);
    // entering again changes nothing
    expect(fullscreenReducer(NATIVE, { type: 'enter' })).toBe(NATIVE);
  });

  it('leaves on the toggle and when the browser leaves full screen (Esc)', () => {
    expect(fullscreenReducer(NATIVE, { type: 'leave' })).toEqual(FULLSCREEN_OFF);
    expect(fullscreenReducer(IMMERSIVE, { type: 'leave' })).toEqual(FULLSCREEN_OFF);
    expect(fullscreenReducer(NATIVE, { type: 'native', on: false })).toEqual(FULLSCREEN_OFF);
  });

  it('keeps the maximised layout when the browser refused or never entered full screen', () => {
    expect(fullscreenReducer(IMMERSIVE, { type: 'native', on: false })).toBe(IMMERSIVE);
    // someone else's full screen doesn't make the page immersive
    expect(fullscreenReducer(FULLSCREEN_OFF, { type: 'native', on: true })).toBe(FULLSCREEN_OFF);
  });
});

/** a document stand-in with the Fullscreen API */
const fakeDocument = (request: () => Promise<void>, enabled = true) =>
  ({
    fullscreenEnabled: enabled,
    fullscreenElement: null,
    documentElement: { requestFullscreen: vi.fn(request) },
  }) as unknown as Document;

describe('requestDocumentFullscreen', () => {
  it('reports whether the browser granted full screen', async () => {
    const granted = fakeDocument(() => Promise.resolve());
    await expect(requestDocumentFullscreen(granted)).resolves.toBe(true);
    expect(granted.documentElement.requestFullscreen).toHaveBeenCalledWith({
      navigationUI: 'hide',
    });
    await expect(
      requestDocumentFullscreen(fakeDocument(() => Promise.reject(new TypeError('denied'))))
    ).resolves.toBe(false);
    const disabled = fakeDocument(() => Promise.resolve(), false);
    await expect(requestDocumentFullscreen(disabled)).resolves.toBe(false);
    expect(disabled.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });
});

/** jsdom has no Fullscreen API: these tests lend the document one */
const lent = ['fullscreenEnabled', 'fullscreenElement', 'exitFullscreen'] as const;
const lend = (key: (typeof lent)[number], get: () => unknown) =>
  Object.defineProperty(document, key, { configurable: true, get });

describe('useTwinFullscreen', () => {
  afterEach(() => {
    lent.forEach((key) => Reflect.deleteProperty(document, key));
    Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
  });

  it('goes immersive even where the browser has no full screen, and ends with walk mode', async () => {
    // jsdom has no Fullscreen API: the page stays maximised in the window
    const { result, rerender } = renderHook(({ walking }) => useTwinFullscreen(walking), {
      initialProps: { walking: true },
    });
    expect(result.current.immersive).toBe(false);
    await act(async () => result.current.toggle());
    expect(result.current).toMatchObject({ immersive: true, native: false });
    // F again
    await act(async () => result.current.toggle());
    expect(result.current.immersive).toBe(false);
    await act(async () => result.current.toggle());
    rerender({ walking: false });
    expect(result.current.immersive).toBe(false);
  });

  it('follows the browser into and out of full screen and takes the pointer back', async () => {
    let element: Element | null = null;
    const exit = vi.fn(() => {
      element = null;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    lend('fullscreenEnabled', () => true);
    lend('fullscreenElement', () => element);
    lend('exitFullscreen', () => exit);
    document.documentElement.requestFullscreen = vi.fn(() => {
      element = document.documentElement;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    const relock = vi.fn();

    const { result, rerender } = renderHook(({ walking }) => useTwinFullscreen(walking), {
      initialProps: { walking: true },
    });
    await act(async () => result.current.toggle(relock));
    expect(result.current).toMatchObject({ immersive: true, native: true });
    expect(relock).toHaveBeenCalledTimes(1);

    // Esc: the browser leaves full screen, the page follows
    act(() => {
      element = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current).toMatchObject({ immersive: false, native: false });
    expect(exit).not.toHaveBeenCalled();

    // leaving walk mode leaves the browser's full screen too
    await act(async () => result.current.toggle());
    expect(result.current.native).toBe(true);
    rerender({ walking: false });
    expect(exit).toHaveBeenCalledTimes(1);
    expect(result.current.immersive).toBe(false);
  });
});
