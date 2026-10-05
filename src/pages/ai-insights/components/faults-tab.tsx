import {
  Button,
  Container,
  InfoTooltip,
  Loading,
  Pagination2 as Pagination,
  Table,
} from '@digital-twin/components';
import { AlertAlarm, ChartAreaTimeline, InformationCircle, ListAlt } from '@digital-twin/icons';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InsightsAccess, useFaultRules, useInsightAssets } from '../ai-insights.hook';
import styles from '../ai-insights.module.scss';
import {
  FaultFilter,
  faultFilterFromUrl,
  faultFilterToUrl,
  listedIn,
  revealFault,
  useRevealSelection,
} from '../ai-insights.reveal';
import {
  assetTag,
  FAULT_STATUS_OPTIONS,
  fmtDuration,
  fmtTime,
  SEVERITY_COLOR,
  useNow,
  WINDOW_OPTIONS,
  windowStart,
} from '../ai-insights.utils';
import {
  AI_INSIGHTS_POLL,
  AI_INSIGHTS_QUERY,
  DetectionStatus,
  Fault,
  getFault,
  getFaults,
} from '../api/ai-insights.api';
import { FaultDetail } from './fault-detail';
import { FaultTimeline } from './fault-timeline';
import { PdfDialog, PdfTarget } from './pdf-dialog';
import {
  assetOptions,
  Empty,
  FilterSelect,
  Pill,
  useElementHeight,
  useFitRows,
  usePaged,
} from './shared';

const COLUMNS = [
  { key: 'severity', name: 'Severity', width: 104 },
  { key: 'rule', name: 'Rule' },
  { key: 'asset', name: 'Equipment', width: 110 },
  { key: 'started', name: 'Detected', width: 130 },
  { key: 'duration', name: 'Duration', width: 96 },
  { key: 'status', name: 'Status', width: 100 },
];

const RULES_INFO =
  'LBNL chiller plant fault rules run every 5 minutes on steady-state data. A fault raises an alarm and the assistant writes a maintenance instruction from the document library.';

type FaultsTabProps = {
  access: InsightsAccess;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
};

/**
 * Faults found by the LBNL fault detection rules: filters, the list (or a timeline) and the
 * selected fault's evidence and RAG maintenance instruction (its sources open as PDF).
 */
