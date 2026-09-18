import { Close, FilePdf } from '@digital-twin/icons';
import { KeyboardEvent, lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../ai-assistant.module.scss';
import { assistantStore, errorText, useAssistantState } from '../ai-assistant.store';
import { Citation, fetchDocumentFile } from '../api/ai-assistant.api';
import { docTypeLabel } from './citations';

// react-pdf and its worker load only when a source is opened
const PdfViewer = lazy(() =>
  import('../../../components/maintenance-instruction/pdf-viewer').then((m) => ({
    default: m.PdfViewer,
  }))
);

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** how long to wait for the cited page to render before giving up scrolling to it */
const PAGE_WAIT_MS = 15000;

/**
 * Scroll the viewer to the cited page once react-pdf has rendered it (`data-page-number`); the
 * shared PdfViewer has no initial-page option.
 */
const useScrollToPage = (container: HTMLElement | null, page: number | null, ready: boolean) => {
  useEffect(() => {
    if (!container || !ready || !page || page <= 1) return;
    let done = false;
    const tryScroll = () => {
      const el = container.querySelector<HTMLElement>(`[data-page-number="${page}"]`);
      if (!el || el.offsetHeight < 50) return false;
      el.scrollIntoView({ block: 'start' });
      done = true;
      return true;
    };
    if (tryScroll()) return;
    const observer = new MutationObserver(() => {
      if (tryScroll()) observer.disconnect();
    });
    observer.observe(container, { childList: true, subtree: true, attributes: true });
    const timeout = setTimeout(() => observer.disconnect(), PAGE_WAIT_MS);
    return () => {
      if (!done) observer.disconnect();
      clearTimeout(timeout);
    };
  }, [container, page, ready]);
};

type ContentProps = { cited: Citation };

const PdfDialogContent = ({ cited }: ContentProps) => {
  const titleId = useId();
  const [file, setFile] = useState<{ url?: string; error?: string }>({});
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => assistantStore.openDocument(null);

  // the file comes from the private document store via the backend (session header): fetched as a
  // blob and shown from an object URL that is revoked when the dialog closes
  useEffect(() => {
    const ctrl = new AbortController();
    let url: string | undefined;
    setFile({});
    fetchDocumentFile(cited.documentId, ctrl.signal)
      .then((blob) => {
        if (ctrl.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setFile({ url });
      })
      .catch((e) => {
        if (!ctrl.signal.aborted)
          setFile({ error: errorText(e, 'The document could not be opened.') });
      });
    return () => {
      ctrl.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [cited.documentId]);

  // focus moves into the dialog and back to where it was (the source chip) on close
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  useScrollToPage(body, cited.page, !!file.url);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // the dialog closes, not the assistant panel behind it
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={styles.pdf}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      // part of the assistant panel for pages with their own keys (portalled out of it)
      data-ai-assistant-panel=""
    >
      <div
        ref={dialogRef}
        className={styles.pdf__dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <header className={styles.pdf__header}>
          <FilePdf aria-hidden="true" />
          <div>
            <strong id={titleId}>{cited.title}</strong>
            <span>
              {[
                cited.docType ? docTypeLabel(cited.docType) : '',
                cited.page ? `cited on page ${cited.page}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.icon}
            onClick={close}
            aria-label="Close document"
            title="Close (Esc)"
          >
            <Close />
          </button>
        </header>
        {cited.snippet ? (
          <blockquote className={styles.pdf__snippet} title={cited.snippet}>
            {cited.snippet}
          </blockquote>
        ) : null}
        <div ref={setBody} className={styles.pdf__body}>
          {file.url ? (
            <Suspense fallback={<div className={styles.pdf__state}>Loading the viewer…</div>}>
              <PdfViewer pdfUrl={file.url} pdfName={`${cited.title}.pdf`} />
            </Suspense>
          ) : file.error ? (
            <div className={styles.pdf__state} role="alert">
              {file.error}
            </div>
          ) : (
            <div className={styles.pdf__state} role="status">
              Loading the document…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** The cited document open from a source chip, over the whole app */
export const PdfDialog = () => {
  const { document: cited } = useAssistantState();
  if (!cited) return null;
  return createPortal(
    <PdfDialogContent key={`${cited.documentId}#${cited.page ?? ''}`} cited={cited} />,
    document.body
  );
};
