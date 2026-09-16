import { request, streamRequest } from '@digital-twin/utils';
import { z } from 'zod';

import { isSectionId, NAV_PAGES, PAGE_TITLE } from '../navigation';

/**
 * The AI assistant service, reached through the backend's `/api/agent/*` proxy (session header,
 * `aiassistant.read`). Responses are the agent's own JSON (no `{data, error}` envelope); the chat
 * is a Server-Sent Events stream (DESIGN.md 6.3 / 6.4). Payloads are validated leniently: a field
 * the agent leaves out never breaks the conversation, an unknown event is ignored.
 */

const AGENT = '/api/agent';

const id = z.union([z.string(), z.number()]).transform(String);
const text = z
  .string()
  .nullish()
  .transform((v) => v ?? '');
const num = z.coerce.number().nullish().catch(null);

// ------------------------------------------------------------------ shared payloads

const citationSchema = z
  .object({
    ref: num,
    document_id: z.coerce.number(),
    title: text,
    doc_type: text,
    page: num,
    snippet: text,
    score: num,
  })
  .transform((c) => ({
    /** answer-wide reference number the text cites as [ref] (absent in older conversations) */
    ref: typeof c.ref === 'number' && c.ref > 0 ? Math.round(c.ref) : null,
    documentId: c.document_id,
    title: c.title || `Document ${c.document_id}`,
    docType: c.doc_type,
    page: typeof c.page === 'number' && c.page > 0 ? Math.round(c.page) : null,
    snippet: c.snippet,
    score: c.score ?? null,
  }));
export type Citation = z.output<typeof citationSchema>;

const chartSchema = z
  .object({
    id: id.nullish(),
    title: text,
    option: z.record(z.unknown()),
  })
  // an empty id (the agent sends "" when a tool gave none) identifies nothing: such charts are
  // never merged with each other
  .transform((c) => ({ id: c.id || null, title: c.title, option: c.option }));
export type ChartPayload = z.output<typeof chartSchema>;

const simulationSchema = z
  .object({
    job_id: z.coerce.number().int().positive(),
    title: text,
    status: z
      .string()
      .nullish()
      .transform((s) => (s || 'PROPOSED').toUpperCase()),
    approval_required: z.boolean().nullish(),
    rationale: text,
    spec_summary: z.unknown().optional(),
  })
  .transform((s) => ({
    jobId: s.job_id,
    title: s.title || `Simulation #${s.job_id}`,
    status: s.status,
    approvalRequired: s.approval_required ?? s.status === 'PROPOSED',
    rationale: s.rationale,
    specSummary: s.spec_summary ?? null,
  }));
export type SimulationProposal = z.output<typeof simulationSchema>;

const usageSchema = z
  .object({
    input_tokens: num,
    output_tokens: num,
    cost_usd: num,
    today_usd: num,
    limit_usd: num,
  })
  .transform((u) => ({
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    costUsd: u.cost_usd ?? 0,
    todayUsd: u.today_usd ?? null,
    limitUsd: u.limit_usd ?? null,
  }));
export type Usage = z.output<typeof usageSchema>;

/** a trimmed string, null when absent, empty or not a string */
const optionalText = z
  .string()
  .nullish()
  .catch(null)
  .transform((v) => v?.trim() || null);
const positiveId = z.coerce.number().int().positive().nullish().catch(null);

/**
 * Where the agent's `open_in_app` tool sends the user (`navigate` event, `navigations` of a stored
 * answer). An unknown page drops the target; a malformed optional field is just left out.
 */
const navigationSchema = z
  .object({
    page: z
      .string()
      .transform((p) => p.trim().toLowerCase())
      .pipe(z.enum(NAV_PAGES)),
    label: optionalText,
    asset: optionalText,
    asset_id: positiveId,
    parameter: optionalText,
    location: optionalText,
    tab: optionalText,
    item_id: positiveId,
    view: optionalText,
    panel: optionalText,
    section: optionalText,
  })
  .transform((n) => {
    const view = n.view?.toLowerCase();
    return {
      page: n.page,
      label: n.label ?? PAGE_TITLE[n.page],
      asset: n.asset,
      assetId: n.asset_id ?? null,
      parameter: n.parameter,
      location: n.location,
      tab: n.tab?.toLowerCase() ?? null,
      itemId: n.item_id ?? null,
      view: view === 'walk' || view === 'orbit' ? view : null,
      panel: n.panel,
      section: n.section && isSectionId(n.section) ? n.section : null,
    };
  });