export const FaultsTab = ({ access, selectedId, onSelect }: FaultsTabProps) => {
  const now = useNow(60_000);
  const [params, setParams] = useSearchParams();
  const [initial] = useState(() => faultFilterFromUrl(params));
  const [status, setStatus] = useState(initial.status);
  const [assetId, setAssetId] = useState(initial.assetId);
  const [rule, setRule] = useState(initial.rule);
  const [hours, setHours] = useState(initial.hours);
  const [view, setView] = useState(initial.view);
  const [pdf, setPdf] = useState<PdfTarget | null>(null);
  const { assets } = useInsightAssets(access.canViewTwin);
  const { rules, ruleName } = useFaultRules();
  const fit = useFitRows();
  const area = useElementHeight();

  // active faults are listed whatever their start; the window applies to cleared ones
  const windowHours = status === 'ACTIVE' ? null : Number(hours);
  const filter = { status, assetId, rule, windowHours };
  const query = useQuery({
    queryKey: AI_INSIGHTS_QUERY.faults(filter),
    queryFn: () =>
      getFaults({
        status: status || undefined,
        assetIds: assetId ? [Number(assetId)] : undefined,
        ruleCodes: rule ? [rule] : undefined,
        from: windowHours ? windowStart(windowHours) : undefined,
        limit: 200,
      }),
    refetchInterval: AI_INSIGHTS_POLL.faults,
    meta: { toastId: 'aiInsightsFaults' },
  });
  const faults = query.data ?? [];
  const paged = usePaged(
    faults,
    fit.rows,
    faults.findIndex((f) => f.id === selectedId)
  );
  const listed = faults.find((f) => f.id === selectedId);

  // the selected fault by id (shared with its detail): a deep link may select one the filters hide
  const linked = useQuery({
    queryKey: AI_INSIGHTS_QUERY.fault(selectedId ?? 0),
    queryFn: () => getFault(selectedId as number),
    enabled: selectedId !== null,
    meta: { toastId: 'aiInsightsFault' },
  });
  const { setPage } = paged;
  const filters = useMemo<FaultFilter>(
    () => ({ status, assetId, rule, hours }),
    [status, assetId, rule, hours]
  );
  const applyFilters = useCallback(
    (f: FaultFilter) => {
      setStatus(f.status);
      setAssetId(f.assetId);
      setRule(f.rule);
      setHours(f.hours);
      setPage(1);
    },
    [setPage]
  );
  useRevealSelection({
    selectedId,
    listed: listedIn(query, selectedId),
    item: linked.data?.id === selectedId ? linked.data : undefined,
    filter: filters,
    reveal: revealFault,
    apply: applyFilters,
  });
  // the filters live in the URL (assistant links, reload); a move that drops them writes them back
  useEffect(() => {
    const next = faultFilterToUrl(params, { status, assetId, rule, hours, view });
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [params, setParams, status, assetId, rule, hours, view]);
  const columns = status === 'ACTIVE' ? COLUMNS.filter((c) => c.key !== 'status') : COLUMNS;

  const rows = useMemo(
    () =>
      paged.pageItems.map((f: Fault) => ({
        id: String(f.id),
        severity: <Pill color={SEVERITY_COLOR[f.severity]}>{f.severity.toLowerCase()}</Pill>,
        rule: (
          <span title={`${f.ruleCode} · ${f.ruleName ?? ruleName(f.ruleCode)}`}>
            <b>{f.ruleCode}</b> · {f.ruleName ?? ruleName(f.ruleCode)}
          </span>
        ),
        asset: assetTag(f.assetAlias),
        started: fmtTime(f.startedAt, 'dd MMM HH:mm'),
        duration: fmtDuration((f.endedAt ? Date.parse(f.endedAt) : now) - Date.parse(f.startedAt)),
        status: (
          <Pill color={f.status === 'ACTIVE' ? 'critical' : 'offline'}>
            {f.status === 'ACTIVE' ? 'Active' : 'Cleared'}
          </Pill>
        ),
      })),
    [paged.pageItems, now, ruleName]
  );

  const changeFilter = (apply: () => void) => {
    apply();
    paged.setPage(1);
  };

  return (
    <div className={styles.tab}>
      <div className={styles.filters}>
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => changeFilter(() => setStatus(v as DetectionStatus | ''))}
          options={FAULT_STATUS_OPTIONS}
        />
        <FilterSelect
          label="Equipment"
          value={assetId}
          onChange={(v) => changeFilter(() => setAssetId(v))}
          options={assetOptions(assets, faults)}
        />
        <FilterSelect
          label="Rule"
          value={rule}
          onChange={(v) => changeFilter(() => setRule(v))}
          options={rules.map((r) => ({ value: r.code, label: `${r.code} · ${r.name}` }))}
          className={styles['filter--wide']}
        />
        <FilterSelect
          label="Detected"
          value={status === 'ACTIVE' ? '' : hours}
          onChange={(v) => changeFilter(() => setHours(v))}
          options={WINDOW_OPTIONS}
          allLabel={status === 'ACTIVE' ? 'Any time' : null}
          disabled={status === 'ACTIVE'}
        />
        <Pill color={faults.length ? 'critical' : 'normal'}>
          {query.isLoading ? '…' : `${faults.length} fault${faults.length === 1 ? '' : 's'}`}
        </Pill>
      </div>

      <div className={styles.split}>
        <Container
          title="Faults"
          icon={<AlertAlarm />}
          titleSuffixIcon={<InfoTooltip title="Fault detection" content={RULES_INFO} />}
          background="none"
          className={styles.split__main}
          contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
          rightTopComponent={
            <div className={styles.segmented} role="group" aria-label="View">
              <Button
                type="button"
                color={view === 'list' ? 'default-primary' : 'default-secondary'}
                icon={<ListAlt />}
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                List
              </Button>
              <Button
                type="button"
                color={view === 'timeline' ? 'default-primary' : 'default-secondary'}
                icon={<ChartAreaTimeline />}
                aria-pressed={view === 'timeline'}
                onClick={() => setView('timeline')}
              >
                Timeline
              </Button>
            </div>
          }
        >
          {view === 'list' ? (
            <>
              <div ref={fit.ref} className={styles.tableArea}>
                <Loading isLoading={query.isFetching && !query.data} />
                {faults.length ? (
                  <Table
                    columns={columns}
                    rows={rows}
                    selectable
                    selectVariant="highlight"
                    selectedRowIds={selectedId ? [String(selectedId)] : []}
                    onSelectRow={(id, selected) => onSelect(selected ? Number(id) : null)}
                  />
                ) : (
                  <Empty>
                    {query.isLoading
                      ? 'Loading…'
                      : status === 'ACTIVE'
                        ? 'No active faults'
                        : 'No faults in this window'}
                  </Empty>
                )}
              </div>
              <div className={styles.pagination}>
                <Pagination
                  count={faults.length}
                  limit={fit.rows}
                  page={paged.page}
                  onChange={paged.setPage}
                  variant="arrow"
                />
              </div>
            </>
          ) : (
            <div ref={area.ref} className={styles.chartArea}>
              {faults.length && area.height ? (
                <FaultTimeline
                  faults={faults}
                  from={now - (windowHours ?? 24) * 3_600_000}
                  now={now}
                  ruleName={ruleName}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  height={area.height}
                />
              ) : (
                <Empty>{query.isLoading ? 'Loading…' : 'No faults to show'}</Empty>
              )}
            </div>
          )}
        </Container>

        <Container
          title="Fault detail"
          icon={<InformationCircle />}
          background="none"
          className={styles.split__detail}
          contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
        >
          {selectedId ? (
            <FaultDetail
              key={selectedId}
              faultId={selectedId}
              listed={listed}
              ruleName={ruleName}
              onOpenSource={setPdf}
            />
          ) : (
            <Empty>Select a fault</Empty>
          )}
        </Container>
      </div>

      <PdfDialog target={pdf} onClose={() => setPdf(null)} />
    </div>
  );
};
