import {
  Button,
  Container,
  InfoTooltip,
  Loading,
  Pagination2 as Pagination,
  Popup,
  PopupDelete,
  Search,
  Table,
} from '@digital-twin/components';
import {
  CloudUploadFill,
  FilePdf,
  InformationCircle,
  Library,
  Reload,
  TrashDelete,
} from '@digital-twin/icons';
import { toast } from '@digital-twin/reusables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InsightsAccess, useInsightAssets } from '../ai-insights.hook';
import styles from '../ai-insights.module.scss';
import { oneOf, urlText, withFilters } from '../ai-insights.reveal';
import { DOC_STATUS, DOC_TYPE_LABEL, errorText, fmtNum, fmtTime } from '../ai-insights.utils';
import {
  AI_INSIGHTS_POLL,
  AI_INSIGHTS_QUERY,
  AiDocument,
  DocStatus,
  DocStatusEnum,
  DocType,
  DocTypeEnum,
  deleteDocument,
  listDocuments,
  reindexDocument,
} from '../api/ai-insights.api';
import { DocumentUpload } from './document-upload';
import { PdfDialog, PdfTarget } from './pdf-dialog';
import { Empty, Facts, FilterSelect, Pill, useFitRows } from './shared';

const COLUMNS = [
  { key: 'title', name: 'Document' },
  { key: 'type', name: 'Type', width: 170 },
  { key: 'scope', name: 'Asset type · unit', width: 220 },
  { key: 'date', name: 'Date', width: 120 },
  { key: 'status', name: 'Status', width: 110 },
  { key: 'actions', name: '', width: 176, alignment: 'right' as const },
];

const fmtSize = (bytes: number | null) =>
  bytes === null
    ? '--'
    : bytes < 1024 * 1024
      ? `${fmtNum(bytes / 1024, 0)} KB`
      : `${fmtNum(bytes / 1048576, 1)} MB`;

type DocumentsTabProps = { access: InsightsAccess };

/**
 * The RAG document library: generated manuals, SOPs, maintenance reports and set point logs plus
 * uploaded PDFs, with their indexing status. Users with AI Insights › Update upload, re-index and
 * delete documents; a document's metadata opens in a popup.
 */
