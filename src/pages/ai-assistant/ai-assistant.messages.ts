import {
  AssistantForm,
  ChartPayload,
  ChatEvent,
  Citation,
  HistoryMessage,
  MaintenanceOrderCard,
  NavigationTarget,
  SimulationProposal,
  Usage,
} from './api/ai-assistant.api';
import { sameTarget } from './navigation';

/**
 * The conversation model of the assistant panel and the pure reducer that folds the SSE events of
 * one answer (DESIGN.md 6.4) into it. An answer is an ordered list of blocks (text of each model
 * turn, tool activity, charts, simulation proposals, places in the app it opened) plus its cited
 * sources.
 */

export type ToolStatus = 'running' | 'ok' | 'error' | 'interrupted';

export type TextBlock = { kind: 'text'; key: string; text: string; agent: string; final: boolean };
export type ToolBlock = {
  kind: 'tool';
  key: string;
  id: string;
  name: string;
  agent: string;
  args: unknown;
  status: ToolStatus;
  summary: string;
};
export type ChartBlock = { kind: 'chart'; key: string; chart: ChartPayload };
export type SimulationBlock = { kind: 'simulation'; key: string; simulation: SimulationProposal };
/** a place in the app the agent opened (`open_in_app`) */
export type NavigationBlock = { kind: 'navigation'; key: string; target: NavigationTarget };
/** open: to fill in; submitting: sent with a message; done: carried out; failed: refused (editable again) */
export type FormState = 'open' | 'submitting' | 'done' | 'failed';
/** a form the agent asks the user to fill in (elicitation) */
export type FormBlock = {
  kind: 'form';
  key: string;
  form: AssistantForm;
  state: FormState;
  /** the outcome of the submission (done / failed) */
  message: string;
};
/** a maintenance order after the assistant (or a submitted form) acted on it */
export type OrderBlock = { kind: 'order'; key: string; order: MaintenanceOrderCard };
export type Block =
  | TextBlock
  | ToolBlock
  | ChartBlock
  | SimulationBlock
  | NavigationBlock
  | FormBlock
  | OrderBlock;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  blocks: Block[];
  citations: Citation[];
  /** the agent that answered last (assistant messages) */
  agent: string;
  createdAt: string;
  /** the answer is still streaming */
  streaming: boolean;
  /** the user stopped the answer */
  stopped: boolean;
  error: string | null;
  usage: Usage | null;
  /** a user message the panel sent by itself (simulation follow-up) */
  automatic: boolean;
};

let keySeq = 0;
/** Unique React keys for messages and blocks created in this page lifetime */
export const nextKey = (prefix: string) => `${prefix}-${++keySeq}`;

const AGENT_LABEL: Record<string, string> = {
  plant_assistant: 'LEVO',
  insight_agent: 'Insight agent',
  twin_agent: 'Digital twin agent',
  deep_analyst: 'Deep analyst',
};