export type NavigationTarget = z.output<typeof navigationSchema>;

// ------------------------------------------------------------------ sessions

const sessionSummarySchema = z
  .object({ id, title: text, updated_at: z.string().nullish() })
  .transform((s) => ({
    id: s.id,
    title: s.title.trim() || 'New conversation',
    updatedAt: s.updated_at ?? null,
  }));
export type SessionSummary = z.output<typeof sessionSummarySchema>;

const toolCallSchema = z
  .object({
    id: id.nullish(),
    name: z.string(),
    agent: text,
    args: z.unknown().optional(),
    ok: z.boolean().nullish(),
    summary: text,
  })
  .transform((t) => ({
    id: t.id ?? '',
    name: t.name,
    agent: t.agent,
    args: t.args ?? null,
    ok: t.ok ?? null,
    summary: t.summary,
  }));
export type HistoryToolCall = z.output<typeof toolCallSchema>;

/** an element of a list that fails validation is dropped, not the whole message */
const lenientList = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .array(z.unknown())
    .nullish()
    .transform((items) =>
      (items ?? []).flatMap((item) => {
        const r = schema.safeParse(item);
        return r.success ? [r.data as z.output<T>] : [];
      })
    );

const historyMessageSchema = z
  .object({
    id: id.nullish(),
    role: z.string(),
    text,
    agent: text,
    charts: lenientList(chartSchema),
    citations: lenientList(citationSchema),
    simulations: lenientList(simulationSchema),
    tool_calls: lenientList(toolCallSchema),
    navigations: lenientList(navigationSchema),
    created_at: z.string().nullish(),
  })
  .transform((m) => ({
    id: m.id ?? null,
    role: m.role.toLowerCase() === 'user' ? ('user' as const) : ('assistant' as const),
    text: m.text,
    agent: m.agent,
    charts: m.charts,
    citations: m.citations,
    simulations: m.simulations,
    toolCalls: m.tool_calls,
    navigations: m.navigations,
    createdAt: m.created_at ?? null,
  }));
export type HistoryMessage = z.output<typeof historyMessageSchema>;

const sessionDetailSchema = z
  .object({ id, title: text, messages: lenientList(historyMessageSchema) })
  .transform((s) => ({
    id: s.id,
    title: s.title.trim() || 'New conversation',
    messages: s.messages,
  }));
export type SessionDetail = z.output<typeof sessionDetailSchema>;

/** The user's conversations, most recent first */
export const listSessions = async (): Promise<SessionSummary[]> => {
  const data = await request({ method: 'GET', url: `${AGENT}/sessions` });
  const rows = Array.isArray(data) ? data : (data?.sessions ?? data?.data ?? []);
  return lenientList(sessionSummarySchema)
    .parse(rows)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
};

export const getSession = async (sessionId: string): Promise<SessionDetail> => {
  const data = await request({
    method: 'GET',
    url: `${AGENT}/sessions/${encodeURIComponent(sessionId)}`,
  });
  return sessionDetailSchema.parse(data);
};

export const deleteSession = async (sessionId: string) => {
  await request({ method: 'DELETE', url: `${AGENT}/sessions/${encodeURIComponent(sessionId)}` });
  return sessionId;
};

// ------------------------------------------------------------------ documents

/**
 * The PDF of a cited document, from the private document store through the backend (session
 * header), as a Blob for an object URL.
 */
export const fetchDocumentFile = async (documentId: number, signal?: AbortSignal) => {
  try {
    const data = await request({
      method: 'GET',
      url: `/api/ai/documents/${documentId}/file`,
      responseType: 'blob',
      signal,
    });
    if (!(data instanceof Blob)) throw new Error('The document could not be read');
    return data;
  } catch (e) {
    const status = (e as { statusCode?: number } | null)?.statusCode;
    if (status === 403) throw new Error('You do not have access to this document');
    if (status === 404) throw new Error('The document is no longer available');
    throw e instanceof Error ? e : new Error('The document could not be opened');
  }
};

