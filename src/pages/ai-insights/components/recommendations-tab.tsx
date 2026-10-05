import {
  Button,
  Container,
  InfoTooltip,
  Loading,
  Pagination2 as Pagination,
  Table,
} from '@digital-twin/components';
import { ManageHistory, PlayFill, SettingSuggest } from '@digital-twin/icons';
import { toast } from '@digital-twin/reusables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { InsightsAccess } from '../ai-insights.hook';
import styles from '../ai-insights.module.scss';
import {
  listedIn,
  oneOf,
  RecommendationFilter,
  revealRecommendation,
  useRevealSelection,
  withFilters,
} from '../ai-insights.reveal';
import {
  fmtNum,
  isNotFound,
  RECOMMENDATION_STATUS,
  timeAgo,
  timeUntil,
  useNow,
} from '../ai-insights.utils';
import {
  AI_INSIGHTS_POLL,
  AI_INSIGHTS_QUERY,
  AiOverview,
  getRecommendation,
  getRecommendations,
  RecommendationStatus,
  RecommendationStatusEnum,
  runOptimizer,
} from '../api/ai-insights.api';
import { RecommendationCard } from './recommendation-card';
import { Empty, FilterSelect, Pill, useFitRows, usePaged } from './shared';

/** The backend returns at most 50 recommendations per request */
const HISTORY_LIMIT = 50;

/** Statuses that change on their own (twin validation in progress) */
const MOVING = new Set<RecommendationStatus>(['PROPOSED', 'VALIDATING']);

const OPTIMIZER_STATUS: Record<
  string,
  { text: string; color: 'primary' | 'secondary' | 'normal' | 'warning' | 'offline' }
> = {
  PENDING: { text: 'Queued', color: 'secondary' },
  RUNNING: { text: 'Running', color: 'primary' },
  SUCCEEDED: { text: 'Succeeded', color: 'normal' },
  FAILED: { text: 'Failed', color: 'warning' },
  SKIPPED: { text: 'Skipped', color: 'offline' },
};

const HISTORY_COLUMNS = [
  { key: 'id', name: '#', width: 64 },
  { key: 'status', name: 'Status', width: 170 },
  { key: 'saving', name: 'Saving', width: 96, alignment: 'right' as const },
  { key: 'age', name: 'Created' },
];

const OPTIMIZER_INFO =
  'The optimizer runs every hour once its surrogate model is trained. It only recommends changes that save at least 1 % or 15 kW, and each one is validated on the digital twin before it can be applied.';

type RecommendationsTabProps = {
  access: InsightsAccess;
  overview?: AiOverview;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
};

/**
 * Set point recommendations of the optimizer: the selected one (default: the latest) and the
 * history as a paged table, with the optimizer's state and a manual run.
 */
