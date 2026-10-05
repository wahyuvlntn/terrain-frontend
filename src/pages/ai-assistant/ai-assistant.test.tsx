import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ComponentType, ContextType, StrictMode } from 'react';
import { MemoryRouter, NavigateFunction, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatEvent, ChatRequestBody, SessionDetail } from './api/ai-assistant.api';

// every test re-imports the assistant with its dependencies (module state), which takes a while
vi.setConfig({ testTimeout: 30_000 });

// the shared request layer imports the UI kit for its toasts (CSS that vitest cannot load)
vi.mock('@digital-twin/reusables', () => ({
  toast: { error: () => undefined, success: () => undefined },
}));

// the icon library is ~950 SVG components; the assistant uses these
vi.mock('@digital-twin/icons', async () => {
  const { createElement } = await import('react');
  const icon = (props: object) => createElement('svg', props);
  return {
    AlertAlarm: icon,
    AssetV3: icon,
    Bulb: icon,
    ChartAlert: icon,
    Close: icon,
    Cube: icon,
    DatasetGrid: icon,
    FilePdf: icon,
    Fullscreen: icon,
    HardwareChip: icon,
    InformationCircle: icon,
    Instruction: icon,
    LockClosed: icon,
    MessageEllipsesFill: icon,
    Messages: icon,
    MOrder: icon,
    MPerform: icon,
    Personnel: icon,
    Plus: icon,
    SendFill: icon,
    SettingAlert: icon,
    StopFill: icon,
    Timer: icon,
    TrashDelete: icon,
  };
});

// the parts of the shared component library the assistant uses (the status / condition enums of
// the twin's test double for the simulation API it reads jobs with)
vi.mock('@digital-twin/components', async () => {
  const { createContext } = await import('react');
  const { z } = await import('zod');
  return {
    ...(await import('../digital-twin/testing/digital-twin-components.mock')),
    AuthCtx: createContext({ hasPermission: () => false }),
    ThemeContext: createContext({ colors: {} }),
    PermissionGroupAliasEnum: z.enum(['aiassistant', 'aiinsights', 'simulation', 'digitaltwin']),
    PermissionAliasEnum: z.enum(['read', 'create', 'update']),
    CONDITION_COLOR: { NORMAL: 'green', WARNING: 'orange', CRITICAL: 'red' },
  };
});

const sim = vi.hoisted(() => ({
  approveJob: vi.fn(),
  rejectJob: vi.fn(),
  getJob: vi.fn(),
}));
vi.mock('../simulation/api/simulation.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../simulation/api/simulation.api')>()),
  ...sim,
}));

const chat = vi.hoisted(() => ({
  bodies: [] as ChatRequestBody[],
  events: [] as [string, unknown][],
  /** while set, the answer stream stays open until it resolves */
  hold: null as Promise<void> | null,
  sessions: [] as { id: string; title: string; updatedAt: string | null }[],
  getSession: (_id: string): Promise<SessionDetail> => Promise.reject(new Error('no session')),
  /** sends a further event on the latest answer stream (one held open by `hold`) */
  emit: (_name: string, _data: unknown): void => undefined,
}));
vi.mock('./api/ai-assistant.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/ai-assistant.api')>();
  return {
    ...actual,
    listSessions: () => Promise.resolve(chat.sessions),
    getSession: (id: string) => chat.getSession(id),
    streamChat: (body: ChatRequestBody, onEvent: (e: ChatEvent) => void) => {
      chat.bodies.push(body);
      chat.emit = (name, data) => {
        const e = actual.parseChatEvent(name, data);
        if (e) onEvent(e);
      };
      for (const [name, data] of chat.events) chat.emit(name, data);
      return chat.hold ?? Promise.resolve();
    },
  };
});

