import { describe, expect, it, vi } from 'vitest';

import {
  applyChatEvent,
  ChatMessage,
  finishAnswer,
  fromHistory,
  pendingAnswer,
  simulationFollowUpText,
  updateForm,
} from './ai-assistant.messages';
import { ChatEvent, parseChatEvent } from './api/ai-assistant.api';

// the shared request layer imports the UI kit for its toasts (CSS that vitest cannot load)
vi.mock('@digital-twin/reusables', () => ({
  toast: { error: () => undefined, success: () => undefined },
}));

// stored conversations are read with the shared request function
vi.mock('@digital-twin/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@digital-twin/utils')>()),
  request: vi.fn(),
}));

/** parse raw SSE payloads the way the stream does and fold them into a new answer */
const fold = (events: [string, unknown][], start: ChatMessage = pendingAnswer()) =>
  events
    .map(([name, data]) => parseChatEvent(name, data))
    .filter((e): e is ChatEvent => e !== null)
    .reduce(applyChatEvent, start);

describe('parseChatEvent', () => {
  it('ignores unknown and malformed events', () => {
    expect(parseChatEvent('ping', {})).toBeNull();
    expect(parseChatEvent('toString', {})).toBeNull();
    expect(parseChatEvent('text', { nope: 1 })).toBeNull();
  });

  it('maps snake_case payloads', () => {
    expect(parseChatEvent('session', { session_id: 'abc', title: 'T' })).toEqual({
      type: 'session',
      sessionId: 'abc',
      title: 'T',
    });
    expect(
      parseChatEvent('simulation', {
        job_id: 12,
        title: 'Raise CHWS',
        status: 'proposed',
        approval_required: true,
        rationale: 'Saves energy',
        spec_summary: { duration_min: 240 },
      })
    ).toMatchObject({
      type: 'simulation',
      simulation: { jobId: 12, status: 'PROPOSED', approvalRequired: true },
    });
    expect(
      parseChatEvent('usage', {
        input_tokens: 10,
        output_tokens: 5,
        cost_usd: 0.001,
        today_usd: 0.4,
        limit_usd: 4,
      })
    ).toMatchObject({ type: 'usage', usage: { inputTokens: 10, todayUsd: 0.4, limitUsd: 4 } });
  });
});

