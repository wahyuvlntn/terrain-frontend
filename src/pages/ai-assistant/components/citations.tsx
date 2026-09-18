import { FilePdf } from '@digital-twin/icons';
import { memo } from 'react';
import styles from '../ai-assistant.module.scss';
import { assistantStore } from '../ai-assistant.store';
import { Citation } from '../api/ai-assistant.api';

const DOC_TYPE: Record<string, string> = {
  manual: 'Manual',
  fdd_reference: 'FDD reference',
  maintenance_report: 'Maintenance report',
  setpoint_log: 'Set-point log',
};

export const docTypeLabel = (t: string) => DOC_TYPE[t] ?? t.replace(/_/g, ' ');

type CitationsProps = { items: Citation[] };

/** The documents an answer is grounded on, numbered as cited ([1], [2] …); a chip opens the PDF */
export const Citations = memo(({ items }: CitationsProps) => {
  if (!items.length) return null;
  // answer-wide refs: show them in order (a later search can cite an earlier passage again)
  const ordered = items.every((c) => c.ref !== null)
    ? [...items].sort((a, b) => (a.ref ?? 0) - (b.ref ?? 0))
    : items;
  return (
    <div className={styles.cites}>
      <span className={styles.cites__label} aria-hidden="true">
        Sources
      </span>
      <ul aria-label="Sources">
        {ordered.map((c, i) => (
          <li key={c.ref !== null ? `ref:${c.ref}` : `${c.documentId}#${c.page ?? ''}`}>
            <button
              type="button"
              className={styles.cite}
              onClick={() => assistantStore.openDocument(c)}
              title={[c.docType ? docTypeLabel(c.docType) : '', c.snippet]
                .filter(Boolean)
                .join('\n')}
              aria-label={`Open source ${c.ref ?? i + 1}: ${c.title}${c.page ? `, page ${c.page}` : ''}`}
            >
              <b>[{c.ref ?? i + 1}]</b>
              <FilePdf aria-hidden="true" />
              <span>{c.title}</span>
              {c.page ? <em>p. {c.page}</em> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});
Citations.displayName = 'Citations';