const ANSWER: [string, unknown][] = [
  ['session', { session_id: 's-1', title: 'Chiller check' }],
  ['agent', { name: 'insight_agent' }],
  [
    'tool_call',
    { id: 't1', name: 'get_asset_summary', agent: 'insight_agent', args: { asset: 'CH_01' } },
  ],
  [
    'tool_result',
    { id: 't1', name: 'get_asset_summary', agent: 'insight_agent', ok: true, summary: 'ok' },
  ],
  ['text', { delta: 'CH-01 is ', agent: 'insight_agent' }],
  ['message', { text: 'CH-01 is **running** [1].', agent: 'insight_agent' }],
  [
    'citations',
    {
      items: [
        {
          document_id: 7,
          title: 'WSC manual',
          doc_type: 'manual',
          page: 4,
          snippet: 's',
          score: 1,
        },
      ],
    },
  ],
  [
    'simulation',
    {
      job_id: 12,
      title: 'Raise CHWS set point',
      status: 'PROPOSED',
      approval_required: true,
      rationale: 'The optimizer predicts a 3 % saving.',
      spec_summary: { duration_min: 240, variants: ['baseline', 'recommended'] },
    },
  ],
  [
    'usage',
    { input_tokens: 100, output_tokens: 20, cost_usd: 0.002, today_usd: 0.5, limit_usd: 4 },
  ],
  ['done', {}],
];

let queryClient: QueryClient;

/** the router's current URL (path + query), its history state and its navigate */
const here = { url: '', state: null as unknown, navigate: (() => undefined) as NavigateFunction };
const LocationProbe = () => {
  const location = useLocation();
  here.url = `${location.pathname}${location.search}`;
  here.state = location.state;
  here.navigate = useNavigate();
  return null;
};

/**
 * render the assistant (fresh module state) for a user holding `permissions` ("group.alias") on
 * the page at `path`
 */
const renderAssistant = async (permissions: string[], path = '/digital-twin') => {
  vi.resetModules();
  const { AiAssistant } = (await import('./ai-assistant')) as { AiAssistant: ComponentType };
  const { AuthCtx } = await import('@digital-twin/components');
  const auth = {
    userData: { fullName: 'Test', role: 'basic', permissions: [] },
    hasPermission: (group: string, alias: string) => permissions.includes(`${group}.${alias}`),
  } as unknown as ContextType<typeof AuthCtx>;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient = client;
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={client}>
          <AuthCtx.Provider value={auth}>
            <AiAssistant />
            <LocationProbe />
          </AuthCtx.Provider>
        </QueryClientProvider>
      </MemoryRouter>
    </StrictMode>
  );
};

const openPanel = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Open LEVO' }));
  return screen.getByRole('dialog', { name: 'LEVO' });
};

/** let the promises started by an event (mocked requests, stream) settle */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

const ask = async (text: string) => {
  const input = screen.getByLabelText('Message to LEVO');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await settle();
};

// the first import transforms the whole dependency tree (slow when other suites run in parallel);
// the tests' fresh imports then only re-evaluate it
beforeAll(async () => {
  await import('./ai-assistant');
}, 180_000);

