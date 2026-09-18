import clsx from 'clsx';
import { memo, useState } from 'react';

import { agentLabel, ToolBlock, ToolStatus, toolLabel } from '../ai-assistant.messages';
import styles from '../ai-assistant.module.scss';

const STATUS_TEXT: Record<ToolStatus, string> = {
  running: 'running',
  ok: 'done',
  error: 'failed',
  interrupted: 'no result',
};

/** Tool arguments for display: compact JSON, long values shortened */
const formatArgs = (args: unknown) => {
  if (args === null || args === undefined) return '';
  try {
    const text = JSON.stringify(args, null, 1);
    return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
  } catch {
    return '';
  }
};

type ToolChipsProps = { tools: ToolBlock[] };

/**
 * What the agents did to answer: one chip per tool call (name, status), expandable to its
 * arguments and the result summary. Arguments are sanitised by the agent service (no tokens).
 */
export const ToolChips = memo(({ tools }: ToolChipsProps) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = tools.find((t) => t.key === openKey);

  return (
    <div className={styles.tools}>
      <ul className={styles.tools__list} aria-label="Tool activity">
        {tools.map((t) => (
          <li key={t.key}>
            <button
              type="button"
              className={clsx(styles.tool, styles[`tool--${t.status}`])}
              aria-expanded={openKey === t.key}
              title={t.summary || undefined}
              onClick={() => setOpenKey((k) => (k === t.key ? null : t.key))}
            >
              <i aria-hidden="true" />
              <span>{toolLabel(t.name)}</span>
              {t.status === 'error' ? <em>failed</em> : null}
              <span className={styles['visually-hidden']}>, {STATUS_TEXT[t.status]}</span>
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <div className={styles.tools__detail}>
          <div className={styles.tools__head}>
            <b>{toolLabel(open.name)}</b>
            <span>
              {open.agent ? `${agentLabel(open.agent)} · ` : ''}
              {STATUS_TEXT[open.status]}
            </span>
          </div>
          {open.summary ? <p>{open.summary}</p> : null}
          {formatArgs(open.args) ? <pre>{formatArgs(open.args)}</pre> : null}
        </div>
      ) : null}
    </div>
  );
});
ToolChips.displayName = 'ToolChips';