// ------------------------------------------------------------------ chat stream

/** The request body context (DESIGN.md 6.3: snake_case) */
export type ChatContextBody = {
  page?: string;
  node_id?: string;
  asset_alias?: string;
  replay_job_id?: number;
  /** 'walk' while the digital twin is in first-person walk mode */
  view?: string;
};

export type ChatRequestBody = {
  session_id?: string;
  message: string;
  context?: ChatContextBody;
};

const eventSchemas = {
  session: z
    .object({ session_id: id, title: text })
    .transform((d) => ({ type: 'session' as const, sessionId: d.session_id, title: d.title })),
  agent: z
    .object({ name: z.string() })
    .transform((d) => ({ type: 'agent' as const, name: d.name })),
  text: z
    .object({ delta: z.string(), agent: text })
    .transform((d) => ({ type: 'text' as const, delta: d.delta, agent: d.agent })),
  message: z
    .object({ text, agent: text })
    .transform((d) => ({ type: 'message' as const, text: d.text, agent: d.agent })),
  tool_call: z
    .object({ id: id.nullish(), name: z.string(), agent: text, args: z.unknown().optional() })
    .transform((d) => ({
      type: 'tool_call' as const,
      id: d.id ?? '',
      name: d.name,
      agent: d.agent,
      args: d.args ?? null,
    })),
  tool_result: z
    .object({ id: id.nullish(), name: text, agent: text, ok: z.boolean().nullish(), summary: text })
    .transform((d) => ({
      type: 'tool_result' as const,
      id: d.id ?? '',
      name: d.name,
      agent: d.agent,
      ok: d.ok ?? true,
      summary: d.summary,
    })),
  chart: chartSchema.transform((d) => ({ type: 'chart' as const, chart: d })),
  citations: z
    .object({ items: lenientList(citationSchema) })
    .transform((d) => ({ type: 'citations' as const, items: d.items })),
  simulation: simulationSchema.transform((d) => ({ type: 'simulation' as const, simulation: d })),
  usage: usageSchema.transform((d) => ({ type: 'usage' as const, usage: d })),
  navigate: navigationSchema.transform((d) => ({ type: 'navigate' as const, target: d })),
  error: z
    .object({ message: text })
    .transform((d) => ({ type: 'error' as const, message: d.message || 'The assistant failed' })),
  done: z.unknown().transform(() => ({ type: 'done' as const })),
};

type EventName = keyof typeof eventSchemas;
export type ChatEvent = z.output<(typeof eventSchemas)[EventName]>;

const EVENT_NAMES = new Set<string>(Object.keys(eventSchemas));

const isEventName = (name: string): name is EventName => EVENT_NAMES.has(name);

/** A validated chat event, or null for an unknown or malformed one (logged, then ignored) */
export const parseChatEvent = (name: string, data: unknown): ChatEvent | null => {
  if (!isEventName(name)) return null;
  const schema: z.ZodTypeAny = eventSchemas[name];
  const parsed = schema.safeParse(data ?? {});
  if (!parsed.success) {
    console.warn(`AI assistant: ignored malformed "${name}" event`, parsed.error.issues);
    return null;
  }
  return parsed.data as ChatEvent;
};

/** Send one message and read the answer as validated events until the stream ends */
export const streamChat = (
  body: ChatRequestBody,
  onEvent: (event: ChatEvent) => void,
  signal: AbortSignal
) =>
  streamRequest(`${AGENT}/chat`, body, {
    signal,
    onEvent: (name, data) => {
      const event = parseChatEvent(name, data);
      if (event) onEvent(event);
    },
  });

// ------------------------------------------------------------------ react-query keys

/** (simulation jobs shown in the conversation share the simulation page's SIM_QUERY.job cache) */
export const ASSISTANT_QUERY = {
  sessions: ['AI_ASSISTANT', 'SESSIONS'] as const,
};