describe('applyChatEvent', () => {
  it('streams deltas and replaces them with the final text of the turn', () => {
    const m = fold([
      ['agent', { name: 'insight_agent' }],
      ['text', { delta: 'Hel', agent: 'insight_agent' }],
      ['text', { delta: 'lo', agent: 'insight_agent' }],
    ]);
    expect(m.agent).toBe('insight_agent');
    expect(m.blocks).toHaveLength(1);
    expect(m.blocks[0]).toMatchObject({ kind: 'text', text: 'Hello', final: false });

    const done = fold([['message', { text: 'Hello, world.', agent: 'insight_agent' }]], m);
    expect(done.blocks).toHaveLength(1);
    expect(done.blocks[0]).toMatchObject({ kind: 'text', text: 'Hello, world.', final: true });
  });

  it('keeps model turns of different agents apart and ignores a repeated final message', () => {
    const m = fold([
      ['text', { delta: 'Routing…', agent: 'plant_assistant' }],
      ['message', { text: 'Routing to the insight agent.', agent: 'plant_assistant' }],
      [
        'tool_call',
        { id: 't1', name: 'get_asset_summary', agent: 'insight_agent', args: { asset: 'CH_01' } },
      ],
      [
        'tool_result',
        {
          id: 't1',
          name: 'get_asset_summary',
          agent: 'insight_agent',
          ok: true,
          summary: '3 alarms',
        },
      ],
      ['message', { text: 'CH-01 is running.', agent: 'insight_agent' }],
      ['message', { text: 'CH-01 is running.', agent: 'insight_agent' }],
    ]);
    expect(m.blocks.map((b) => b.kind)).toEqual(['text', 'tool', 'text']);
    expect(m.blocks[1]).toMatchObject({ status: 'ok', summary: '3 alarms' });
    expect(m.blocks[2]).toMatchObject({ text: 'CH-01 is running.', final: true });
  });

  it('drops a streamed turn whose final text is empty (a function-call-only turn)', () => {
    const m = fold([
      ['text', { delta: ' ', agent: 'twin_agent' }],
      ['message', { text: '', agent: 'twin_agent' }],
    ]);
    expect(m.blocks).toHaveLength(0);
  });

  it('matches tool results without an id to the running call of that name', () => {
    const m = fold([
      ['tool_call', { name: 'search_documents', args: {} }],
      ['tool_result', { name: 'search_documents', ok: false, summary: 'timeout' }],
    ]);
    expect(m.blocks).toHaveLength(1);
    expect(m.blocks[0]).toMatchObject({ kind: 'tool', status: 'error', summary: 'timeout' });
  });

  it('deduplicates citations, charts and simulations', () => {
    const cite = {
      document_id: 7,
      title: 'WSC manual',
      doc_type: 'manual',
      page: 4,
      snippet: 'x',
      score: 0.8,
    };
    const m = fold([
      ['citations', { items: [cite, cite] }],
      ['citations', { items: [cite, { ...cite, page: 5 }] }],
      ['chart', { id: 'c1', title: 'CHWST', option: { series: [] } }],
      ['chart', { id: 'c1', title: 'CHWST (24 h)', option: { series: [] } }],
      ['simulation', { job_id: 3, title: 'A', status: 'PROPOSED', rationale: '' }],
      ['simulation', { job_id: 3, title: 'A', status: 'QUEUED', rationale: '' }],
    ]);
    expect(m.citations.map((c) => c.page)).toEqual([4, 5]);
    const kinds = m.blocks.map((b) => b.kind);
    expect(kinds).toEqual(['chart', 'simulation']);
    expect(m.blocks[0]).toMatchObject({ chart: { title: 'CHWST (24 h)' } });
    expect(m.blocks[1]).toMatchObject({ simulation: { status: 'QUEUED' } });
  });

  it('never merges charts without an id', () => {
    const m = fold([
      ['chart', { id: '', title: 'CHWST', option: {} }],
      ['chart', { id: '', title: 'kW/RT', option: {} }],
    ]);
    expect(m.blocks.map((b) => (b.kind === 'chart' ? b.chart.title : ''))).toEqual([
      'CHWST',
      'kW/RT',
    ]);
  });

  it('returns the same object when nothing changes', () => {
    const m = pendingAnswer();
    expect(applyChatEvent(m, { type: 'done' })).toBe(m);
    expect(applyChatEvent(m, { type: 'text', delta: '', agent: '' })).toBe(m);
  });

  it('adds the places the agent opened, once each', () => {
    const fanSpeed = {
      page: 'digital-twin',
      label: 'CT-01 fan speed',
      asset: 'CT_01',
      parameter: 'fan_speed',
    };
    const m = fold([
      ['tool_call', { id: 'n1', name: 'open_in_app', args: {} }],
      ['tool_result', { id: 'n1', name: 'open_in_app', ok: true, summary: 'opened' }],
      ['navigate', fanSpeed],
      ['navigate', fanSpeed],
      ['navigate', { page: 'ai-insights', label: 'Fault 43', tab: 'faults', item_id: 43 }],
      ['navigate', { page: 'nowhere', label: 'x' }],
      ['message', { text: 'Opened CT-01 for you.', agent: 'twin_agent' }],
    ]);
    expect(m.blocks.map((b) => b.kind)).toEqual(['tool', 'navigation', 'navigation', 'text']);
    expect(m.blocks[1]).toMatchObject({
      target: { page: 'digital-twin', asset: 'CT_01', parameter: 'fan_speed' },
    });
    expect(m.blocks[2]).toMatchObject({ target: { tab: 'faults', itemId: 43 } });
  });

  it('records errors and usage', () => {
    const m = fold([
      ['error', { message: 'Daily AI budget reached' }],
      ['usage', { input_tokens: 1, output_tokens: 2, cost_usd: 0.5 }],
    ]);
    expect(m.error).toBe('Daily AI budget reached');
    expect(m.usage).toMatchObject({ inputTokens: 1, outputTokens: 2, costUsd: 0.5 });
  });
});

describe('finishAnswer', () => {
  it('closes streamed text and marks unanswered tools', () => {
    const m = fold([
      ['tool_call', { id: 'a', name: 'list_assets' }],
      ['text', { delta: 'partial', agent: 'insight_agent' }],
    ]);
    const done = finishAnswer(m, { stopped: true });
    expect(done.streaming).toBe(false);
    expect(done.stopped).toBe(true);
    expect(done.blocks[0]).toMatchObject({ status: 'interrupted' });
    expect(done.blocks[1]).toMatchObject({ text: 'partial', final: true });
  });
});

