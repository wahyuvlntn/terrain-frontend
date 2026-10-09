import { Badge, CONDITION_COLOR, STATUS_COLOR } from '@digital-twin/components';
import { format } from 'date-fns';

import { TwinToolActivity, TwinToolRun, TwinToolRunNow } from '../../api/digital-twin.api';
import styles from './overlay.module.scss';
import { Empty, SectionTitle, TwinMetric } from './twin-ui';

/** the windows of the last processes (hours) */
export const PROCESS_WINDOWS = [1, 4, 8, 24];
/** rows of the last processes list */
const ROWS = 40;

/** "45 s", "18 min", "2 h 05 min" */
export const formatDuration = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '--';
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};

/**
 * How far a run in process is at `now` (epoch ms): elapsed and remaining seconds, the share done
 * (null without an expected time; held at 99 % when it runs over) and the wafer in work (a
 * single-wafer or cluster tool works through the lot; a batch has all of them in at once)
 */
export const runProgress = (run: TwinToolRunNow, now: number) => {
  const start = run.startedAt ? Date.parse(run.startedAt) : Number.NaN;
  const elapsedS = Number.isFinite(start) ? Math.max(0, (now - start) / 1000) : null;
  const expected = run.expectedS && run.expectedS > 0 ? run.expectedS : null;
  const progress = elapsedS !== null && expected ? Math.min(0.99, elapsedS / expected) : null;
  const total = run.wafersProcessed || run.wafers;
  const wafer =
    run.batchId || progress === null || total <= 0
      ? null
      : Math.min(total, Math.floor(progress * total) + 1);
  return {
    elapsedS,
    remainingS: elapsedS !== null && expected ? expected - elapsedS : null,
    progress,
    wafer,
    total,
  };
};

