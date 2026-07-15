import { createSearchParams } from 'react-router-dom';

import { getMessageTranslation, t } from './i18n';
import { getURL, SESSION_ID_HEADER } from './request';

/**
 * Streaming requests (Server-Sent Events over fetch).
 *
 * `EventSource` cannot send the session header and a token in the query string would end up in
 * logs, so the stream is read from a `fetch` response body and parsed here. The request carries the
 * same session header as `request()`, goes to the same base URL, and a 401 signs the user out the
 * same way. Keep streams out of react-query: they are long-lived and its cache toasts every error.
 */

/** Called once per received event; `data` is the parsed JSON payload, or the raw text if not JSON */
export type StreamEventHandler = (event: string, data: unknown) => void;

export type StreamRequestOptions = {
  onEvent: StreamEventHandler;
  /** aborts the request and the stream (the returned promise rejects with an AbortError) */
  signal?: AbortSignal;
  method?: 'POST' | 'PUT' | 'GET';
  headers?: Record<string, string>;
};

type StreamRequestErrorInit = {
  message: string;
  statusCode?: number;
  details?: unknown;
  isConnectivityIssue?: boolean;
};

/** A failed stream request: HTTP status (when the server answered) and the parsed error body */
export class StreamRequestError extends Error {
  public statusCode: number | undefined;
  public details: unknown;
  public isConnectivityIssue: boolean;

  constructor({ message, statusCode, details, isConnectivityIssue }: StreamRequestErrorInit) {
    super(message);
    this.name = 'StreamRequestError';
    this.statusCode = statusCode;
    this.details = details;
    this.isConnectivityIssue = isConnectivityIssue ?? false;
  }
}

/** True for the rejection of a request or stream read cancelled through its AbortSignal */
export const isAbortError = (e: unknown) =>
  (e instanceof DOMException || e instanceof Error) && e.name === 'AbortError';

/** Same sign-out as `request()` on a 401: keep the remembered credentials, go to the sign-in page */
const redirectToSignin = () =>
  setTimeout(() => {
    const credentials = window.localStorage.getItem('digital-twin-credentials');
    window.localStorage.clear();
    if (credentials) window.localStorage.setItem('digital-twin-credentials', credentials);
    window.location.replace(
      '/signin' +
        `?${createSearchParams({
          'redirect-url': encodeURIComponent(window.location.pathname + window.location.search),
        })}`
    );
  }, 1000);

const parseData = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/**
 * An incremental SSE parser (WHATWG "event stream interpretation"): feed it decoded text chunks in
 * any split; it calls `onEvent` for each complete event. Handles `\n`, `\r\n` and `\r` line ends,
 * comment lines (`: ping`), multi-line `data:` (joined with `\n`), the optional space after the
 * colon, and a leading BOM. `id:` and `retry:` are accepted and ignored (no reconnection here).
 * `end()` dispatches an event left without its terminating blank line when the stream closes.
 */
export const createSseParser = (onEvent: StreamEventHandler) => {
  let buffer = '';
  let started = false;
  let eventName = '';
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length) {
      onEvent(eventName || 'message', parseData(dataLines.join('\n')));
    }
    eventName = '';
    dataLines = [];
  };

  const line = (text: string) => {
    if (text === '') {
      dispatch();
      return;
    }
    if (text.startsWith(':')) return;
    const colon = text.indexOf(':');
    const field = colon < 0 ? text : text.slice(0, colon);
    let value = colon < 0 ? '' : text.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') eventName = value;
    else if (field === 'data') dataLines.push(value);
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      if (!started && buffer.length) {
        started = true;
        if (buffer.charCodeAt(0) === 0xfeff) buffer = buffer.slice(1);
      }
      let start = 0;
      for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        if (c !== '\n' && c !== '\r') continue;
        // a '\r' at the very end may be the first half of '\r\n': wait for the next chunk
        if (c === '\r' && i === buffer.length - 1) break;
        line(buffer.slice(start, i));
        if (c === '\r' && buffer[i + 1] === '\n') i++;
        start = i + 1;
      }
      buffer = buffer.slice(start);
    },
    end() {
      if (buffer.length) {
        line(buffer.replace(/\r$/, ''));
        buffer = '';
      }
      dispatch();
    },
  };
};