export const RecommendationsTab = ({
  access,
  overview,
  selectedId,
  onSelect,
}: RecommendationsTabProps) => {
  const queryClient = useQueryClient();
  const now = useNow(30_000);
  const [params, setParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(() =>
    oneOf<string>(params.get('status'), RecommendationStatusEnum.options, '')
  );
  const fit = useFitRows();

  const history = useQuery({
    queryKey: AI_INSIGHTS_QUERY.recommendations(statusFilter, HISTORY_LIMIT),
    queryFn: () =>
      getRecommendations(
        (statusFilter || undefined) as RecommendationStatus | undefined,
        HISTORY_LIMIT
      ),
    refetchInterval: (q) =>
      q.state.data?.some((r) => MOVING.has(r.status))
        ? AI_INSIGHTS_POLL.validating
        : AI_INSIGHTS_POLL.recommendations,
    meta: { toastId: 'aiInsightsRecommendations' },
  });
  const list = history.data ?? [];
  const paged = usePaged(
    list,
    fit.rows,
    list.findIndex((r) => r.id === selectedId)
  );

  const shownId = selectedId ?? overview?.recommendation?.id ?? list[0]?.id ?? null;
  const listed = list.find((r) => r.id === shownId);

  const selected = useQuery({
    queryKey: AI_INSIGHTS_QUERY.recommendation(shownId ?? 0),
    queryFn: () => getRecommendation(shownId as number),
    enabled: shownId !== null,
    // the list row shows at once; never the previously selected recommendation
    placeholderData: () => listed,
    refetchInterval: (q) =>
      q.state.data && MOVING.has(q.state.data.status)
        ? AI_INSIGHTS_POLL.validating
        : AI_INSIGHTS_POLL.recommendations,
    meta: { toastId: 'aiInsightsRecommendation' },
  });
  const rec = selected.data?.id === shownId ? selected.data : undefined;

  // a deep link to a recommendation the status filter hides lists it again
  const { setPage } = paged;
  const filters = useMemo<RecommendationFilter>(() => ({ status: statusFilter }), [statusFilter]);
  const applyFilters = useCallback(
    (f: RecommendationFilter) => {
      setStatusFilter(f.status);
      setPage(1);
    },
    [setPage]
  );
  useRevealSelection({
    selectedId,
    listed: listedIn(history, selectedId),
    item: rec,
    filter: filters,
    reveal: revealRecommendation,
    apply: applyFilters,
  });
  // the status filter lives in the URL (assistant links, reload), written back after a move
  // that drops it
  useEffect(() => {
    const next = withFilters(params, [['status', statusFilter, '']]);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [params, setParams, statusFilter]);

  const run = useMutation({
    mutationFn: runOptimizer,
    // failures raise the app's error toast
    meta: { toastId: 'aiInsightsRunOptimizer', hideToast: true },
    onSuccess: ({ runId, status, existing }) =>
      toast.info(
        existing
          ? `Optimizer run #${runId} is already ${status === 'RUNNING' ? 'running' : 'queued'}.`
          : `Optimizer run #${runId} queued.`
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_QUERY.overview }),
  });

  const optimizer = overview?.optimizer;
  const optimizerStatus = optimizer?.status ? OPTIMIZER_STATUS[optimizer.status] : null;
  const runPending = optimizer?.status === 'PENDING' || optimizer?.status === 'RUNNING';

  const rows = useMemo(
    () =>
      paged.pageItems.map((r) => {
        const st = RECOMMENDATION_STATUS[r.status];
        return {
          id: String(r.id),
          status: <Pill color={st.color}>{st.text}</Pill>,
          saving: r.savingsKw !== null ? `${fmtNum(r.savingsKw, 0)} kW` : '--',
          age: (
            <span title={new Date(r.createdAt).toLocaleString()}>{timeAgo(r.createdAt, now)}</span>
          ),
        };
      }),
    [paged.pageItems, now]
  );

  return (
    <div className={styles.split}>
      <Container
        title={rec ? `Recommendation #${rec.id}` : 'Recommendation'}
        icon={<SettingSuggest />}
        titleSuffixIcon={
          <InfoTooltip
            title={rec?.rationale ? 'Why this recommendation' : 'Recommendations'}
            content={rec?.rationale ?? OPTIMIZER_INFO}
          />
        }
        background="none"
        className={styles.split__main}
        contentWrapperProps={{ style: { overflow: 'hidden', gap: 0, minHeight: 0 } }}
      >
        {rec ? (
          <RecommendationCard key={rec.id} rec={rec} access={access} />
        ) : shownId !== null && selected.isError ? (
          <Empty>
            Recommendation #{shownId}{' '}
            {isNotFound(selected.error) ? 'was not found' : 'could not be loaded'}
          </Empty>
        ) : shownId !== null || history.isLoading ? (
          <Empty>Loading…</Empty>
        ) : (
          <Empty>No recommendation yet</Empty>
        )}
      </Container>

      <Container
        title="History"
        icon={<ManageHistory />}
        background="none"
        className={styles.split__side}
        contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
        rightTopComponent={
          access.canUpdate ? (
            <Button
              type="button"
              icon={<PlayFill />}
              onClick={() => run.mutate()}
              disabled={run.isPending || runPending}
              isLoading={run.isPending}
              title={
                runPending ? 'A run is already queued or running' : 'Optimize the set points now'
              }
            >
              Run now
            </Button>
          ) : null
        }
      >
        <div className={styles.optimizer}>
          <Pill color={optimizerStatus?.color ?? 'offline'}>
            Optimizer {optimizerStatus ? optimizerStatus.text.toLowerCase() : 'not run yet'}
          </Pill>
          <span className={styles.muted}>
            {optimizer?.lastRunAt ? `last ${timeAgo(optimizer.lastRunAt, now)}` : ''}
            {optimizer?.nextRunAt ? ` · next ${timeUntil(optimizer.nextRunAt, now)}` : ''}
          </span>
        </div>
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            paged.setPage(1);
          }}
          options={RecommendationStatusEnum.options.map((s) => ({
            value: s,
            label: RECOMMENDATION_STATUS[s].text,
          }))}
        />
        <div ref={fit.ref} className={styles.tableArea}>
          <Loading isLoading={history.isFetching && !history.data} />
          {rows.length ? (
            <Table
              columns={HISTORY_COLUMNS}
              rows={rows}
              selectable
              selectVariant="highlight"
              selectedRowIds={shownId !== null ? [String(shownId)] : []}
              onSelectRow={(id) => onSelect(Number(id))}
            />
          ) : (
            <Empty>{history.isLoading ? 'Loading…' : 'No recommendations'}</Empty>
          )}
        </div>
        <div className={styles.pagination}>
          <Pagination
            count={list.length}
            limit={fit.rows}
            page={paged.page}
            onChange={paged.setPage}
            variant="arrow"
          />
        </div>
      </Container>
    </div>
  );
};
