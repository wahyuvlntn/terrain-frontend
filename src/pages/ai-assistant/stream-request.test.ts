import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSseParser,
  isAbortError,
  StreamRequestError,
  streamRequest,
} from '../../shared/utils/lib/stream-request';

// the shared request layer imports the UI kit for its toasts (CSS that vitest cannot load)
vi.mock('@digital-twin/reusables', () => ({
  toast: { error: () => undefined, success: () => undefined },
}));

/** feed `chunks` to a parser and collect the events */
const parse = (chunks: string[], end = true) => {
  const events: [string, unknown][] = [];
  const parser = createSseParser((name, data) => events.push([name, data]));
  chunks.forEach((c) => parser.push(c));
  if (end) parser.end();
  return events;
};

describe('createSseParser (streamRequest)', () => {
  it('parses named JSON events split across chunks', () => {
    const stream =
      'event: session\ndata: {"session_id":"s1","title":"T"}\n\nevent: text\ndata: {"delta":"Hi"}\n\n';
    for (let size = 1; size <= stream.length; size += 7) {
      const chunks = stream.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) ?? [];
      expect(parse(chunks)).toEqual([
        ['session', { session_id: 's1', title: 'T' }],
        ['text', { delta: 'Hi' }],
      ]);
    }
  });

  it('handles CRLF and CR line ends, comments, BOM and multi-line data', () => {
    expect(
      parse(['﻿: ping\r\n\r\nevent: message\r', '\ndata: line 1\rdata:line 2\r\n\r\n'])
    ).toEqual([['message', 'line 1\nline 2']]);
  });

  it('defaults the event name, ignores id / retry and events without data', () => {
    expect(parse(['id: 1\nretry: 100\ndata: 5\n\nevent: done\n\n'])).toEqual([['message', 5]]);
  });

  it('dispatches a final event left without its blank line only at the end', () => {
    expect(parse(['event: done\ndata: {}'], false)).toEqual([]);
    expect(parse(['event: done\ndata: {}'])).toEqual([['done', {}]]);
  });
});

// ---------------------------------------------------------------------- streamRequest

const encoder = new TextEncoder();

const mockFetch = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('streamRequest', () => {
  it('posts JSON with the session header and reads the events (multi-byte text split)', async () => {
    window.localStorage.setItem('X-AFDD-Session-Id', 'tok-1');
    const bytes = encoder.encode(
      'event: text\ndata: {"delta":"8 °C"}\n\nevent: done\ndata: {}\n\n'
    );
    const split = bytes.indexOf(0xb0); // inside the UTF-8 sequence of "°"
    const fetch = mockFetch(() =>
      Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(bytes.slice(0, split));
              controller.enqueue(bytes.slice(split));
              controller.close();
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } }
        )
      )
    );
    const events: [string, unknown][] = [];
    await streamRequest(
      '/api/agent/chat',
      { message: 'hi' },
      { onEvent: (n, d) => events.push([n, d]) }
    );

    expect(events).toEqual([
      ['text', { delta: '8 °C' }],
      ['done', {}],
    ]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/agent/chat');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"message":"hi"}');
    expect(init.headers).toMatchObject({
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'X-AFDD-Session-Id': 'tok-1',
    });
  });

  it('also takes the handler and the signal as arguments', async () => {
    const fetch = mockFetch(() =>
      Promise.resolve(
        new Response('event: done\ndata: {}\n\n', {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      )
    );
    const events: string[] = [];
    const ctrl = new AbortController();
    await streamRequest('/api/agent/chat', {}, (name) => events.push(name), ctrl.signal);
    expect(events).toEqual(['done']);
    expect(fetch.mock.calls[0][1].signal).toBe(ctrl.signal);
  });

  it('rejects an error response with the message of its JSON body', async () => {
    mockFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'A reply is still being written' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const failure = streamRequest('/api/agent/chat', {}, { onEvent: () => undefined });
    await expect(failure).rejects.toBeInstanceOf(StreamRequestError);
    await expect(failure).rejects.toMatchObject({
      statusCode: 409,
      message: 'A reply is still being written',
    });
  });

  it('signs out on 401 like request()', async () => {
    vi.useFakeTimers();
    window.localStorage.setItem('digital-twin-credentials', 'remembered');
    window.localStorage.setItem('X-AFDD-Session-Id', 'expired');
    mockFetch(() => Promise.resolve(new Response('{}', { status: 401 })));
    const replace = vi.fn();
    vi.stubGlobal('location', { pathname: '/x', search: '', replace });

    await expect(
      streamRequest('/api/agent/chat', {}, { onEvent: () => undefined })
    ).rejects.toMatchObject({ statusCode: 401 });
    vi.advanceTimersByTime(1000);
    expect(window.localStorage.getItem('X-AFDD-Session-Id')).toBeNull();
    expect(window.localStorage.getItem('digital-twin-credentials')).toBe('remembered');
    expect(replace).toHaveBeenCalledWith(expect.stringMatching(/^\/signin\?redirect-url=/));
  });

  it('refuses an answer that is not an event stream', async () => {
    mockFetch(() =>
      Promise.resolve(new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }))
    );
    await expect(
      streamRequest('/api/agent/chat', {}, { onEvent: () => undefined })
    ).rejects.toMatchObject({ message: 'The server did not answer with an event stream' });
  });

  it('reports a network failure as a connectivity issue', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(
      streamRequest('/api/agent/chat', {}, { onEvent: () => undefined })
    ).rejects.toMatchObject({ isConnectivityIssue: true });
  });

  it('stops reading when aborted and rejects with an AbortError', async () => {
    const ctrl = new AbortController();
    mockFetch((_url, init) =>
      Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode('event: text\ndata: {"delta":"a"}\n\n'));
              // like fetch: aborting the request errors its body stream (left open until then)
              init.signal?.addEventListener('abort', () =>
                controller.error(new DOMException('The user aborted a request.', 'AbortError'))
              );
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } }
        )
      )
    );
    const events: string[] = [];
    const failure = streamRequest(
      '/api/agent/chat',
      {},
      {
        signal: ctrl.signal,
        onEvent: (name) => {
          events.push(name);
          ctrl.abort();
        },
      }
    ).then(
      () => null,
      (e: unknown) => e
    );
    expect(isAbortError(await failure)).toBe(true);
    expect(events).toEqual(['text']);
  });

  it('cancels the stream when the event handler throws', async () => {
    let cancelled = false;
    mockFetch(() =>
      Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode('event: text\ndata: {}\n\n'));
            },
            cancel() {
              cancelled = true;
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } }
        )
      )
    );
    await expect(
      streamRequest(
        '/api/agent/chat',
        {},
        {
          onEvent: () => {
            throw new Error('bad event');
          },
        }
      )
    ).rejects.toThrow('bad event');
    expect(cancelled).toBe(true);
  });
});
