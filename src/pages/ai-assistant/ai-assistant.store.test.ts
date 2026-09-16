import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatEvent, ChatRequestBody } from './api/ai-assistant.api';

// the shared request layer imports the UI kit for its toasts (CSS that vitest cannot load)
vi.mock('@digital-twin/reusables', () => ({
  toast: { error: () => undefined, success: () => undefined },
}));

// every test re-imports the store with its dependencies (module state), which takes a while
vi.setConfig({ testTimeout: 30_000 });

type StreamImpl = (
  body: ChatRequestBody,
  onEvent: (e: ChatEvent) => void,
  signal: AbortSignal
) => Promise<void>;

const stream = vi.hoisted(() => ({
  impl: null as StreamImpl | null,
  bodies: [] as ChatRequestBody[],
}));

vi.mock('./api/ai-assistant.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/ai-assistant.api')>();
  return {
    ...actual,
    streamChat: (body: ChatRequestBody, onEvent: (e: ChatEvent) => void, signal: AbortSignal) => {
      stream.bodies.push(body);
      return stream.impl ? stream.impl(body, onEvent, signal) : Promise.resolve();
    },
  };
});

/** the store and context modules, fresh for every test (they hold module state) */
const load = async () => {
  vi.resetModules();
  const store = await import('./ai-assistant.store');
  const context = await import('./assistant-context');
  const api = await import('./api/ai-assistant.api');
  return { ...store, ...context, parse: api.parseChatEvent };
};

const until = async (check: () => boolean, ms = 2000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
};

/** a stream that emits the given raw events, then ends */
const emits =
  (events: [string, unknown][], parse: (n: string, d: unknown) => ChatEvent | null): StreamImpl =>
  (_body, onEvent) => {
    for (const [name, data] of events) {
      const e = parse(name, data);
      if (e) onEvent(e);
    }
    return Promise.resolve();
  };

// the first import transforms the whole dependency tree (the @digital-twin/utils barrel: 11 s when other
// suites run in parallel, past 30 s on a busy machine, and a timed-out test keeps running into the
// next one); the tests' fresh imports then only re-evaluate it
beforeAll(async () => {
  await import('./ai-assistant.store');
}, 180_000);

beforeEach(() => {
  stream.impl = null;
  stream.bodies = [];
  window.localStorage.clear();
});