describe('fromHistory', () => {
  it('rebuilds stored messages', () => {
    const user = fromHistory({
      id: '1',
      role: 'user',
      text: simulationFollowUpText(9),
      agent: '',
      charts: [],
      citations: [],
      simulations: [],
      toolCalls: [],
      forms: [],
      orders: [],
      navigations: [],
      createdAt: '2026-10-10T00:00:00.000Z',
    });
    expect(user.role).toBe('user');
    expect(user.automatic).toBe(true);

    const answer = fromHistory({
      id: '2',
      role: 'assistant',
      text: 'Done.',
      agent: 'twin_agent',
      charts: [{ id: 'c', title: 't', option: {} }],
      citations: [],
      simulations: [],
      toolCalls: [
        { id: 'x', name: 'get_plant_state', agent: '', args: null, ok: null, summary: '' },
      ],
      forms: [],
      orders: [],
      navigations: [],
      createdAt: null,
    });
    expect(answer.blocks.map((b) => b.kind)).toEqual(['tool', 'text', 'chart']);
    expect(answer.blocks[0]).toMatchObject({ status: 'ok', agent: 'twin_agent' });
  });

  it('rebuilds the places an answer opened from the stored navigations', async () => {
    const { getSession } = await import('./api/ai-assistant.api');
    const { request } = await import('@digital-twin/utils');
    vi.mocked(request).mockResolvedValueOnce({
      id: 's-1',
      title: 'Tower check',
      messages: [
        {
          role: 'assistant',
          text: 'Here is CT-01.',
          agent: 'twin_agent',
          tool_calls: [{ id: 'n1', name: 'open_in_app', ok: true }],
          navigations: [
            { page: 'digital-twin', label: 'CT-01', asset: 'CT_01', view: 'walk' },
            { page: 'digital-twin', label: 'CT-01', asset: 'CT_01', view: 'walk' },
            { page: 'bogus', label: 'dropped' },
            { page: 'simulation', label: 'Job 12', item_id: 12 },
          ],
        },
        // older answers have no navigations
        { role: 'assistant', text: 'Fine.', agent: 'insight_agent' },
      ],
    });
    const detail = await getSession('s-1');
    expect(detail.messages[0].navigations.map((t) => t.label)).toEqual([
      'CT-01',
      'CT-01',
      'Job 12',
    ]);
    expect(detail.messages[1].navigations).toEqual([]);

    const answer = fromHistory(detail.messages[0]);
    expect(answer.blocks.map((b) => b.kind)).toEqual(['tool', 'navigation', 'navigation', 'text']);
    expect(answer.blocks[1]).toMatchObject({ target: { asset: 'CT_01', view: 'walk' } });
    expect(answer.blocks[2]).toMatchObject({ target: { page: 'simulation', itemId: 12 } });
  });
});

describe('forms and maintenance orders', () => {
  const FORM = {
    form_id: 'f-1',
    kind: 'maintenance_order.reject',
    title: 'Reject CM-10-26-140',
    submit_label: 'Reject',
    danger: true,
    fields: [
      { name: 'reason', label: 'Reason', type: 'textarea', required: true },
      { name: 'weird', label: 'Odd', type: 'slider' },
      { label: 'no name' },
    ],
    context: { order_id: 44 },
  };

  it('adds a form once and an order card', () => {
    const m = fold([
      ['form', FORM],
      ['form', FORM],
      [
        'maintenance_order',
        {
          id: 44,
          name: 'CM-10-26-140',
          action: 'rejected',
          status: 'rejected',
          technicians: ['Ahmad Faizal'],
        },
      ],
    ]);
    expect(m.blocks.map((b) => b.kind)).toEqual(['form', 'order']);
    const form = m.blocks[0];
    if (form.kind !== 'form') throw new Error('not a form');
    expect(form.state).toBe('open');
    expect(form.form).toMatchObject({
      formId: 'f-1',
      submitLabel: 'Reject',
      danger: true,
      context: { order_id: 44 },
    });
    // an unknown field type falls back to text, a field without a name is dropped
    expect(form.form.fields.map((f) => [f.name, f.type, f.required])).toEqual([
      ['reason', 'textarea', true],
      ['weird', 'text', false],
    ]);
    const order = m.blocks[1];
    expect(order.kind === 'order' && order.order).toMatchObject({
      name: 'CM-10-26-140',
      status: 'REJECTED',
    });
  });

  it('marks the submitted form in the answer that holds it', () => {
    const asked = fold([['form', FORM]]);
    const other = fold([['message', { text: 'later', agent: 'maintenance_agent' }]]);
    const messages = [asked, other];
    const next = updateForm(messages, 'f-1', { state: 'done', message: 'Rejected.' });
    expect(next[0].blocks[0]).toMatchObject({ kind: 'form', state: 'done', message: 'Rejected.' });
    expect(next[1]).toBe(other);
    expect(updateForm(messages, 'missing', { state: 'done' })).toBe(messages);
    expect(parseChatEvent('form_result', { form_id: 'f-1', ok: false, message: 'No' })).toEqual({
      type: 'form_result',
      formId: 'f-1',
      ok: false,
      message: 'No',
    });
  });

  it('restores forms with their outcome from a stored answer', () => {
    const answer = fromHistory({
      id: '3',
      role: 'assistant',
      text: 'Fill in the reason below.',
      agent: 'maintenance_agent',
      charts: [],
      citations: [],
      simulations: [],
      toolCalls: [],
      navigations: [],
      forms: [
        {
          formId: 'f-1',
          kind: 'maintenance_order.reject',
          title: 'Reject',
          description: '',
          submitLabel: 'Reject',
          danger: true,
          fields: [],
          context: {},
          submitted: { ok: true, message: 'Rejected.' },
        },
      ],
      orders: [],
      createdAt: null,
    });
    expect(answer.blocks.find((b) => b.kind === 'form')).toMatchObject({
      state: 'done',
      message: 'Rejected.',
    });
  });
});
