import { Popup } from '@digital-twin/components';
import { FilePdf } from '@digital-twin/icons';
import { useEffect, useState } from 'react';

import { PdfViewer } from '../../../components/maintenance-instruction/pdf-viewer';
import styles from '../ai-insights.module.scss';
import { errorText } from '../ai-insights.utils';
import { fetchDocumentFile } from '../api/ai-insights.api';

/** A document of the library to open, optionally at a cited page */
export type PdfTarget = { documentId: number; title: string; page?: number | null };

type PdfDialogProps = { target: PdfTarget | null; onClose: () => void };

/** Name shown in the viewer and used for its download */
const pdfName = (title?: string) => {
  const name = title?.trim() || 'document';
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
};

/**
 * The original PDF of a library document. The file comes from the private document store
 * through the backend (session header), so it is fetched as a blob and shown from an object URL
 * that is revoked when the dialog closes or another document opens.
 */
export const PdfDialog = ({ target, onClose }: PdfDialogProps) => {
  const documentId = target?.documentId ?? null;
  const [file, setFile] = useState<{ id: number; url?: string; error?: string } | null>(null);

  useEffect(() => {
    if (documentId === null) return;
    const ctrl = new AbortController();
    let url: string | undefined;
    setFile({ id: documentId });
    fetchDocumentFile(documentId, ctrl.signal)
      .then((blob) => {
        if (ctrl.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setFile({ id: documentId, url });
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          setFile({ id: documentId, error: errorText(err, 'The document could not be opened') });
        }
      });
    return () => {
      ctrl.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId]);

  const current = file && file.id === documentId ? file : null;

  return (
    <Popup
      open={!!target}
      title={target?.title ?? 'Document'}
      icon={<FilePdf />}
      onClose={onClose}
      variant="none"
      background="none-without-padding"
      width="min(1100px, 92vw)"
      rightTopComponent={
        target?.page ? <span className={styles.pdf__page}>Cited on page {target.page}</span> : null
      }
    >
      <div className={styles.pdf}>
        {current?.url ? (
          <PdfViewer pdfUrl={current.url} pdfName={pdfName(target?.title)} />
        ) : current?.error ? (
          <div className={styles.empty} role="alert">
            {current.error}
          </div>
        ) : (
          <div className={styles.empty}>Loading the document…</div>
        )}
      </div>
    </Popup>
  );
};