const words = (s: string) => {
  const t = s.replace(/[_-]+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : s;
};

/** Display name of an agent ('insight_agent' → 'Insight agent') */
export const agentLabel = (name: string) => AGENT_LABEL[name] ?? words(name);

/** Display name of a tool ('afdd-db__query_parameter_history' → 'Query parameter history') */
export const toolLabel = (name: string) => words(name.split(/__|\./).pop() ?? name);

/** The message the panel sends by itself when a simulation it is tracking finishes */
export const simulationFollowUpText = (jobId: number) =>
  `Simulation #${jobId} has finished. Summarise the results.`;

const FOLLOW_UP_RE = /^Simulation #\d+ has finished\. Summarise the results\.$/;

export const userMessage = (text: string, automatic = false): ChatMessage => ({
  id: nextKey('msg'),
  role: 'user',
  blocks: [{ kind: 'text', key: nextKey('blk'), text, agent: '', final: true }],
  citations: [],
  agent: '',
  createdAt: new Date().toISOString(),
  streaming: false,
  stopped: false,
  error: null,
  usage: null,
  automatic,
});

/** The empty answer a request starts with */
export const pendingAnswer = (): ChatMessage => ({
  id: nextKey('msg'),
  role: 'assistant',
  blocks: [],
  citations: [],
  agent: '',
  createdAt: new Date().toISOString(),
  streaming: true,
  stopped: false,
  error: null,
  usage: null,
  automatic: false,
});

/** The plain text of a message (user messages, copy, retry) */
export const messageText = (m: ChatMessage) =>
  m.blocks
    .filter((b): b is TextBlock => b.kind === 'text')
    .map((b) => b.text)
    .join('\n\n');

const citationKey = (c: Citation) =>
  c.ref !== null ? `ref:${c.ref}` : `${c.documentId}#${c.page ?? ''}`;

export const mergeCitations = (current: Citation[], items: Citation[]) => {
  const seen = new Set(current.map(citationKey));
  const added = items.filter((c) => {
    const k = citationKey(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return added.length ? [...current, ...added] : current;
};

const lastIndex = <T>(list: T[], test: (item: T) => boolean) => {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return i;
  return -1;
};

const replaceAt = <T>(list: T[], index: number, item: T) => {
  const copy = list.slice();
  copy[index] = item;
  return copy;
};

/**
 * Fold one event of the answer stream into the answer. Returns the same object when the event
 * changes nothing (React bails out). `session` and `done` are stream-level and handled by the store.
 */
export const applyChatEvent = (m: ChatMessage, e: ChatEvent): ChatMessage => {
  switch (e.type) {
    case 'agent':
      return e.name && e.name !== m.agent ? { ...m, agent: e.name } : m;

    case 'text': {
      if (!e.delta) return m;
      const agent = e.agent || m.agent;
      const last = m.blocks[m.blocks.length - 1];
      if (last?.kind === 'text' && !last.final && last.agent === agent) {
        return {
          ...m,
          agent,
          blocks: replaceAt(m.blocks, m.blocks.length - 1, { ...last, text: last.text + e.delta }),
        };
      }
      return {
        ...m,
        agent,
        blocks: [
          ...m.blocks,
          { kind: 'text', key: nextKey('blk'), text: e.delta, agent, final: false },
        ],
      };
    }

    case 'message': {
      // the final text of one model turn replaces the deltas streamed for it
      const agent = e.agent || m.agent;
      const i = lastIndex(m.blocks, (b) => b.kind === 'text' && !b.final && b.agent === agent);
      if (i >= 0) {
        const block = m.blocks[i] as TextBlock;
        const blocks = e.text.trim()
          ? replaceAt(m.blocks, i, { ...block, text: e.text, final: true })
          : m.blocks.filter((_, j) => j !== i);
        return { ...m, agent, blocks };
      }
      if (!e.text.trim()) return m;
      const prev = m.blocks[lastIndex(m.blocks, (b) => b.kind === 'text')] as TextBlock | undefined;
      if (prev && prev.final && prev.agent === agent && prev.text === e.text) return m;
      return {
        ...m,
        agent,
        blocks: [
          ...m.blocks,
          { kind: 'text', key: nextKey('blk'), text: e.text, agent, final: true },
        ],
      };
    }

    case 'tool_call': {
      const i = e.id ? lastIndex(m.blocks, (b) => b.kind === 'tool' && b.id === e.id) : -1;
      if (i >= 0) {
        const block = m.blocks[i] as ToolBlock;
        return { ...m, blocks: replaceAt(m.blocks, i, { ...block, args: e.args }) };
      }
      return {
        ...m,
        blocks: [
          ...m.blocks,
          {
            kind: 'tool',
            key: nextKey('blk'),
            id: e.id,
            name: e.name,
            agent: e.agent || m.agent,
            args: e.args,
            status: 'running',
            summary: '',
          },
        ],
      };
    }

    case 'tool_result': {
      const status: ToolStatus = e.ok ? 'ok' : 'error';
      let i = e.id ? lastIndex(m.blocks, (b) => b.kind === 'tool' && b.id === e.id) : -1;
      if (i < 0) {
        i = lastIndex(
          m.blocks,
          (b) => b.kind === 'tool' && b.status === 'running' && (!e.name || b.name === e.name)
        );
      }
      if (i >= 0) {
        const block = m.blocks[i] as ToolBlock;
        return {
          ...m,
          blocks: replaceAt(m.blocks, i, { ...block, status, summary: e.summary }),
        };
      }
      return {
        ...m,
        blocks: [
          ...m.blocks,
          {
            kind: 'tool',
            key: nextKey('blk'),
            id: e.id,
            name: e.name || 'tool',
            agent: e.agent || m.agent,
            args: null,
            status,
            summary: e.summary,
          },
        ],
      };
    }

    case 'chart': {
      const i =
        e.chart.id !== null
          ? lastIndex(m.blocks, (b) => b.kind === 'chart' && b.chart.id === e.chart.id)
          : -1;
      if (i >= 0) {
        const block = m.blocks[i] as ChartBlock;
        return { ...m, blocks: replaceAt(m.blocks, i, { ...block, chart: e.chart }) };
      }
      return {
        ...m,
        blocks: [...m.blocks, { kind: 'chart', key: nextKey('blk'), chart: e.chart }],
      };
    }

    case 'citations': {
      const citations = mergeCitations(m.citations, e.items);
      return citations === m.citations ? m : { ...m, citations };
    }

    case 'simulation': {
      const i = lastIndex(
        m.blocks,
        (b) => b.kind === 'simulation' && b.simulation.jobId === e.simulation.jobId
      );
      if (i >= 0) {
        const block = m.blocks[i] as SimulationBlock;
        return { ...m, blocks: replaceAt(m.blocks, i, { ...block, simulation: e.simulation }) };
      }
      return {
        ...m,
        blocks: [
          ...m.blocks,
          { kind: 'simulation', key: nextKey('blk'), simulation: e.simulation },
        ],
      };
    }

    case 'navigate': {
      // the same place (and label) is shown once per answer
      const known = m.blocks.some((b) => b.kind === 'navigation' && sameTarget(b.target, e.target));
      if (known) return m;
      return {
        ...m,
        blocks: [...m.blocks, { kind: 'navigation', key: nextKey('blk'), target: e.target }],
      };
    }

    case 'form': {
      if (m.blocks.some((b) => b.kind === 'form' && b.form.formId === e.form.formId)) return m;
      return {
        ...m,
        blocks: [
          ...m.blocks,
          { kind: 'form', key: nextKey('blk'), form: e.form, state: 'open', message: '' },
        ],
      };
    }

    case 'maintenance_order':
      return {
        ...m,
        blocks: [...m.blocks, { kind: 'order', key: nextKey('blk'), order: e.order }],
      };

    case 'usage':
      return { ...m, usage: e.usage };

    case 'error':
      return { ...m, error: e.message };

    default:
      return m;
  }
};

/** Close an answer when its stream ends: streamed text is kept, unanswered tools are marked */
export const finishAnswer = (
  m: ChatMessage,
  outcome: { stopped?: boolean; error?: string | null }
): ChatMessage => ({
  ...m,
  streaming: false,
  stopped: !!outcome.stopped,
  error: outcome.error ?? m.error,
  blocks: m.blocks.map((b) => {
    if (b.kind === 'text' && !b.final) return { ...b, final: true };
    if (b.kind === 'tool' && b.status === 'running') return { ...b, status: 'interrupted' };
    return b;
  }),
});

/**
 * The conversation with one form's state changed (the form sits in an earlier answer than the
 * message that submitted it). Returns the same array when the form is not there.
 */
export const updateForm = (
  messages: ChatMessage[],
  formId: string,
  patch: { state: FormState; message?: string }
): ChatMessage[] => {
  let changed = false;
  const next = messages.map((m) => {
    const i = m.blocks.findIndex((b) => b.kind === 'form' && b.form.formId === formId);
    if (i < 0) return m;
    changed = true;
    const block = m.blocks[i] as FormBlock;
    return {
      ...m,
      blocks: replaceAt(m.blocks, i, {
        ...block,
        state: patch.state,
        message: patch.message ?? block.message,
      }),
    };
  });
  return changed ? next : messages;
};

/** A stored message of a conversation (GET /sessions/{id}) */
export const fromHistory = (h: HistoryMessage): ChatMessage => {
  if (h.role === 'user') {
    return {
      ...userMessage(h.text, FOLLOW_UP_RE.test(h.text.trim())),
      createdAt: h.createdAt ?? new Date(0).toISOString(),
    };
  }
  const blocks: Block[] = [
    ...h.toolCalls.map<ToolBlock>((t) => ({
      kind: 'tool',
      key: nextKey('blk'),
      id: t.id,
      name: t.name,
      agent: t.agent || h.agent,
      args: t.args,
      status: t.ok === false ? 'error' : 'ok',
      summary: t.summary,
    })),
    // where the answer took the user: after its tools, as streamed (never opened again)
    ...h.navigations
      .filter((t, i, all) => all.findIndex((o) => sameTarget(o, t)) === i)
      .map<NavigationBlock>((target) => ({ kind: 'navigation', key: nextKey('blk'), target })),
    ...(h.text.trim()
      ? [
          {
            kind: 'text' as const,
            key: nextKey('blk'),
            text: h.text,
            agent: h.agent,
            final: true,
          },
        ]
      : []),
    ...h.charts.map<ChartBlock>((chart) => ({ kind: 'chart', key: nextKey('blk'), chart })),
    ...h.simulations.map<SimulationBlock>((simulation) => ({
      kind: 'simulation',
      key: nextKey('blk'),
      simulation,
    })),
    ...h.orders.map<OrderBlock>((order) => ({ kind: 'order', key: nextKey('blk'), order })),
    ...h.forms.map<FormBlock>((form) => ({
      kind: 'form',
      key: nextKey('blk'),
      form,
      state: form.submitted ? (form.submitted.ok ? 'done' : 'failed') : 'open',
      message: form.submitted?.message ?? '',
    })),
  ];
  return {
    id: nextKey('msg'),
    role: 'assistant',
    blocks,
    citations: mergeCitations([], h.citations),
    agent: h.agent,
    createdAt: h.createdAt ?? new Date(0).toISOString(),
    streaming: false,
    stopped: false,
    error: null,
    usage: null,
    automatic: false,
  };
};