describe('assistantStore.send', () => {
  it('streams an answer into the conversation and adopts the session', async () => {
    const { assistantStore, parse, setAssistantContext } = await load();
    setAssistantContext({ assetAlias: 'CH_01', nodeId: 'n1' });
    stream.impl = emits(
      [
        ['session', { session_id: 's-1', title: 'Chiller check' }],
        ['agent', { name: 'insight_agent' }],
        ['text', { delta: 'CH-01 ', agent: 'insight_agent' }],
        ['text', { delta: 'is fine.', agent: 'insight_agent' }],
        [
          'usage',
          { input_tokens: 5, output_tokens: 3, cost_usd: 0.01, today_usd: 1, limit_usd: 4 },
        ],
        ['done', {}],
      ],
      parse
    );

    expect(assistantStore.send('  How is CH_01?  ')).toBe(true);
    expect(assistantStore.getState().streaming).toBe(true);
    await until(() => !assistantStore.getState().streaming);

    const s = assistantStore.getState();
    expect(stream.bodies[0]).toEqual({
      message: 'How is CH_01?',
      context: { asset_alias: 'CH_01', node_id: 'n1' },
    });
    expect(s.sessionId).toBe('s-1');
    expect(s.sessionTitle).toBe('Chiller check');
    expect(s.budget).toEqual({ todayUsd: 1, limitUsd: 4 });
    expect(s.messages).toHaveLength(2);
    const answer = s.messages[1];
    expect(answer).toMatchObject({ streaming: false, error: null, agent: 'insight_agent' });
    expect(answer.blocks[0]).toMatchObject({ text: 'CH-01 is fine.', final: true });

    // the next question continues the conversation
    stream.impl = emits([['done', {}]], parse);
    assistantStore.send('And CH_02?');
    await until(() => !assistantStore.getState().streaming);
    expect(stream.bodies[1]).toMatchObject({ session_id: 's-1', message: 'And CH_02?' });
  });

  it('refuses empty text and a second question while busy', async () => {
    const { assistantStore } = await load();
    expect(assistantStore.send('   ')).toBe(false);
    stream.impl = () => new Promise(() => undefined);
    expect(assistantStore.send('one')).toBe(true);
    expect(assistantStore.send('two')).toBe(false);
    expect(stream.bodies).toHaveLength(1);
  });

  it('reports a stream that ends without done, and request errors', async () => {
    const { assistantStore, parse } = await load();
    stream.impl = emits([['text', { delta: 'Half', agent: '' }]], parse);
    assistantStore.send('q1');
    await until(() => !assistantStore.getState().streaming);
    expect(assistantStore.getState().messages[1].error).toMatch(/closed before/);

    stream.impl = () => Promise.reject(new Error('Daily AI budget reached'));
    assistantStore.send('q2');
    await until(() => !assistantStore.getState().streaming);
    expect(assistantStore.getState().messages[3].error).toBe('Daily AI budget reached');
  });

  it('starts a new conversation when the current one was deleted elsewhere', async () => {
    const { assistantStore, parse } = await load();
    stream.impl = emits(
      [
        ['session', { session_id: 's-9', title: 'Old' }],
        ['done', {}],
      ],
      parse
    );
    assistantStore.send('first');
    await until(() => !assistantStore.getState().streaming);
    expect(assistantStore.getState().sessionId).toBe('s-9');

    stream.impl = () =>
      Promise.reject(Object.assign(new Error('Conversation not found'), { statusCode: 404 }));
    assistantStore.send('second');
    await until(() => !assistantStore.getState().streaming);
    expect(stream.bodies[1]).toMatchObject({ session_id: 's-9' });
    expect(assistantStore.getState().sessionId).toBeNull();
    expect(assistantStore.getState().messages[3].error).toMatch(/no longer exists/);

    stream.impl = emits([['done', {}]], parse);
    assistantStore.send('third');
    await until(() => !assistantStore.getState().streaming);
    expect(stream.bodies[2]).toMatchObject({ message: 'third' });
    expect(stream.bodies[2].session_id).toBeUndefined();
  });

  it('stops an answer and keeps what arrived', async () => {
    const { assistantStore, parse } = await load();
    stream.impl = (_b, onEvent, signal) =>
      new Promise((_resolve, reject) => {
        const e = parse('text', { delta: 'Partial', agent: 'insight_agent' });
        if (e) onEvent(e);
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    assistantStore.send('long question');
    assistantStore.stop();
    await until(() => !assistantStore.getState().streaming);
    const answer = assistantStore.getState().messages[1];
    expect(answer).toMatchObject({ stopped: true, error: null });
    expect(answer.blocks[0]).toMatchObject({ text: 'Partial', final: true });
  });
});

describe('assistantStore.bindUser', () => {
  it('drops the conversation and stream of the previous user', async () => {
    const { assistantStore, parse } = await load();
    assistantStore.bindUser('jason_teo');
    stream.impl = emits([['session', { session_id: 's-1', title: 'Mine' }]], parse);
    assistantStore.send('first');
    await until(() => !assistantStore.getState().streaming);
    expect(assistantStore.getState().messages).toHaveLength(2);

    // the same user again changes nothing
    assistantStore.bindUser('jason_teo');
    expect(assistantStore.getState().sessionId).toBe('s-1');

    let aborted = false;
    stream.impl = (_b, _onEvent, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    assistantStore.send('second');
    assistantStore.bindUser('sarah_lim');
    expect(aborted).toBe(true);
    const s = assistantStore.getState();
    expect(s).toMatchObject({ owner: 'sarah_lim', sessionId: null, streaming: false });
    expect(s.messages).toEqual([]);
    await new Promise((r) => setTimeout(r, 20));
    // the aborted stream's outcome does not touch the new user's state
    expect(assistantStore.getState().messages).toEqual([]);
  });
});

describe('assistantStore.setOpen', () => {
  it('asks for the focus on every open request, also while open', async () => {
    const { assistantStore } = await load();
    const before = assistantStore.getState().focusRequest;
    assistantStore.setOpen(true);
    assistantStore.setOpen(true);
    expect(assistantStore.getState()).toMatchObject({ open: true, focusRequest: before + 2 });
    assistantStore.setOpen(false);
    assistantStore.setOpen(false);
    expect(assistantStore.getState()).toMatchObject({ open: false, focusRequest: before + 2 });
  });
});

describe('assistantStore.observeJob', () => {
  it('asks for a summary once when a job it saw running finishes', async () => {
    const { assistantStore, parse } = await load();
    stream.impl = emits([['done', {}]], parse);

    assistantStore.observeJob(41, 'SUCCEEDED'); // first seen finished: an old job, no message
    assistantStore.observeJob(42, 'RUNNING');
    assistantStore.observeJob(42, 'RUNNING');
    expect(stream.bodies).toHaveLength(0);

    assistantStore.observeJob(42, 'SUCCEEDED');
    expect(stream.bodies.map((b) => b.message)).toEqual([
      'Simulation #42 has finished. Summarise the results.',
    ]);
    await until(() => !assistantStore.getState().streaming);
    expect(assistantStore.getState().messages[0]).toMatchObject({ role: 'user', automatic: true });

    // never twice, also after a reload of the page (persisted)
    assistantStore.observeJob(42, 'RUNNING');
    assistantStore.observeJob(42, 'SUCCEEDED');
    const reloaded = await load();
    reloaded.assistantStore.observeJob(42, 'ANALYZING');
    reloaded.assistantStore.observeJob(42, 'SUCCEEDED');
    expect(stream.bodies).toHaveLength(1);
  });

  it('queues the follow-up while an answer is streaming', async () => {
    const { assistantStore, parse } = await load();
    let finish: () => void = () => undefined;
    stream.impl = (_b, onEvent) =>
      new Promise<void>((resolve) => {
        finish = () => {
          const e = parse('done', {});
          if (e) onEvent(e);
          resolve();
        };
      });
    assistantStore.send('first');
    assistantStore.observeJob(7, 'QUEUED');
    assistantStore.observeJob(7, 'FAILED');
    expect(stream.bodies).toHaveLength(1);

    stream.impl = emits([['done', {}]], parse);
    finish();
    await until(() => stream.bodies.length === 2);
    expect(stream.bodies[1].message).toBe('Simulation #7 has finished. Summarise the results.');
  });
});

describe('assistantStore navigation', () => {
  it("opens where the answer to the user's question navigates, never for automatic messages", async () => {
    const { assistantStore, parse } = await load();
    const opened: string[] = [];
    // the navigator refuses pages the user may not read
    assistantStore.setNavigator((t) => {
      if (t.page === 'ai-insights') return false;
      opened.push(t.label);
      return true;
    });
    stream.impl = emits(
      [
        ['navigate', { page: 'digital-twin', label: 'CT-01', asset: 'CT_01' }],
        ['navigate', { page: 'digital-twin', label: 'CT-02', asset: 'CT_02', view: 'walk' }],
        ['navigate', { page: 'ai-insights', label: 'Fault 43', tab: 'faults', item_id: 43 }],
        ['done', {}],
      ],
      parse
    );
    assistantStore.send('Walk me to CT-02');
    await until(() => !assistantStore.getState().streaming);
    // one batch of events: the last place the user may open wins; all stay in the answer
    expect(opened).toEqual(['CT-02']);
    expect(assistantStore.getState().messages[1].blocks.map((b) => b.kind)).toEqual([
      'navigation',
      'navigation',
      'navigation',
    ]);

    // the simulation follow-up the panel sends by itself does not move the user
    assistantStore.observeJob(5, 'RUNNING');
    assistantStore.observeJob(5, 'SUCCEEDED');
    expect(stream.bodies.map((b) => b.message)).toContain(
      'Simulation #5 has finished. Summarise the results.'
    );
    await until(() => !assistantStore.getState().streaming);
    expect(assistantStore.getState().messages).toHaveLength(4);
    expect(opened).toEqual(['CT-02']);
  });

  it('leaves a user who went elsewhere, or is busy in a field of the page, where they are', async () => {
    const { assistantStore, parse } = await load();
    const opened: string[] = [];
    assistantStore.setNavigator((t) => opened.push(t.label) > 0);
    let emit: (name: string, data: unknown) => void = () => undefined;
    let end: () => void = () => undefined;
    stream.impl = (_b, onEvent) =>
      new Promise<void>((resolve) => {
        emit = (name, data) => {
          const e = parse(name, data);
          if (e) onEvent(e);
        };
        end = () => {
          emit('done', {});
          resolve();
        };
      });
    const answer = async (question: string, label: string) => {
      assistantStore.send(question);
      emit('navigate', { page: 'digital-twin', label, asset: 'CT_01' });
      end();
      await until(() => !assistantStore.getState().streaming);
    };

    assistantStore.send('Show me CT-01, then CT-02, then fault 43');
    emit('navigate', { page: 'digital-twin', label: 'CT-01', asset: 'CT_01' });
    await until(() => opened.length === 1);
    // a later place of the same answer still opens while the user stays
    emit('navigate', { page: 'digital-twin', label: 'CT-02', asset: 'CT_02' });
    await until(() => opened.length === 2);
    // the user goes to another page meanwhile: the answer's next place stays a card
    assistantStore.userNavigated();
    emit('navigate', { page: 'ai-insights', label: 'Fault 43', tab: 'faults', item_id: 43 });
    end();
    await until(() => !assistantStore.getState().streaming);
    expect(opened).toEqual(['CT-01', 'CT-02']);
    expect(assistantStore.getState().messages[1].blocks.map((b) => b.kind)).toEqual([
      'navigation',
      'navigation',
      'navigation',
    ]);

    // the next question moves the user again, but not while they are filling in a page field
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();
    await answer('Open CT-01', 'typing');
    expect(opened).toEqual(['CT-01', 'CT-02']);
    field.remove();

    // the assistant's own question box is not the page
    const panel = document.createElement('section');
    panel.setAttribute('data-ai-assistant-panel', '');
    const box = document.createElement('textarea');
    panel.appendChild(box);
    document.body.appendChild(panel);
    box.focus();
    await answer('Open CT-01', 'from the panel');
    expect(opened).toEqual(['CT-01', 'CT-02', 'from the panel']);
    panel.remove();
  });

  it('steps the panel aside when it opens a place', async () => {
    const { assistantStore, parse } = await load();
    assistantStore.setNavigator((t) => t.page !== 'ai-insights');
    assistantStore.setOpen(true);
    stream.impl = emits(
      [
        ['navigate', { page: 'ai-insights', label: 'Fault 43', tab: 'faults', item_id: 43 }],
        ['done', {}],
      ],
      parse
    );
    // a place the user may not open leaves the panel open
    assistantStore.send('Open fault 43');
    await until(() => !assistantStore.getState().streaming);
    expect(assistantStore.getState()).toMatchObject({ open: true, unread: false });

    stream.impl = emits(
      [
        ['navigate', { page: 'digital-twin', label: 'CT-01', asset: 'CT_01' }],
        ['text', { delta: 'Check the fan.', agent: 'twin_agent' }],
        ['done', {}],
      ],
      parse
    );
    assistantStore.send('Show me CT-01');
    await until(() => !assistantStore.getState().streaming);
    // the answer finished behind the launcher: its dot tells
    expect(assistantStore.getState()).toMatchObject({ open: false, unread: true });
  });

  it('keeps the newest navigator when an older one is removed', async () => {
    const { assistantStore, parse } = await load();
    const opened: string[] = [];
    const removeFirst = assistantStore.setNavigator(() => opened.push('first') > 0);
    const removeSecond = assistantStore.setNavigator(() => opened.push('second') > 0);
    removeFirst();
    stream.impl = emits(
      [
        ['navigate', { page: 'alarm-report' }],
        ['done', {}],
      ],
      parse
    );
    assistantStore.send('Open the alarm report');
    await until(() => !assistantStore.getState().streaming);
    expect(opened).toEqual(['second']);

    removeSecond();
    assistantStore.send('Again');
    await until(() => !assistantStore.getState().streaming);
    expect(opened).toEqual(['second']);
  });
});

describe('assistant context', () => {
  it('sends the walk mode of the twin', async () => {
    const { assistantStore, parse, setAssistantContext } = await load();
    window.history.pushState({}, '', '/digital-twin');
    setAssistantContext({ page: 'digital-twin', assetAlias: 'CT_01', view: 'walk' });
    stream.impl = emits([['done', {}]], parse);
    assistantStore.send('What is in front of me?');
    await until(() => !assistantStore.getState().streaming);
    expect(stream.bodies[0].context).toEqual({
      page: 'digital-twin',
      asset_alias: 'CT_01',
      view: 'walk',
    });

    // leaving walk mode clears it
    setAssistantContext({ view: undefined });
    assistantStore.send('And now?');
    await until(() => !assistantStore.getState().streaming);
    expect(stream.bodies[1].context).toEqual({ page: 'digital-twin', asset_alias: 'CT_01' });
    window.history.pushState({}, '', '/');
  });

  it('never sends context published by another page', async () => {
    const { getAssistantContext, setAssistantContext } = await load();
    window.history.pushState({}, '', '/digital-twin');
    setAssistantContext({ page: 'digital-twin', assetAlias: 'CT_01' });
    expect(getAssistantContext('/digital-twin')).toEqual({
      page: 'digital-twin',
      assetAlias: 'CT_01',
    });
    expect(getAssistantContext('/alarm-report')).toEqual({ page: 'alarm-report' });

    window.history.pushState({}, '', '/simulation');
    setAssistantContext({ replayJobId: 3 });
    expect(getAssistantContext('/simulation')).toEqual({ page: 'simulation', replayJobId: 3 });
    window.history.pushState({}, '', '/');
  });
});
