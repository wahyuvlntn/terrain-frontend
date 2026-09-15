import {
  Button,
  Container,
  InfoTooltip,
  Loading,
  Pagination2 as Pagination,
  Popup,
  Table,
} from '@digital-twin/components';
import { AnomalyCircle, DatasetGrid, LineChart } from '@digital-twin/icons';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { InsightsAccess, useInsightAssets } from '../ai-insights.hook';
import styles from '../ai-insights.module.scss';
import { AnomalyFilter, listedIn, revealAnomaly, useRevealSelection } from '../ai-insights.reveal';
import {
  assetTag,
  fmtNum,
  fmtTime,
  humanize,
  SEVERITY_COLOR,
  timeAgo,
  useNow,
  WINDOW_OPTIONS,
  windowStart,
  withUnit,
} from '../ai-insights.utils';
import {
  AI_INSIGHTS_POLL,
  AI_INSIGHTS_QUERY,
  Anomaly,
  DetectionStatus,
  Detector,
  DetectorEnum,
  findAnomaly,
  getAnomalies,
} from '../api/ai-insights.api';
import { MiniTrend, trendWindow } from './mini-trend';
import {
  assetOptions,
  Empty,
  Facts,
  FilterSelect,
  JsonView,
  Pill,
  useElementHeight,
  useFitRows,
  usePaged,
} from './shared';

/** What each detector looks for (DESIGN.md §6.1) */
export const DETECTOR_INFO: Record<Detector, { label: string; text: string }> = {
  range: { label: 'Range', text: 'Outside the physical span of the measurement' },
  flatline: {
    label: 'Flatline',
    text: 'No variation for 30 min while the unit runs (stuck sensor)',
  },
  zscore: { label: 'Robust z-score', text: 'Far from the 60-min median (|M| > 3.5 for 3 points)' },
  ewma: { label: 'EWMA', text: 'Smoothed value beyond the 24-h running baseline limits' },
  spc: { label: 'SPC', text: 'Control chart rules on 15-min means (3σ, 2 of 3, 7-point trend)' },
};

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLEARED', label: 'Cleared' },
];

const COLUMNS = [
  { key: 'severity', name: 'Severity', width: 104 },
  { key: 'asset', name: 'Equipment', width: 110 },
  { key: 'param', name: 'Parameter' },
  { key: 'detector', name: 'Detector', width: 130 },
  { key: 'value', name: 'Value', width: 110, alignment: 'right' as const },
  { key: 'started', name: 'Started', width: 130 },
];

const paramLabel = (a: Anomaly) => a.paramName ?? humanize(a.paramAlias);

type AnomaliesTabProps = {
  access: InsightsAccess;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
};

/**
 * Statistical sensor anomalies on the production data: filters by detector, status and
 * equipment, the paged list, and the selected anomaly with a trend of its parameter.
 */