/** The runs in process, a furnace batch (several lots in one run) as one */
export const groupRuns = (runs: TwinToolRunNow[]) => {
  const groups = new Map<string, TwinToolRunNow[]>();
  runs.forEach((r, i) => {
    const key = r.batchId ?? `run-${i}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  return [...groups.values()];
};

/**
 * The runs that ended in the last `hours` before `now`, and what the tool did in that window:
 * runs (a batch counts once), lot steps, wafers out, and how busy it was (the share of the window
 * covered by runs, the ones in process included)
 */
export const windowStats = (
  recent: TwinToolRun[],
  current: TwinToolRunNow[],
  now: number,
  hours: number
) => {
  const from = now - hours * 3600e3;
  const runs = recent.filter((r) => Date.parse(r.endedAt) >= from);
  const spans: [number, number][] = [
    ...runs.map((r): [number, number] => [
      r.startedAt ? Date.parse(r.startedAt) : Date.parse(r.endedAt),
      Date.parse(r.endedAt),
    ]),
    ...current.flatMap((r): [number, number][] =>
      r.startedAt ? [[Date.parse(r.startedAt), now]] : []
    ),
  ]
    .map(([a, b]): [number, number] => [Math.max(a, from), Math.min(b, now)])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let busy = 0;
  let end = from;
  spans.forEach(([a, b]) => {
    if (b <= end) return;
    busy += b - Math.max(a, end);
    end = b;
  });
  return {
    runs,
    runCount: new Set(runs.map((r, i) => r.batchId ?? `run-${i}`)).size,
    lotSteps: runs.length,
    wafers: runs.reduce((n, r) => n + (r.wafersOut ?? r.wafersIn), 0),
    busyPct: (busy / (hours * 3600e3)) * 100,
  };
};

const OUTCOME_BADGE: Record<string, 'normal' | 'warning' | 'critical' | 'secondary'> = {
  PASS: 'normal',
  REWORK: 'warning',
  SCRAP: 'critical',
  ABORTED: 'critical',
};

const lotLabel = (r: { lotCode: string | null; productCode: string | null }) =>
  r.lotCode ? `${r.lotCode}${r.productCode ? ` (${r.productCode})` : ''}` : 'Lot hidden';

/** One run in process: step and recipe, the lot(s), a progress bar, the wafer in work, time left */
const NowCard = ({ runs, now }: { runs: TwinToolRunNow[]; now: number }) => {
  const run = runs[0];
  const p = runProgress(run, now);
  const batch = runs.length > 1 || !!run.batchId;
  const wafers = runs.reduce((n, r) => n + r.wafers, 0);
  const pct = p.progress === null ? null : Math.round(p.progress * 100);
  return (
    <div className={styles.process}>
      <div className={styles.process__head}>
        <strong>{run.operation}</strong>
        {run.isRework ? (
          <Badge color="warning" className={styles.badge}>
            Rework
          </Badge>
        ) : null}
      </div>
      <span className={styles.process__meta}>
        {run.stepCode} · recipe {run.recipe || '--'}
        {run.chambers ? ` · ${run.chambers}` : ''}
      </span>
      <span className={styles.process__meta}>
        {batch
          ? `Batch of ${runs.length} lot${runs.length === 1 ? '' : 's'}, ${wafers} wafers: ${runs.map(lotLabel).join(', ')}`
          : `${lotLabel(run)} · step ${run.seq} of ${run.routeSteps}`}
      </span>
      <div
        className={styles.process__bar}
        role="progressbar"
        aria-label="Run progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
      >
        <span style={{ width: `${pct ?? 0}%` }} />
      </div>
      <div className={styles.process__foot}>
        <span>
          {batch
            ? `${wafers} wafers in the furnace`
            : p.wafer
              ? `Wafer ${p.wafer} of ${p.total}`
              : `${p.total} wafers`}
        </span>
        <span>
          {pct === null ? 'progress unknown' : `${pct} %`}
          {p.remainingS !== null
            ? p.remainingS > 0
              ? ` · ${formatDuration(p.remainingS)} left`
              : ` · over by ${formatDuration(-p.remainingS)}`
            : ''}
          {run.startedAt ? ` · since ${format(Date.parse(run.startedAt), 'HH:mm')}` : ''}
        </span>
      </div>
    </div>
  );
};

/**
 * Process tab of a FAB1 tool's dashboard: what it is running now (lot, step, recipe, wafer,
 * progress) and the processes of the last 1 / 4 / 8 / 24 h
 */
export const ToolProcess = ({
  activity,
  now,
  hours,
}: {
  activity: TwinToolActivity;
  now: number;
  hours: number;
}) => {
  const groups = groupRuns(activity.current);
  const stats = windowStats(activity.recent, activity.current, now, hours);
  return (
    <>
      <section className={styles.section}>
        <SectionTitle title="Now processing" />
        {groups.length ? (
          groups.map((runs) => (
            <NowCard
              key={runs[0].batchId ?? `${runs[0].lotCode}-${runs[0].seq}`}
              runs={runs}
              now={now}
            />
          ))
        ) : (
          <Empty>No lot in process</Empty>
        )}
      </section>

      <section className={styles.section}>
        <SectionTitle title={`Last processes · ${hours} h`} />
        <div className={styles.kpis}>
          <TwinMetric title="Runs" value={String(stats.runCount)} />
          <TwinMetric title="Lots" value={String(stats.lotSteps)} />
          <TwinMetric title="Wafers" value={String(stats.wafers)} />
          <TwinMetric title="Busy" value={stats.busyPct.toFixed(0)} unit="%" />
        </div>
        {stats.runs.length ? (
          <ul className={styles.list}>
            {stats.runs.slice(0, ROWS).map((r, i) => (
              <li key={`${r.lotCode}-${r.seq}-${r.endedAt}-${i}`}>
                <i
                  style={{
                    background:
                      r.outcome === 'PASS' || !r.outcome
                        ? STATUS_COLOR.RUNNING
                        : r.outcome === 'REWORK'
                          ? CONDITION_COLOR.WARNING
                          : CONDITION_COLOR.CRITICAL,
                  }}
                />
                <div className={styles.list__body}>
                  <strong>
                    {r.operation}
                    {r.outcome && r.outcome !== 'PASS' ? (
                      <Badge
                        color={OUTCOME_BADGE[r.outcome] ?? 'secondary'}
                        className={styles.badge}
                      >
                        {r.outcome}
                      </Badge>
                    ) : null}
                  </strong>
                  <span>
                    {lotLabel(r)} · {r.stepCode} · {r.wafersOut ?? r.wafersIn} wafers ·{' '}
                    {formatDuration(
                      r.startedAt ? (Date.parse(r.endedAt) - Date.parse(r.startedAt)) / 1000 : null
                    )}
                  </span>
                </div>
                <time title={format(Date.parse(r.endedAt), 'dd MMM yyyy HH:mm')}>
                  {format(Date.parse(r.endedAt), 'HH:mm')}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No process ended in the last {hours} h</Empty>
        )}
        {!activity.lotsVisible ? <Empty>Lot codes need the Production permission</Empty> : null}
      </section>
    </>
  );
};