export const DocumentsTab = ({ access }: DocumentsTabProps) => {
  const queryClient = useQueryClient();
  const { assets } = useInsightAssets(access.canViewTwin);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(() => urlText(params.get('q'), 60));
  const [docType, setDocType] = useState(() =>
    oneOf<DocType | ''>(params.get('type'), DocTypeEnum.options, '')
  );
  const [status, setStatus] = useState(() =>
    oneOf<DocStatus | ''>(params.get('status'), DocStatusEnum.options, '')
  );
  const [assetType, setAssetType] = useState('');
  const [unit, setUnit] = useState(() => urlText(params.get('unit'), 20));
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [pdf, setPdf] = useState<PdfTarget | null>(null);
  const [info, setInfo] = useState<AiDocument | null>(null);
  const [deleting, setDeleting] = useState<AiDocument | null>(null);
  const fit = useFitRows();
  const pageSize = fit.rows;

  // the filters live in the URL (assistant links, reload); a move that drops them writes them back;
  // the asset type and page stay local
  useEffect(() => {
    const next = withFilters(params, [
      ['q', search.slice(0, 60), ''], // no longer than urlText reads back
      ['type', docType, ''],
      ['status', status, ''],
      ['unit', unit, ''],
    ]);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [params, setParams, search, docType, status, unit]);

  /** any filter change starts from the first page */
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const filter = {
    search: search || undefined,
    docType: docType || undefined,
    status: status || undefined,
    assetType: assetType || undefined,
    unit: unit || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
  const query = useQuery({
    queryKey: AI_INSIGHTS_QUERY.documents(filter),
    queryFn: () => listDocuments(filter),
    // the page size comes from the measured table height
    enabled: fit.height > 0,
    refetchInterval: (q) =>
      q.state.data?.documents.some((d) => d.status === 'PENDING' || d.status === 'INDEXING')
        ? AI_INSIGHTS_POLL.indexing
        : AI_INSIGHTS_POLL.documents,
    meta: { toastId: 'aiInsightsDocuments' },
  });
  const documents = query.data?.documents ?? [];
  const total = query.data?.total ?? 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_QUERY.all });

  const reindex = useMutation({
    mutationFn: (d: AiDocument) => reindexDocument(d.id),
    meta: { toastId: 'aiInsightsReindex', hideToast: true },
    onSuccess: (_, d) => toast.success(`"${d.title}" queued for indexing.`),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (d: AiDocument) => deleteDocument(d.id),
    meta: { toastId: 'aiInsightsDelete', hideToast: true },
    onSuccess: (_, d) => {
      toast.success(`"${d.title}" deleted.`);
      setDeleting(null);
    },
    onError: (err) => toast.error(errorText(err, 'The document could not be deleted')),
    onSettled: refresh,
  });

  const types = useMemo(() => [...new Set(assets.map((a) => a.typeName))].sort(), [assets]);

  const rows = documents.map((d) => {
    const st = DOC_STATUS[d.status];
    const busy =
      (reindex.isPending && reindex.variables?.id === d.id) ||
      (remove.isPending && remove.variables?.id === d.id);
    return {
      id: String(d.id),
      title: (
        <button
          type="button"
          className={styles.link}
          onClick={() => setPdf({ documentId: d.id, title: d.title })}
          title={`Open ${d.title}`}
        >
          {d.title}
        </button>
      ),
      type: DOC_TYPE_LABEL[d.docType],
      scope: `${d.assetType ?? 'General'} · ${d.unit ?? 'all units'}`,
      date: d.docDate ? fmtTime(d.docDate, 'dd MMM yyyy') : '--',
      status: (
        <Pill color={st.color} title={d.error ?? undefined}>
          {st.text}
        </Pill>
      ),
      actions: (
        <span className={styles.rowActions}>
          <Button
            type="button"
            color="default-secondary"
            icon={<InformationCircle />}
            className={styles.iconButton}
            title="Details"
            aria-label={`Details of ${d.title}`}
            onClick={() => setInfo(d)}
          />
          <Button
            type="button"
            color="default-secondary"
            icon={<FilePdf />}
            className={styles.iconButton}
            title="Open the PDF"
            aria-label={`Open ${d.title}`}
            onClick={() => setPdf({ documentId: d.id, title: d.title })}
          />
          {access.canUpdate ? (
            <>
              <Button
                type="button"
                color="default-secondary"
                icon={<Reload />}
                className={styles.iconButton}
                title="Index again"
                aria-label={`Re-index ${d.title}`}
                disabled={busy || d.status === 'PENDING' || d.status === 'INDEXING'}
                onClick={() => reindex.mutate(d)}
              />
              <Button
                type="button"
                color="default-secondary"
                icon={<TrashDelete />}
                className={styles.iconButton}
                title="Delete"
                aria-label={`Delete ${d.title}`}
                disabled={busy}
                onClick={() => setDeleting(d)}
              />
            </>
          ) : null}
        </span>
      ),
    };
  });

  return (
    <div className={styles.tab}>
      <div className={styles.filters}>
        <Search
          placeholder="Search titles"
          background="dark"
          value={search}
          onChange={(v) => changeFilter(() => setSearch(v.trim()))}
          wrapperClassName={styles.search}
        />
        <FilterSelect
          label="Type"
          value={docType}
          onChange={(v) => changeFilter(() => setDocType(v as DocType | ''))}
          options={DocTypeEnum.options.map((t) => ({ value: t, label: DOC_TYPE_LABEL[t] }))}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => changeFilter(() => setStatus(v as DocStatus | ''))}
          options={DocStatusEnum.options.map((s) => ({ value: s, label: DOC_STATUS[s].text }))}
        />
        <FilterSelect
          label="Asset type"
          value={assetType}
          onChange={(v) =>
            changeFilter(() => {
              setAssetType(v);
              setUnit('');
            })
          }
          options={types.map((t) => ({ value: t, label: t }))}
        />
        <FilterSelect
          label="Unit"
          value={unit}
          onChange={(v) => changeFilter(() => setUnit(v))}
          options={assets
            .filter((a) => !assetType || a.typeName === assetType)
            .map((a) => ({ value: a.alias, label: a.alias }))}
        />
        <span className={styles.filters__end}>
          {access.canUpdate ? (
            <Button type="button" icon={<CloudUploadFill />} onClick={() => setUploading(true)}>
              Upload PDF
            </Button>
          ) : null}
        </span>
      </div>

      <Container
        title="Library"
        icon={<Library />}
        titleSuffixIcon={
          <InfoTooltip
            title="Document library"
            content="The assistant answers and writes maintenance instructions only from these documents. Uploaded PDFs are split into chunks and indexed in the background."
          />
        }
        background="none"
        className={styles.fill}
        contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
        rightTopComponent={
          <Pill color="secondary">
            {query.isLoading ? '…' : `${total} document${total === 1 ? '' : 's'}`}
          </Pill>
        }
      >
        <div ref={fit.ref} className={styles.tableArea}>
          <Loading isLoading={query.isFetching && !query.data} />
          {documents.length ? (
            <Table columns={COLUMNS} rows={rows} />
          ) : (
            <Empty>
              {query.isLoading
                ? 'Loading…'
                : query.isError
                  ? 'The library could not be loaded'
                  : 'No documents match these filters'}
            </Empty>
          )}
        </div>
        <div className={styles.pagination}>
          <Pagination
            count={total}
            limit={pageSize}
            page={page}
            onChange={setPage}
            variant="arrow"
          />
        </div>
      </Container>

      <Popup
        open={!!info}
        title={info?.title ?? 'Document'}
        icon={<FilePdf />}
        onClose={() => setInfo(null)}
        variant="none"
        background="none"
        width={560}
      >
        {info ? (
          <div className={styles.stack}>
            <div className={styles.chips}>
              <Pill color={DOC_STATUS[info.status].color}>{DOC_STATUS[info.status].text}</Pill>
              <Pill color="secondary">{DOC_TYPE_LABEL[info.docType]}</Pill>
              <Pill color="secondary">
                {info.source === 'generated' ? 'Generated' : 'Uploaded'}
              </Pill>
            </div>
            {info.error ? <Pill color="critical">{info.error}</Pill> : null}
            <Facts
              items={[
                { label: 'File', value: info.fileName ?? '--' },
                { label: 'Size', value: fmtSize(info.sizeBytes) },
                { label: 'Asset type', value: info.assetType ?? 'General' },
                { label: 'Unit', value: info.unit ?? 'All units' },
                {
                  label: 'Document date',
                  value: info.docDate ? fmtTime(info.docDate, 'dd MMM yyyy') : '--',
                },
                {
                  label: 'Pages · chunks',
                  value: `${info.pages ?? '--'} · ${info.chunks ?? '--'}`,
                },
                { label: 'Alarm codes', value: info.alarmCodes.join(', ') || '--' },
                { label: 'Uploaded by', value: info.uploadedByName ?? '--' },
                { label: 'Added', value: fmtTime(info.createdAt) },
                { label: 'Indexed', value: fmtTime(info.indexedAt) },
              ]}
            />
            <div className={styles.actionsRow}>
              <Button
                type="button"
                icon={<FilePdf />}
                onClick={() => {
                  setPdf({ documentId: info.id, title: info.title });
                  setInfo(null);
                }}
              >
                Open PDF
              </Button>
            </div>
          </div>
        ) : null}
      </Popup>

      <PopupDelete
        entityType="document"
        entityName={deleting?.title}
        open={!!deleting}
        onClose={() => {
          if (!remove.isPending) setDeleting(null);
        }}
        onDelete={() => {
          if (deleting) remove.mutate(deleting);
        }}
        deleting={remove.isPending}
      />

      <DocumentUpload open={uploading} onClose={() => setUploading(false)} assets={assets} />
      <PdfDialog target={pdf} onClose={() => setPdf(null)} />
    </div>
  );
};
