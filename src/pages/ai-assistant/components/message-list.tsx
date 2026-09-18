import { Button } from '@digital-twin/components';
import clsx from 'clsx';
import { memo, useLayoutEffect, useRef } from 'react';

import { agentLabel, Block, ChatMessage, messageText, ToolBlock } from '../ai-assistant.messages';
import styles from '../ai-assistant.module.scss';
import { assistantStore } from '../ai-assistant.store';
import { AssistantContext } from '../assistant-context';
import { BlockBoundary } from './block-boundary';
import { ChartBlock } from './chart-block';
import { Citations } from './citations';
import { Markdown } from './markdown';
import { NavigationCard } from './navigation-card';
import { SimulationCard } from './simulation-card';
import { ToolChips } from './tool-chips';

/** distance from the bottom (px) within which new content keeps the list scrolled to the end */
const STICK_PX = 48;

type Group =
  | { kind: 'tools'; key: string; tools: ToolBlock[] }
  | { kind: 'block'; key: string; block: Exclude<Block, ToolBlock> };

/** consecutive tool calls render as one row of chips */
const groupBlocks = (blocks: Block[]): Group[] => {
  const groups: Group[] = [];
  for (const b of blocks) {
    if (b.kind === 'tool') {
      const last = groups[groups.length - 1];
      if (last?.kind === 'tools') last.tools.push(b);
      else groups.push({ kind: 'tools', key: b.key, tools: [b] });
    } else {
      groups.push({ kind: 'block', key: b.key, block: b });
    }
  }
  return groups;
};

const usd = (v: number) => `$${v < 0.01 && v > 0 ? v.toFixed(4) : v.toFixed(2)}`;

type AssistantMessageProps = { message: ChatMessage; last: boolean; activeAgent: string };

const AssistantMessage = memo(({ message, last, activeAgent }: AssistantMessageProps) => {
  const groups = groupBlocks(message.blocks);
  const tail = message.blocks[message.blocks.length - 1];
  const writing = message.streaming && tail?.kind === 'text' && !tail.final;
  const agent = message.agent || activeAgent;

  return (
    <div className={clsx(styles.msg, styles['msg--assistant'])}>
      <div className={styles.msg__meta}>
        {/* the answer's usage is operator detail: on hover of the agent name */}
        <span
          className={styles.msg__agent}
          title={
            message.usage && !message.streaming
              ? `${(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens · ${usd(message.usage.costUsd)}`
              : undefined
          }
        >
          {agent ? agentLabel(agent) : 'Assistant'}
        </span>
      </div>
      {/* each part renders on its own: one that fails shows a note, the rest of the answer stays */}
      {groups.map((g) => {
        if (g.kind === 'tools') {
          return (
            <BlockBoundary key={g.key} resetKey={g.tools[g.tools.length - 1]}>
              <ToolChips tools={g.tools} />
            </BlockBoundary>
          );
        }
        const b = g.block;
        return (
          <BlockBoundary key={b.key} resetKey={b}>
            {b.kind === 'text' ? (
              <Markdown text={b.text} streaming={!b.final} />
            ) : b.kind === 'chart' ? (
              <ChartBlock chart={b.chart} />
            ) : b.kind === 'simulation' ? (
              <SimulationCard simulation={b.simulation} />
            ) : b.kind === 'navigation' ? (
              <NavigationCard target={b.target} />
            ) : null}
          </BlockBoundary>
        );
      })}
      {message.streaming && !writing ? (
        <div className={styles.msg__working} role="status">
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <span>{agent ? `${agentLabel(agent)} is working…` : 'Thinking…'}</span>
        </div>
      ) : null}
      <BlockBoundary resetKey={message.citations}>
        <Citations items={message.citations} />
      </BlockBoundary>
      {message.stopped ? <p className={styles.msg__note}>Stopped · incomplete answer</p> : null}
      {message.error ? (
        <div className={styles.msg__error} role="alert">
          <span>{message.error}</span>
          {last && !message.streaming ? (
            <Button
              color="default-secondary"
              className={styles['std-btn']}
              onClick={() => assistantStore.retry()}
            >
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
AssistantMessage.displayName = 'AssistantMessage';

const UserMessage = memo(({ message }: { message: ChatMessage }) => (
  <div className={clsx(styles.msg, styles['msg--user'])}>
    {message.automatic ? <span className={styles.msg__auto}>Sent automatically</span> : null}
    <div className={styles.msg__bubble}>{messageText(message)}</div>
  </div>
));
UserMessage.displayName = 'UserMessage';

const SUGGESTIONS = [
  'Summarise the active alarms and faults in the chiller plant',
  'How efficient is the chiller plant today (kW/RT)?',
  'What maintenance is due on the chillers this week?',
  'What happens if I raise the CHW supply set point to 7.5 °C for 4 hours?',
];

const suggestionsFor = (context: AssistantContext) =>
  context.assetAlias
    ? [
        `Explain the current condition of ${context.assetAlias}`,
        `Show the key trends of ${context.assetAlias} over the last 24 hours`,
        ...SUGGESTIONS.slice(0, 2),
      ]
    : SUGGESTIONS;

type MessageListProps = {
  messages: ChatMessage[];
  activeAgent: string;
  loading: boolean;
  loadError: string | null;
  sessionId: string | null;
  context: AssistantContext;
  disabled: boolean;
};

/** The conversation; stays scrolled to the newest content unless the user scrolled up */
export const MessageList = ({
  messages,
  activeAgent,
  loading,
  loadError,
  sessionId,
  context,
  disabled,
}: MessageListProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const count = useRef(messages.length);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // a new question always scrolls into view
    if (messages.length > count.current) stick.current = true;
    count.current = messages.length;
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const streaming = messages[messages.length - 1]?.streaming ?? false;

  return (
    <div
      ref={ref}
      className={styles.log}
      role="log"
      aria-live="polite"
      aria-busy={streaming || loading}
      aria-label="Conversation"
      tabIndex={0}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
      }}
    >
      {loadError ? (
        <div className={styles.msg__error} role="alert">
          <span>{loadError}</span>
          {sessionId ? (
            <Button
              color="default-secondary"
              className={styles['std-btn']}
              onClick={() => assistantStore.openSession(sessionId)}
            >
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}
      {loading ? (
        <div className={styles.log__state} role="status">
          Loading the conversation…
        </div>
      ) : !messages.length ? (
        <div className={styles.log__empty}>
          <strong>How can I help?</strong>
          <ul aria-label="Suggestions">
            {suggestionsFor(context).map((s) => (
              <li key={s}>
                <button type="button" disabled={disabled} onClick={() => assistantStore.send(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        messages.map((m, i) =>
          m.role === 'user' ? (
            <UserMessage key={m.id} message={m} />
          ) : (
            <AssistantMessage
              key={m.id}
              message={m}
              last={i === messages.length - 1}
              activeAgent={m.streaming ? activeAgent : ''}
            />
          )
        )
      )}
    </div>
  );
};
