import {
  Column,
  Container,
  InfoTooltip,
  Loading,
  Pagination2 as Pagination,
  Table,
} from '@digital-twin/components';
import { ListAlt } from '@digital-twin/icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  listJobs,
  SIM_ACTIVE_STATUSES,
  SIM_QUERY,
  SimJob,
  SimJobOrigin,
} from '../api/simulation.api';
import { DOMAINS, SimDomain } from '../simulation.domain';
import { STATUS_FILTERS } from '../simulation.links';
import styles from '../simulation.module.scss';
import {
  durationText,
  Empty,
  errorText,
  fmtTime,
  jobMinutes,
  ORIGIN_LABEL,
  StatusBadge,
  useRowsThatFit,
} from './job-bits';

/** Refresh while a job is queued, running or being analysed; slower otherwise (new proposals) */
const ACTIVE_MS = 3_000;
const IDLE_MS = 30_000;
/** Table row and header heights (LIB Table, tone simple) */
const ROW_PX = 72;
const HEADER_PX = 45;

// the created time leads the sub line: the title gets the width (no cut titles)
const COLUMNS: Column[] = [
  { key: 'title', name: 'Simulation' },
  { key: 'status', name: 'Status', width: 124 },
];

/** "14 Oct 08:47 · 4 h · 2 variants · Sarah Lim · AI assistant" */
const subline = (job: SimJob) => {
  const minutes = jobMinutes(job);
  return [
    fmtTime(job.createdAt),
    minutes !== null
      ? job.kind === 'production'
        ? `${Math.round(minutes / 1440)} days`
        : durationText(minutes)
      : null,
    job.variants.length > 1 ? `${job.variants.length} variants` : null,
    job.kind === 'doe' ? 'Design of experiments' : null,
    job.kind === 'production' ? 'Production plan' : null,
    job.requestedByName,
    ORIGIN_LABEL[job.origin],
  ]
    .filter(Boolean)
    .join(' · ');
};

type JobListProps = {
  /** key of `STATUS_FILTERS` */
  statusKey: string;
  origin: SimJobOrigin | '';
  /** the workspace: lists its job kinds only */
  domain: SimDomain;
  selectedId: number | null;
  onSelect: (jobId: number) => void;
  /** the newest job of the list, once loaded */
  onLoaded?: (jobId: number) => void;
};

/** Simulation jobs, newest first, one page sized to the panel */
export const JobList = ({
  statusKey,
  origin,
  domain,
  selectedId,
  onSelect,
  onLoaded,
}: JobListProps) => {
  const [page, setPage] = useState(1);
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const limit = useRowsThatFit(box, ROW_PX, HEADER_PX, 0);
  const statuses = STATUS_FILTERS.find((f) => f.key === statusKey)?.statuses ?? [];

  const { data, isError, error, isFetching } = useQuery({
    queryKey: [...SIM_QUERY.jobs, statusKey, origin, domain, page, limit],
    queryFn: () =>
      listJobs({
        status: statuses,
        origin: origin || undefined,
        kind: DOMAINS[domain].kinds,
        limit,
        offset: (page - 1) * limit,
      }),
    enabled: limit > 0,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.jobs.some((j) => SIM_ACTIVE_STATUSES.includes(j.status))
        ? ACTIVE_MS
        : IDLE_MS,
    refetchOnWindowFocus: false,
    meta: { toastId: 'simulationJobs' },
  });
  // a larger panel (more rows per page) can leave the page past the end: go to the last one
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / Math.max(limit, 1)));
  useEffect(() => {
    if (data && page > pages) setPage(pages);
  }, [data, page, pages]);
  const newest = page === 1 ? data?.jobs[0]?.id : undefined;
  useEffect(() => {
    if (newest !== undefined) onLoaded?.(newest);
  }, [newest, onLoaded]);

  const rows = (data?.jobs ?? []).map((job) => ({
    id: String(job.id),
    title: (
      // a button so the row can be chosen with the keyboard too (its click selects the row)
      <button type="button" className={styles.jobcell} title={job.title}>
        <span className={styles.jobcell__title}>
          <span className={styles.caption}>#{job.id}</span> {job.title}
        </span>
        <span className={styles.jobcell__sub}>{subline(job)}</span>
      </button>
    ),
    status: <StatusBadge status={job.status} progress={job.progress} />,
  }));

  return (
    <Container
      title={domain === 'chiller' ? 'Scenarios' : 'Production plans'}
      icon={<ListAlt width={24} height={24} />}
      background="none"
      className={styles.list}
      titleSuffixIcon={
        <InfoTooltip
          title={DOMAINS[domain].title}
          content="Newest first. Pick one to see its results."
        />
      }
      contentWrapperProps={{ style: { overflow: 'hidden', gap: 16 } }}
    >
      <Loading isLoading={isFetching && !data} />
      <div className={styles.list__table} ref={setBox}>
        {isError ? (
          <Empty error>{errorText(error)}</Empty>
        ) : data && !data.jobs.length ? (
          <Empty>
            {statusKey === 'all' && !origin
              ? `No ${domain === 'chiller' ? 'scenarios' : 'production plans'} yet`
              : 'Nothing matches these filters'}
          </Empty>
        ) : (
          <Table
            columns={COLUMNS}
            rows={rows}
            selectable
            selectVariant="highlight"
            rowHeight={72}
            selectedRowIds={selectedId !== null ? [String(selectedId)] : []}
            onSelectRow={(id) => onSelect(Number(id))}
          />
        )}
      </div>
      <div className={styles.pagination}>
        <Pagination
          count={data?.total ?? 0}
          limit={limit || 1}
          page={page}
          onChange={setPage}
          variant="arrow"
        />
      </div>
    </Container>
  );
};