export const AnomaliesTab = ({ access, selectedId, onSelect }: AnomaliesTabProps) => {
  const now = useNow(60_000);
  const [status, setStatus] = useState<DetectionStatus | ''>('ACTIVE');
  const [detector, setDetector] = useState<Detector | ''>('');
  const [assetId, setAssetId] = useState('');
  const [hours, setHours] = useState('24');
  const [showDetails, setShowDetails] = useState(false);
  const { assets } = useInsightAssets(access.canViewTwin);
  const fit = useFitRows();
  const chart = useElementHeight();

  const windowHours = status === 'ACTIVE' ? null : Number(hours);
  const query = useQuery({
    queryKey: AI_INSIGHTS_QUERY.anomalies({ status, detector, assetId, windowHours }),
    queryFn: () =>
      getAnomalies({
        status: status || undefined,
        detectors: detector ? [detector] : undefined,
        assetIds: assetId ? [Number(assetId)] : undefined,
        from: windowHours ? windowStart(windowHours) : undefined,
        limit: 500,
      }),
    refetchInterval: AI_INSIGHTS_POLL.anomalies,
    meta: { toastId: 'aiInsightsAnomalies' },
  });
  const anomalies = query.data ?? [];
  const paged = usePaged(
    anomalies,
    fit.rows,
    anomalies.findIndex((a) => a.id === selectedId)
  );
  const listed = anomalies.find((a) => a.id === selectedId);

  // a selection the filters hide (a deep link, or filters changed since): looked up by id once
  // the list has loaded, so the detail still shows it
  const lookup = useQuery({
    queryKey: AI_INSIGHTS_QUERY.anomaly(selectedId ?? 0),
    queryFn: () => findAnomaly(selectedId as number),
    enabled: selectedId !== null && query.isSuccess && !query.isPlaceholderData && !listed,
    meta: { toastId: 'aiInsightsAnomaly' },
  });
  const lookedUp = lookup.isPlaceholderData ? undefined : lookup.data;
  const selected = listed ?? lookedUp ?? null;

  const { setPage } = paged;
  const filters = useMemo<AnomalyFilter>(
    () => ({ status, detector, assetId, hours }),
    [status, detector, assetId, hours]
  );
  const applyFilters = useCallback(
    (f: AnomalyFilter) => {
      setStatus(f.status);
      setDetector(f.detector);
      setAssetId(f.assetId);
      setHours(f.hours);
      setPage(1);
    },
    [setPage]
  );
  useRevealSelection({
    selectedId,
    listed: listedIn(query, selectedId),
    item: selected,
    filter: filters,
    reveal: revealAnomaly,
    apply: applyFilters,
  });

  const counts = useMemo(() => {
    const c = new Map<Detector, number>();
    for (const a of anomalies) c.set(a.detector, (c.get(a.detector) ?? 0) + 1);
    return c;
  }, [anomalies]);

  const rows = useMemo(
    () =>
      paged.pageItems.map((a) => ({
        id: String(a.id),
        severity: (
          <Pill color={a.status === 'ACTIVE' ? SEVERITY_COLOR[a.severity] : 'offline'}>
            {a.status === 'ACTIVE' ? a.severity.toLowerCase() : 'cleared'}
          </Pill>
        ),
        asset: assetTag(a.assetAlias),
        param: <span title={a.message ?? undefined}>{paramLabel(a)}</span>,
        detector: DETECTOR_INFO[a.detector].label,
        value: withUnit(fmtNum(a.value, 2), a.unit),
        started: fmtTime(a.startedAt, 'dd MMM HH:mm'),
      })),
    [paged.pageItems]
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
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Detector"
          value={detector}
          onChange={(v) => changeFilter(() => setDetector(v as Detector | ''))}
          options={DetectorEnum.options.map((d) => ({ value: d, label: DETECTOR_INFO[d].label }))}
        />
        <FilterSelect
          label="Equipment"
          value={assetId}
          onChange={(v) => changeFilter(() => setAssetId(v))}
          options={assetOptions(assets, anomalies)}
        />
        <FilterSelect
          label="Started"
          value={status === 'ACTIVE' ? '' : hours}
          onChange={(v) => changeFilter(() => setHours(v))}
          options={WINDOW_OPTIONS}
          allLabel={status === 'ACTIVE' ? 'Any time' : null}
          disabled={status === 'ACTIVE'}
        />
        <div className={styles.chips} aria-label="Anomalies per detector">
          {DetectorEnum.options.map((d) => (
            <Pill
              key={d}
              color={counts.get(d) ? 'warning' : 'secondary'}
              title={DETECTOR_INFO[d].text}
            >
              {DETECTOR_INFO[d].label} {counts.get(d) ?? 0}
            </Pill>
          ))}
        </div>
      </div>

      <div className={styles.split}>
        <Container
          title="Anomalies"
          icon={<AnomalyCircle />}
          titleSuffixIcon={
            <InfoTooltip
              title="Sensor anomalies"
              content="Statistical detectors run on the logged production data of every monitored parameter. Hover a detector count for what it looks for."
            />
          }
          background="none"
          className={styles.split__main}
          contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
          rightTopComponent={
            <Pill color="secondary">
              {query.isLoading
                ? '…'
                : `${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'}`}
            </Pill>
          }
        >
          <div ref={fit.ref} className={styles.tableArea}>
            <Loading isLoading={query.isFetching && !query.data} />
            {anomalies.length ? (
              <Table
                columns={COLUMNS}
                rows={rows}
                selectable
                selectVariant="highlight"
                selectedRowIds={selectedId ? [String(selectedId)] : []}
                onSelectRow={(id, isSelected) => onSelect(isSelected ? Number(id) : null)}
              />
            ) : (
              <Empty>
                {query.isLoading
                  ? 'Loading…'
                  : status === 'ACTIVE'
                    ? 'No active anomalies'
                    : 'No anomalies in this window'}
              </Empty>
            )}
          </div>
          <div className={styles.pagination}>
            <Pagination
              count={anomalies.length}
              limit={fit.rows}
              page={paged.page}
              onChange={paged.setPage}
              variant="arrow"
            />
          </div>
        </Container>

        <Container
          title="Anomaly detail"
          icon={<LineChart />}
          background="none"
          className={styles.split__detail}
          contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
          rightTopComponent={
            selected?.details !== null && selected ? (
              <Button
                type="button"
                color="default-secondary"
                icon={<DatasetGrid />}
                onClick={() => setShowDetails(true)}
              >
                Details
              </Button>
            ) : null
          }
        >
          {selected ? (
            <div className={styles.detail}>
              <div className={styles.detail__header}>
                <span className={styles.kicker}>
                  {assetTag(selected.assetAlias)} · {DETECTOR_INFO[selected.detector].label}
                  <InfoTooltip
                    title={DETECTOR_INFO[selected.detector].label}
                    content={DETECTOR_INFO[selected.detector].text}
                  />
                </span>
                <h3 title={paramLabel(selected)}>{paramLabel(selected)}</h3>
                <div className={styles.chips}>
                  <Pill color={SEVERITY_COLOR[selected.severity]}>
                    {selected.severity.toLowerCase()}
                  </Pill>
                  <Pill color={selected.status === 'ACTIVE' ? 'critical' : 'offline'}>
                    {selected.status === 'ACTIVE' ? 'Active' : 'Cleared'}
                  </Pill>
                </div>
                {selected.message ? (
                  <p className={styles.detail__message} title={selected.message}>
                    {selected.message}
                  </p>
                ) : null}
              </div>
              <Facts
                items={[
                  { label: 'Value', value: withUnit(fmtNum(selected.value, 2), selected.unit) },
                  {
                    label: 'Expected',
                    value: withUnit(fmtNum(selected.expected, 2), selected.unit),
                  },
                  { label: 'Score', value: fmtNum(selected.score, 2) },
                  {
                    label: selected.endedAt ? 'Cleared' : 'Last hit',
                    value: selected.endedAt
                      ? fmtTime(selected.endedAt, 'dd MMM HH:mm')
                      : timeAgo(selected.lastSeenAt, now),
                  },
                ]}
              />
              <div ref={chart.ref} className={styles.chartArea}>
                {!access.canViewTwin ? (
                  <Empty>Trends need Digital Twin › Read</Empty>
                ) : chart.height ? (
                  <MiniTrend
                    parameterId={selected.equipmentParameterId}
                    minutes={trendWindow(selected.startedAt, now)}
                    span={{
                      start: Date.parse(selected.startedAt),
                      end: selected.endedAt ? Date.parse(selected.endedAt) : now,
                    }}
                    expected={selected.expected}
                    unit={selected.unit ?? ''}
                    height={chart.height}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <Empty>
              {!selectedId
                ? 'Select an anomaly'
                : lookedUp === null
                  ? `Anomaly #${selectedId} was not found`
                  : lookup.isError || query.isError
                    ? `Anomaly #${selectedId} could not be loaded`
                    : 'Loading…'}
            </Empty>
          )}
        </Container>
      </div>

      <Popup
        open={showDetails && !!selected}
        title={selected ? `${paramLabel(selected)} · detector details` : 'Detector details'}
        icon={<DatasetGrid />}
        onClose={() => setShowDetails(false)}
        variant="none"
        background="none"
        width="min(720px, 90vw)"
      >
        <div className={styles.reading}>
          {selected ? <JsonView value={selected.details} /> : null}
        </div>
      </Popup>
    </div>
  );
};