beforeEach(() => {
  chat.bodies = [];
  chat.events = ANSWER;
  chat.hold = null;
  chat.sessions = [];
  window.localStorage.clear();
  sim.getJob.mockResolvedValue({ id: 12, title: 'Raise CHWS set point', status: 'PROPOSED' });
  sim.approveJob.mockResolvedValue({ id: 12, title: 'Raise CHWS set point', status: 'QUEUED' });
  sim.rejectJob.mockResolvedValue({ id: 12, title: 'Raise CHWS set point', status: 'REJECTED' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AiAssistant', () => {
  it('is not shown without AI Assistant › Read', async () => {
    const { container } = await renderAssistant(['simulation.read']);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens, sends with Enter (not Shift+Enter) and closes with Esc', async () => {
    await renderAssistant(['aiassistant.read']);
    const panel = openPanel();
    const input = screen.getByLabelText('Message to LEVO');
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: 'line 1' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    // Enter that commits an IME composition (Safari: keyCode 229 after compositionend)
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    expect(chat.bodies).toHaveLength(0);

    await ask('How is CH_01?');
    expect(chat.bodies).toEqual([{ message: 'How is CH_01?' }]);
    expect(await screen.findByText('running')).toBeInTheDocument();
    expect(screen.getByText('Insight agent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get asset summary/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open source 1: WSC manual, page 4' })
    ).toBeInTheDocument();
    expect(screen.getByText(/AI budget today: \$0\.50 of \$4\.00/)).toBeInTheDocument();
    expect(screen.getByText('Chiller check')).toBeInTheDocument();

    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'LEVO' })).toBeNull();
    const launcher = screen.getByRole('button', { name: /Open LEVO/ });
    await waitFor(() => expect(document.activeElement).toBe(launcher));
  });

  it('opens as a bubble above LEVO, below it when LEVO is near the top; LEVO stays', async () => {
    // jsdom's window is 1024 x 768; LEVO is 80 px, 20 px from the bottom right
    await renderAssistant(['aiassistant.read']);
    const panel = openPanel();
    expect(panel).toHaveStyle({ left: '564px', top: '12px', width: '440px', height: '642px' });
    expect(screen.getByRole('button', { name: 'Close LEVO' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    cleanup();

    window.localStorage.setItem('aiAssistant.launcherPos', '{"right":20,"bottom":600}');
    await renderAssistant(['aiassistant.read']);
    expect(openPanel()).toHaveStyle({ top: '182px', height: '574px' });
  });

  it('approves a proposed simulation only after an inline confirmation', async () => {
    await renderAssistant(['aiassistant.read', 'simulation.read', 'simulation.create']);
    openPanel();
    await ask('Simulate a higher set point');
    const card = await screen.findByRole('article', { name: /Simulation #12/ });
    expect(card).toHaveTextContent('The optimizer predicts a 3 % saving.');
    // the scenario in brief (240 min)
    expect(card).toHaveTextContent('4 h');
    // the card shares the simulation page's cache of the job
    expect(queryClient.getQueryData(['SIMULATION_JOB', 12])).toMatchObject({ status: 'PROPOSED' });

    const approve = screen.getByRole('button', { name: 'Approve' });
    approve.focus();
    fireEvent.click(approve);
    const confirm = screen.getByRole('alertdialog', { name: 'Confirm approval' });
    const go = screen.getByRole('button', { name: 'Confirm and run' });
    // the confirmation takes the focus of the button it replaced, Confirm is not focused
    expect(document.activeElement).toBe(confirm);

    // Esc withdraws the confirmation, not the panel, and returns to Approve
    fireEvent.keyDown(confirm, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'LEVO' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Approve' }));
    expect(sim.approveJob).not.toHaveBeenCalled();
    expect(go).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    sim.getJob.mockResolvedValue({ id: 12, title: 'Raise CHWS set point', status: 'QUEUED' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and run' }));
    await settle();
    expect(sim.approveJob).toHaveBeenCalledWith(12);
    expect(await screen.findByText('Queued')).toBeInTheDocument();
    // the focus stays on the card (Esc still reaches the panel)
    expect(document.activeElement).toBe(card);
  });

  it('rejects with a reason; Enter in the reason does not submit', async () => {
    await renderAssistant(['aiassistant.read', 'simulation.read', 'simulation.create']);
    openPanel();
    await ask('Simulate');
    await screen.findByRole('article', { name: /Simulation #12/ });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    // Cancel returns to the button that asked
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reject' }));

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const reason = screen.getByLabelText('Reason (optional)');
    fireEvent.change(reason, { target: { value: 'Not during the audit' } });
    fireEvent.keyDown(reason, { key: 'Enter' });
    expect(sim.rejectJob).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    await settle();
    expect(sim.rejectJob).toHaveBeenCalledWith(12, 'Not during the audit');
  });

  it('shows a finished simulation with its replay link and asks for a summary once', async () => {
    chat.events = ANSWER.map(([name, data]): [string, unknown] =>
      name === 'simulation'
        ? [name, { ...(data as object), status: 'RUNNING', approval_required: false }]
        : [name, data]
    );
    sim.getJob.mockResolvedValue({
      id: 12,
      title: 'Raise CHWS set point',
      status: 'SUCCEEDED',
      progress: 1,
      summary: {
        success: true,
        reason: 'No constraint violated',
        variants: {
          baseline: { energyKwh: 4100, avgKwPerRt: 0.56, maxChwsTemp: 6.6, trips: 0 },
          recommended: {
            energyKwh: 3980,
            avgKwPerRt: 0.54,
            maxChwsTemp: 7.4,
            alarmCounts: { warning: 1, critical: 0 },
            trips: 0,
          },
        },
      },
    });
    await renderAssistant(['aiassistant.read', 'simulation.read', 'digitaltwin.read']);
    openPanel();
    await ask('Simulate a higher set point');

    // the follow-up's answer (the same fixture) adds a second card of the job 40 ms later, so a
    // slow run may only see both links
    const [link] = await screen.findAllByRole('link', { name: 'Replay in digital twin' });
    expect(link).toHaveAttribute('href', '/digital-twin?replay=12');
    expect(screen.getAllByText(/Within constraints/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('row', { name: /recommended/ }).length).toBeGreaterThan(0);

    const followUp = 'Simulation #12 has finished. Summarise the results.';
    await waitFor(() => expect(chat.bodies.map((b) => b.message)).toContain(followUp));
    await settle();
    expect(chat.bodies.filter((b) => b.message === followUp)).toHaveLength(1);
    expect(screen.getByText('Sent automatically')).toBeInTheDocument();
  });

  it('keeps the focus in the panel while a remembered conversation loads', async () => {
    window.localStorage.setItem('aiAssistant.session.', 's-9');
    let loaded: (detail: SessionDetail) => void = () => undefined;
    chat.getSession = () =>
      new Promise((resolve) => {
        loaded = resolve;
      });
    await renderAssistant(['aiassistant.read']);
    const panel = openPanel();
    expect(screen.getByText('Loading the conversation…')).toBeInTheDocument();
    expect(document.activeElement).toBe(panel);

    await act(async () => loaded({ id: 's-9', title: 'Pump trip', messages: [] }));
    await settle();
    expect(document.activeElement).toBe(screen.getByLabelText('Message to LEVO'));
  });

  it('keeps the focus on the Send button while it turns into Stop and back', async () => {
    let finish: () => void = () => undefined;
    chat.hold = new Promise<void>((resolve) => {
      finish = resolve;
    });
    await renderAssistant(['aiassistant.read']);
    openPanel();
    fireEvent.change(screen.getByLabelText('Message to LEVO'), {
      target: { value: 'How is CH_01?' },
    });
    const button = screen.getByRole('button', { name: 'Send' });
    button.focus();
    fireEvent.click(button);
    await settle();
    expect(chat.bodies).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Stop the answer' })).toBe(button);
    expect(document.activeElement).toBe(button);

    await act(async () => finish());
    await settle();
    expect(screen.getByRole('button', { name: 'Send' })).toBe(button);
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(document.activeElement).toBe(button);
    // an empty question is not sent
    fireEvent.click(button);
    expect(chat.bodies).toHaveLength(1);
  });

  it('stops the answer without sending a question typed meanwhile', async () => {
    chat.hold = new Promise<void>(() => undefined);
    await renderAssistant(['aiassistant.read']);
    openPanel();
    await ask('How is CH_01?');
    const input = screen.getByLabelText('Message to LEVO');
    fireEvent.change(input, { target: { value: 'And CH_02?' } });

    const stop = screen.getByRole('button', { name: 'Stop the answer' });
    const click = createEvent.click(stop);
    fireEvent(stop, click);
    await settle();
    // Stop turns back into Send while the click is handled: its default action (submitting the
    // question box) is cancelled, so only the first question was sent
    expect(click.defaultPrevented).toBe(true);
    expect(chat.bodies).toHaveLength(1);
    expect(input).toHaveValue('And CH_02?');
  });

  it('returns the focus to the question box after a conversation is chosen', async () => {
    chat.sessions = [{ id: 's-2', title: 'Pump trip', updatedAt: null }];
    chat.getSession = (id) => Promise.resolve({ id, title: 'Pump trip', messages: [] });
    await renderAssistant(['aiassistant.read']);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Conversations' }));
    const item = await screen.findByRole('button', { name: 'Pump trip' });
    item.focus();
    fireEvent.click(item);
    await settle();
    expect(screen.queryByRole('navigation', { name: 'Conversations' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('Message to LEVO'));
  });

  it('opens where the agent navigates, offers to open it again, and No access', async () => {
    chat.events = [
      ['session', { session_id: 's-1', title: 'Walk' }],
      ['tool_call', { id: 'n1', name: 'open_in_app', agent: 'twin_agent', args: {} }],
      ['tool_result', { id: 'n1', name: 'open_in_app', agent: 'twin_agent', ok: true }],
      [
        'navigate',
        {
          page: 'digital-twin',
          label: 'CT-01 fan speed in the digital twin',
          asset: 'CT_01',
          parameter: 'fan_speed',
          view: 'walk',
        },
      ],
      ['navigate', { page: 'ai-insights', label: 'Fault 43', tab: 'faults', item_id: 43 }],
      ['message', { text: 'Here is CT-01.', agent: 'twin_agent' }],
      ['done', {}],
    ];
    await renderAssistant(['aiassistant.read', 'digitaltwin.read'], '/alarm-report');
    openPanel();
    await ask('Walk me to CT-01');
    await screen.findByText('Here is CT-01.');
    // the last place the user may read opens at once (AI Insights is not readable)
    expect(here.url).toBe('/digital-twin?asset=CT_01&param=fan_speed&view=walk');
    // the panel stepped aside so the place is not hidden behind it; the answer waits behind the
    // launcher
    expect(screen.queryByRole('dialog', { name: 'LEVO' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Open LEVO (new answer)' }));

    const card = screen.getByRole('group', {
      name: 'Opened in the app: CT-01 fan speed in the digital twin',
    });
    expect(card).toHaveTextContent('Digital twin · CT_01 · fan_speed · walk mode');
    const denied = screen.getByRole('group', { name: 'Opened in the app: Fault 43' });
    expect(within(denied).getByRole('button', { name: /No access/ })).toBeDisabled();
    expect(within(denied).queryByRole('button', { name: /^Open/ })).toBeNull();

    // Open goes there again (and the panel steps aside again)
    act(() => here.navigate('/alarm-report'));
    expect(here.url).toBe('/alarm-report');
    fireEvent.click(within(card).getByRole('button', { name: /^Open / }));
    expect(here.url).toBe('/digital-twin?asset=CT_01&param=fan_speed&view=walk');
    expect(screen.queryByRole('dialog', { name: 'LEVO' })).toBeNull();
  });

  it('remounts the page on show for a link with filters (a new nonce on each open)', async () => {
    chat.events = [
      [
        'navigate',
        { page: 'maintenance-order', label: 'Critical orders', filters: { severityIds: ['1'] } },
      ],
      ['message', { text: 'Here they are.', agent: 'maintenance_agent' }],
      ['done', {}],
    ];
    await renderAssistant(['aiassistant.read', 'maintenanceorder.read'], '/maintenance-order');
    openPanel();
    await ask('Show the critical orders');
    await screen.findByText('Here they are.');
    expect(here.url).toBe('/maintenance-order?severityIds=1');
    const first = (here.state as { assistantNav?: unknown } | null)?.assistantNav;
    expect(typeof first).toBe('number');

    // Open on the same page passes a new nonce, so the page reads its URL again
    fireEvent.click(await screen.findByRole('button', { name: 'Open LEVO (new answer)' }));
    const card = screen.getByRole('group', { name: 'Opened in the app: Critical orders' });
    expect(card).toHaveTextContent('Maintenance orders · filtered');
    fireEvent.click(within(card).getByRole('button', { name: /^Open / }));
    expect(here.url).toBe('/maintenance-order?severityIds=1');
    expect((here.state as { assistantNav: number }).assistantNav).toBeGreaterThan(first as number);
  });

  it('moves only a user who stayed where they asked', async () => {
    let finish: () => void = () => undefined;
    chat.hold = new Promise<void>((resolve) => {
      finish = resolve;
    });
    chat.events = [['session', { session_id: 's-1', title: 'Towers' }]];
    const place = (n: number) => ({
      page: 'digital-twin',
      label: `CT-0${n}`,
      asset: `CT_0${n}`,
    });
    await renderAssistant(['aiassistant.read', 'digitaltwin.read'], '/alarm-report');
    openPanel();
    await ask('Show me the towers one by one');

    act(() => chat.emit('navigate', place(1)));
    await waitFor(() => expect(here.url).toBe('/digital-twin?asset=CT_01'));
    // the twin applies the target and rewrites its own URL (replace): the user is still there,
    // so the answer's next place opens too
    act(() => here.navigate('/digital-twin?node=yard', { replace: true }));
    act(() => chat.emit('navigate', place(2)));
    await waitFor(() => expect(here.url).toBe('/digital-twin?asset=CT_02'));

    // the user goes elsewhere and starts a scenario: the answer no longer moves them
    act(() => here.navigate('/simulation?new=1'));
    act(() => {
      chat.emit('navigate', place(3));
      chat.emit('done', {});
      finish();
    });
    // (the answer is complete once the launcher shows it as new)
    const launcher = await screen.findByRole('button', { name: 'Open LEVO (new answer)' });
    expect(here.url).toBe('/simulation?new=1');
    // the place waits on its card
    fireEvent.click(launcher);
    const card = screen.getByRole('group', { name: 'Opened in the app: CT-03' });
    expect(within(card).getByRole('button', { name: 'Open CT-03' })).toBeEnabled();
  });

  it('keeps a twin replay on when the agent opens the twin during it', async () => {
    chat.events = [
      [
        'navigate',
        { page: 'digital-twin', label: 'CT-01 fan', asset: 'CT_01', parameter: 'fan_speed' },
      ],
      ['done', {}],
    ];
    const replay = '/digital-twin?replay=12&variant=b&t=2026-10-11T08%3A00%3A00Z&node=yard';
    await renderAssistant(['aiassistant.read', 'digitaltwin.read'], replay);
    openPanel();
    await ask('Show me the CT-01 fan in this run');
    await waitFor(() => expect(here.url).not.toBe(replay));
    const url = new URL(here.url, 'http://app');
    expect(url.pathname).toBe('/digital-twin');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      asset: 'CT_01',
      param: 'fan_speed',
      replay: '12',
      variant: 'b',
      t: '2026-10-11T08:00:00Z',
    });
  });

  it('never opens a place by itself for a stored conversation', async () => {
    window.localStorage.setItem('aiAssistant.session.', 's-3');
    chat.getSession = (id) =>
      Promise.resolve({
        id,
        title: 'Old walk',
        messages: [
          {
            id: '1',
            role: 'assistant',
            text: 'Here is CT-01.',
            agent: 'twin_agent',
            charts: [],
            citations: [],
            simulations: [],
            toolCalls: [],
            forms: [],
            orders: [],
            navigations: [
              {
                page: 'digital-twin',
                label: 'CT-01',
                asset: 'CT_01',
                assetId: null,
                parameter: null,
                location: null,
                tab: null,
                itemId: null,
                view: 'walk',
                panel: null,
                section: null,
                filters: null,
              },
            ],
            createdAt: null,
          },
        ],
      });
    await renderAssistant(['aiassistant.read', 'digitaltwin.read'], '/alarm-report');
    openPanel();
    await settle();
    expect(screen.getByRole('group', { name: 'Opened in the app: CT-01' })).toBeInTheDocument();
    expect(here.url).toBe('/alarm-report');
  });

  it('focuses the question box when a page opens the panel; the panel is marked', async () => {
    await renderAssistant(['aiassistant.read']);
    const { assistantStore } = await import('./ai-assistant.store');
    act(() => assistantStore.setOpen(true));
    const panel = screen.getByRole('dialog', { name: 'LEVO' });
    expect(panel).toHaveAttribute('data-ai-assistant-panel');
    expect(document.activeElement).toBe(screen.getByLabelText('Message to LEVO'));

    act(() => assistantStore.setOpen(false));
    act(() => assistantStore.setOpen(true));
    expect(document.activeElement).toBe(screen.getByLabelText('Message to LEVO'));

    // already open, the focus went to the page (a click on the twin's 3D view): asking to open
    // again brings it back to the question box
    const view = document.createElement('div');
    view.tabIndex = 0;
    document.body.appendChild(view);
    try {
      view.focus();
      expect(document.activeElement).toBe(view);
      act(() => assistantStore.setOpen(true));
      expect(document.activeElement).toBe(screen.getByLabelText('Message to LEVO'));
    } finally {
      view.remove();
    }
  });

  it('scrolls to the section of the URL, highlights it and drops the parameter', async () => {
    const section = document.createElement('div');
    section.setAttribute('data-nav-section', 'spc');
    const scroll = vi.fn();
    section.scrollIntoView = scroll;
    // jsdom has no layout: give the section a box
    section.getClientRects = () => [{}] as unknown as DOMRectList;
    try {
      await renderAssistant(
        ['aiassistant.read'],
        '/asset-overview/5?section=spc&show-spc-list=true'
      );
      // the page renders its section a little later
      await act(() => new Promise<void>((resolve) => setTimeout(resolve, 250)));
      expect(scroll).not.toHaveBeenCalled();
      document.body.appendChild(section);
      await waitFor(() => expect(scroll).toHaveBeenCalled(), { timeout: 2000 });
      expect(section.classList.length).toBe(1);
      await waitFor(() => expect(here.url).toBe('/asset-overview/5?show-spc-list=true'));
      await settle();
      // once (StrictMode runs the effect twice)
      expect(scroll).toHaveBeenCalledTimes(1);

      // the same link again highlights again
      act(() => here.navigate('/asset-overview/5?section=spc&show-spc-list=true'));
      await waitFor(() => expect(scroll).toHaveBeenCalledTimes(2), { timeout: 2000 });
      await waitFor(() => expect(here.url).toBe('/asset-overview/5?show-spc-list=true'));
    } finally {
      section.remove();
    }
  });

  it('highlights a section again after the user left while it was still awaited', async () => {
    const section = document.createElement('div');
    section.setAttribute('data-nav-section', 'status');
    const scroll = vi.fn();
    section.scrollIntoView = scroll;
    section.getClientRects = () => [{}] as unknown as DOMRectList;
    const link = '/asset-overview/5?section=status';
    try {
      await renderAssistant(['aiassistant.read'], link);
      // the user leaves before the page rendered the section, and the wait notices it
      act(() => here.navigate('/alarm-report'));
      await act(() => new Promise<void>((resolve) => setTimeout(resolve, 250)));

      // Back (or the card's Open) to the same link: it is handled as a new request
      act(() => here.navigate(link));
      document.body.appendChild(section);
      await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1), { timeout: 2000 });
      await waitFor(() => expect(here.url).toBe('/asset-overview/5'));
    } finally {
      section.remove();
    }
  });

  it('offers no approval without Simulation › Create', async () => {
    await renderAssistant(['aiassistant.read', 'simulation.read']);
    openPanel();
    await ask('Simulate');
    await screen.findByRole('article', { name: /Simulation #12/ });
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.getByText(/Waiting for approval by a person/)).toBeInTheDocument();
  });
});
