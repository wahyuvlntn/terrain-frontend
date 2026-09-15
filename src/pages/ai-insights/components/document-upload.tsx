import { DateTimePicker, Dropdown, FileInput, InfoTooltip, Input, Popup } from '@digital-twin/components';
import { CloudUploadFill } from '@digital-twin/icons';
import { toast } from '@digital-twin/reusables';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import styles from '../ai-insights.module.scss';
import { DOC_TYPE_LABEL, errorText } from '../ai-insights.utils';
import {
  AI_INSIGHTS_QUERY,
  DocType,
  DocTypeEnum,
  InsightAsset,
  uploadDocument,
} from '../api/ai-insights.api';
import { Pill } from './shared';

/** The backend accepts PDFs of up to 50 MB */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

type DocumentUploadProps = {
  open: boolean;
  onClose: () => void;
  assets: InsightAsset[];
};

/**
 * Adds a PDF to the RAG library with the metadata retrieval filters on: document type, the asset
 * type it covers (or general), one unit (or every unit of the type) and the document date. The
 * library indexes it in the background.
 */
export const DocumentUpload = ({ open, onClose, assets }: DocumentUploadProps) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>('manual');
  const [assetType, setAssetType] = useState('');
  const [unit, setUnit] = useState('');
  const [docDate, setDocDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  // a new key empties the (uncontrolled) file input
  const [inputKey, setInputKey] = useState(0);

  const types = useMemo(() => [...new Set(assets.map((a) => a.typeName))].sort(), [assets]);
  const units = useMemo(
    () =>
      assets
        .filter((a) => !assetType || a.typeName === assetType)
        .sort((a, b) => a.alias.localeCompare(b.alias)),
    [assets, assetType]
  );

  const reset = () => {
    setFile(null);
    setTitle('');
    setDocType('manual');
    setAssetType('');
    setUnit('');
    setDocDate('');
    setError(null);
    setInputKey((k) => k + 1);
  };

  const upload = useMutation({
    mutationFn: uploadDocument,
    meta: { toastId: 'aiInsightsUpload', hideToast: true },
    onSuccess: (doc) => {
      toast.success(`"${doc.title}" uploaded: indexing in the background.`);
      queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_QUERY.all });
      reset();
      onClose();
    },
    onError: (err) => setError(errorText(err, 'The document could not be uploaded')),
  });

  const pick = (f: File | null) => {
    setError(null);
    if (f && !isPdf(f)) {
      setError('Only PDF files can be added');
      setFile(null);
      setInputKey((k) => k + 1);
      return;
    }
    if (f && f.size > MAX_UPLOAD_BYTES) {
      setError('The file is larger than 50 MB');
      setFile(null);
      setInputKey((k) => k + 1);
      return;
    }
    setFile(f);
    if (f && !title.trim())
      setTitle(
        f.name
          .replace(/\.pdf$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim()
      );
  };

  const invalid = !file ? 'Choose a PDF file' : !title.trim() ? 'Enter a title' : null;
  const busy = upload.isPending;

  return (
    <Popup
      open={open}
      title="Upload document"
      icon={<CloudUploadFill />}
      informationIcon={
        <InfoTooltip
          title="Document metadata"
          content="The assistant filters the library with these fields: a unit narrows the document to one equipment, an asset type to every unit of that type. Max 50 MB."
        />
      }
      variant="upload"
      width={600}
      background="none"
      submitting={busy}
      disableSubmit={!!invalid}
      onClose={() => {
        if (busy) return;
        reset();
        onClose();
      }}
      onSubmit={() => {
        if (invalid || !file) {
          setError(invalid);
          return;
        }
        upload.mutate({
          file,
          title,
          docType,
          assetType: assetType || undefined,
          unit: unit || undefined,
          docDate: docDate || undefined,
        });
      }}
    >
      <div className={styles.form}>
        <FileInput
          key={inputKey}
          label="PDF file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <Input
          label="Title"
          value={title}
          background="dark"
          disabled={busy}
          inputProps={{ maxLength: 200 }}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className={styles.form__row}>
          <Dropdown
            label="Document type"
            value={docType}
            background="dark"
            disabled={busy}
            options={DocTypeEnum.options.map((t) => ({ value: t, label: DOC_TYPE_LABEL[t] }))}
            onChange={(v) => setDocType(v as DocType)}
          />
          <DateTimePicker
            label="Document date"
            type="date"
            value={docDate}
            background="dark"
            disabled={busy}
            onChange={(_, v) => setDocDate(v)}
          />
        </div>
        <div className={styles.form__row}>
          <Dropdown
            label="Asset type"
            value={assetType}
            background="dark"
            disabled={busy}
            options={[
              { value: '', label: 'General (all types)' },
              ...types.map((t) => ({ value: t, label: t })),
            ]}
            onChange={(v) => {
              setAssetType(v);
              setUnit('');
            }}
          />
          <Dropdown
            label="Unit"
            value={unit}
            background="dark"
            disabled={busy}
            searchable
            options={[
              { value: '', label: 'All units' },
              ...units.map((a) => ({ value: a.alias, label: `${a.alias} · ${a.name}` })),
            ]}
            onChange={setUnit}
          />
        </div>
        {error ? (
          <div role="alert">
            <Pill color="critical">{error}</Pill>
          </div>
        ) : null}
      </div>
    </Popup>
  );
};