/** The message of a failed response: `{error}` / `{message}` of the JSON envelope, else the text */
const errorMessage = (status: number, body: string): { message: string; details: unknown } => {
  const details = parseData(body);
  if (details && typeof details === 'object') {
    const { error, message } = details as { error?: unknown; message?: unknown };
    const text =
      typeof message === 'string' && message ? message : typeof error === 'string' ? error : '';
    if (text) return { message: getMessageTranslation(text), details };
  } else if (typeof details === 'string' && details.trim() && details.length <= 300) {
    return { message: details.trim(), details };
  }
  return { message: `Request failed (HTTP ${status})`, details };
};

/**
 * POST `body` as JSON to `url` (relative to the API base, like `request()`) and read the response
 * as an SSE stream, calling `onEvent(name, data)` per event. Resolves when the stream ends; rejects
 * with a `StreamRequestError` (HTTP error, network failure, not an event stream) or, once `signal`
 * is aborted, with the abort reason (an AbortError by default: check `signal.aborted` or
 * `isAbortError`). Errors thrown by `onEvent` cancel the stream and reject the promise.
 *
 * Also callable as `streamRequest(url, body, onEvent, signal)`.
 */
export const streamRequest = async (
  url: string,
  body: unknown,
  optionsOrOnEvent: StreamRequestOptions | StreamEventHandler,
  abortSignal?: AbortSignal
): Promise<void> => {
  const {
    onEvent,
    signal,
    method = 'POST',
    headers,
  }: StreamRequestOptions = typeof optionsOrOnEvent === 'function'
    ? { onEvent: optionsOrOnEvent, signal: abortSignal }
    : optionsOrOnEvent;
  const sessionId = window.localStorage.getItem(SESSION_ID_HEADER);
  let response: Response;
  try {
    response = await fetch(getURL() + url, {
      method,
      headers: {
        Accept: 'text/event-stream',
        ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
        ...(sessionId ? { [SESSION_ID_HEADER]: sessionId } : {}),
        ...headers,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      cache: 'no-store',
      signal,
    });
  } catch (e) {
    if (isAbortError(e) || signal?.aborted) throw e;
    throw new StreamRequestError({
      message: t('common.err_network_error'),
      isConnectivityIssue: true,
      details: e,
    });
  }

  if (!response.ok) {
    if (response.status === 401) {
      redirectToSignin();
      throw new StreamRequestError({
        message: 'Unauthorized, please re-login',
        statusCode: 401,
      });
    }
    let text = '';
    try {
      text = await response.text();
    } catch (e) {
      if (isAbortError(e)) throw e;
    }
    throw new StreamRequestError({
      statusCode: response.status,
      ...errorMessage(response.status, text),
    });
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!response.body || !contentType.toLowerCase().includes('text/event-stream')) {
    // e.g. an HTML error page of a proxy, or a JSON answer instead of a stream
    await response.body?.cancel().catch(() => undefined);
    throw new StreamRequestError({
      message: 'The server did not answer with an event stream',
      statusCode: response.status,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const parser = createSseParser(onEvent);
  let finished = false;
  const read = async () => {
    try {
      return await reader.read();
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) throw e;
      // the connection broke while the body was streaming
      throw new StreamRequestError({
        message: 'The connection was interrupted',
        statusCode: response.status,
        isConnectivityIssue: true,
        details: e,
      });
    }
  };
  try {
    for (;;) {
      const { done, value } = await read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.end();
    finished = true;
  } finally {
    if (!finished) await reader.cancel().catch(() => undefined);
    try {
      reader.releaseLock();
    } catch {
      // already released together with the cancelled stream
    }
  }
};
