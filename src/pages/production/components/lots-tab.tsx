import {
  Container,
  Dropdown,
  InfoTooltip,
  Loading,
  Pagination2 as Pagination,
  Search,
  Table,
} from '@digital-twin/components';
import { InformationCircle, Layers } from '@digital-twin/icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

import {
  getLot,
  getLots,
  Lot,
  LotDetail,
  LotFilter,
  PRODUCTION_POLL,
  PRODUCTION_QUERY,
} from '../api/production.api';
import styles from '../production.module.scss';
import {
  fmtDays,
  fmtDec,
  fmtDuration,
  fmtInt,
  fmtTime,
  LOT_STATUS_COLOR,
  LOT_STATUS_LABEL,
  stepBase,
  toolTag,
} from '../production.utils';
import { Empty, Facts, Pill } from './shared';

const FILTERS: { value: LotFilter; label: string }[] = [
  { value: 'wip', label: 'In the fab' },
  { value: 'hold', label: 'On hold' },
  { value: 'done', label: 'Completed' },
  { value: 'all', label: 'All lots' },
];

const COLUMNS = [
  { key: 'lot', name: 'Lot' },
  { key: 'product', name: 'Product', width: 84 },
  { key: 'status', name: 'Status', width: 116 },
  { key: 'step', name: 'Step' },
  { key: 'layer', name: 'Layer', width: 84 },
  { key: 'tool', name: 'Tool', width: 90 },
  { key: 'wafers', name: 'Wafers', width: 74 },
  { key: 'progress', name: 'Progress', width: 108 },
  { key: 'released', name: 'Released', width: 116 },
  { key: 'cycle', name: 'Cycle time', width: 100 },
];

const PAGE_SIZE = 25;

const LOTS_INFO =
  'Lots of 25 wafers run the full 40 nm flow of their product, one mask layer after the other: wafer start, STI, wells and threshold implants, dual gate oxide, poly gate, LDD, spacer, source / drain, silicide, tungsten contacts, the copper metal levels, passivation, aluminium pads and the wafer acceptance test - 254 steps and 33 masks (MCU40) or 294 steps and 39 masks (WSOC40), about two to three weeks in the fab. Rework steps (resist strip, film strip, scrub) are shown as RW-.';

/** A FOUP location in words: a load port, a stocker, or inside a batch tool */
export const foupPlace = (loc: string | null) => {
  if (!loc) return '--';
  const port = /^(.+):(\d+)$/.exec(loc);
  if (port) return `${toolTag(port[1])} port ${port[2]}`;
  if (loc.startsWith('STK-')) return `Stocker ${loc}`;
  return `In ${toolTag(loc)}`;
};

const TRANSFER_KIND: Record<string, string> = {
  deliver: 'To the tool',
  store: 'To the stocker',
  ship: 'Shipped',
};

/** Lots in the module or completed: table and the selected lot's route, history, metrology and scrap */
export const LotsTab = () => {
  const [filter, setFilter] = useState<LotFilter>('wip');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const params = { status: filter, search, page, limit: PAGE_SIZE };
  const lots = useQuery({
    queryKey: PRODUCTION_QUERY.lots(params),
    queryFn: () => getLots(params),
    refetchInterval: PRODUCTION_POLL.lots,
    placeholderData: keepPreviousData,
    meta: { toastId: 'productionLots' },
  });
  const now = Date.now();
  const rows = useMemo(
    () =>
      (lots.data?.data ?? []).map((l: Lot) => ({
        id: l.lotCode,
        lot: (
          <span>
            <b>{l.lotCode}</b>
            {l.priority === 1 ? (
              <>
                {' '}
                <Pill color="critical" title="Hot lot (priority 1)">
                  hot
                </Pill>
              </>
            ) : null}
            {l.reworkCount ? (
              <>
                {' '}
                <Pill
                  color="warning"
                  title={`${l.reworkCount} rework${l.reworkCount === 1 ? '' : 's'}`}
                >
                  rework
                </Pill>
              </>
            ) : null}
          </span>
        ),
        product: l.productCode,
        status: <Pill color={LOT_STATUS_COLOR[l.status]}>{LOT_STATUS_LABEL[l.status]}</Pill>,
        step: (
          <span title={l.holdReason ?? l.stepName ?? undefined}>
            {l.status === 'DONE'
              ? 'Fab out'
              : l.status === 'SCRAPPED'
                ? 'Scrapped'
                : `${l.stepCode ?? '--'} · ${l.stepName ?? ''}`}
          </span>
        ),
        layer: l.status === 'DONE' || l.status === 'SCRAPPED' ? '--' : (l.layer ?? '--'),
        tool: l.equipmentAlias ? toolTag(l.equipmentAlias) : '--',
        wafers: l.wafers === l.wafersStart ? String(l.wafers) : `${l.wafers} / ${l.wafersStart}`,
        progress:
          l.status === 'DONE' ? '100 %' : `${fmtDec(l.progressPct, 0)} % · ${l.seq}/${l.steps}`,
        released: fmtTime(l.releasedAt),
        cycle: (
          <span title={l.dueAt ? `Due ${fmtTime(l.dueAt)}` : undefined}>
            {fmtDays(l.cycleTimeDays)}
            {l.late ? (
              <>
                {' '}
                <Pill color="critical" title="Past its due date">
                  late
                </Pill>
              </>
            ) : null}
          </span>
        ),
      })),
    [lots.data]
  );
  const change = (apply: () => void) => {
    apply();
    setPage(1);
  };
  return (
    <div className={styles.tab}>
      <div className={styles.filters}>
        <Dropdown
          label="Lots"
          labelPosition="left"
          variant="medium"
          background="dark"
          value={filter}
          options={FILTERS}
          onChange={(v) => change(() => setFilter(v as LotFilter))}
          wrapperClassName={styles.filter}
        />
        <Search
          placeholder="Search lot code"
          background="dark"
          value={search}
          onChange={(v) => change(() => setSearch(v.trim()))}
          wrapperClassName={styles.search}
        />
        <span className={styles.muted}>{lots.data ? `${fmtInt(lots.data.count)} lots` : ''}</span>
      </div>
      <div className={styles.split}>
        <Container
          title="Lots"
          icon={<Layers />}
          titleSuffixIcon={<InfoTooltip title="Lots" content={LOTS_INFO} />}
          background="none"
          className={styles.split__main}
          contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
        >
          <div className={styles.tableArea}>
            <Loading isLoading={lots.isFetching && !lots.data} />
            {rows.length ? (
              <Table
                columns={COLUMNS}
                rows={rows}
                selectable
                selectVariant="highlight"
                selectedRowIds={selected ? [selected] : []}
                onSelectRow={(id, isSelected) => setSelected(isSelected ? id : null)}
              />
            ) : (
              <Empty>{lots.isLoading ? 'Loading…' : 'No lots'}</Empty>
            )}
          </div>
          <div className={styles.pagination}>
            <Pagination
              count={lots.data?.count ?? 0}
              limit={PAGE_SIZE}
              page={page}
              onChange={setPage}
              variant="arrow"
            />
          </div>
        </Container>
        <Container
          title={selected ? `Lot ${selected}` : 'Lot detail'}
          icon={<InformationCircle />}
          background="none"
          className={styles.split__side}
          contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
        >
          {selected ? (
            <LotDetailPanel key={selected} code={selected} now={now} />
          ) : (
            <Empty>Select a lot</Empty>
          )}
        </Container>
      </div>
    </div>
  );
};

const OUTCOME_COLOR = {
  PASS: 'normal',
  REWORK: 'warning',
  SCRAP: 'critical',
  ABORTED: 'unplanned-down',
} as const;

/** Route of the lot by mask layer / module, in flow order: done, current, skipped and future steps */
const RouteMap = ({ detail }: { detail: LotDetail }) => {
  const lastBySeq = new Map<number, LotDetail['steps'][number]>();
  for (const s of detail.steps) if (!s.stepCode.startsWith('RW-')) lastBySeq.set(s.seq, s);
  const current =
    detail.lot.status === 'DONE' || detail.lot.status === 'SCRAPPED' ? null : detail.lot.seq;
  const layers: { layer: string; steps: LotDetail['route'] }[] = [];
  for (const r of detail.route) {
    const last = layers[layers.length - 1];
    if (last && last.layer === r.layer) last.steps.push(r);
    else layers.push({ layer: r.layer, steps: [r] });
  }
  return (
    <div className={styles.route}>
      {layers.map(({ layer, steps }, i) => (
        <div key={`${layer}-${i}`} style={{ display: 'contents' }}>
          <div className={styles.route__layer} title={steps[0]?.module ?? undefined}>
            {layer}
          </div>
          {steps.map((r) => {
            const s = lastBySeq.get(r.seq);
            const isCurrent = r.seq === current;
            return (
              <div
                key={r.seq}
                title={`${r.seq}. ${r.stepCode} · ${r.operation}${s?.equipmentAlias ? ` · ${toolTag(s.equipmentAlias)}` : ''}`}
                className={clsx(styles.route__step, {
                  [styles['route__step--current']]: isCurrent,
                  [styles['route__step--done']]: !isCurrent && s?.status === 'DONE',
                  [styles['route__step--skipped']]: s?.status === 'SKIPPED',
                })}
              >
                {stepBase(r.stepCode, r.layer)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const LotDetailPanel = ({ code, now }: { code: string; now: number }) => {
  const q = useQuery({
    queryKey: PRODUCTION_QUERY.lot(code),
    queryFn: () => getLot(code),
    refetchInterval: PRODUCTION_POLL.lots,
    meta: { toastId: 'productionLot' },
  });
  if (!q.data) return <Empty>{q.isError ? 'Lot not found' : 'Loading…'}</Empty>;
  const { lot, steps, metrology, scrap, transfers } = q.data;
  const end = lot.completedAt ? Date.parse(lot.completedAt) : now;
  return (
    <div className={styles.detail}>
      <Facts
        items={[
          { label: 'Product', value: lot.productCode },
          { label: 'Step', value: `${lot.seq} of ${lot.steps}` },
          {
            label: 'Status',
            value: <Pill color={LOT_STATUS_COLOR[lot.status]}>{LOT_STATUS_LABEL[lot.status]}</Pill>,
          },
          { label: 'Priority', value: lot.priority === 1 ? 'Hot lot (1)' : String(lot.priority) },
          { label: 'Wafers', value: `${lot.wafers} of ${lot.wafersStart}` },
          { label: 'Released', value: fmtTime(lot.releasedAt) },
          {
            label: lot.completedAt ? 'Completed' : 'Due',
            value: fmtTime(lot.completedAt ?? lot.dueAt),
          },
          { label: 'Cycle time', value: fmtDuration(end - Date.parse(lot.releasedAt)) },
          { label: 'Reworks', value: String(lot.reworkCount) },
          { label: 'FOUP at', value: foupPlace(lot.location) },
        ]}
      />
      {lot.holdReason ? <Pill color="warning">{lot.holdReason}</Pill> : null}
      <h4>Route</h4>
      <RouteMap detail={q.data} />
      <h4>Step history</h4>
      <table className={styles.steps}>
        <thead>
          <tr>
            <th>Step</th>
            <th>Tool</th>
            <th>Start</th>
            <th>Queue</th>
            <th>Run</th>
            <th>Wafers</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {[...steps].reverse().map((s) => {
            const run =
              s.startedAt && s.endedAt ? Date.parse(s.endedAt) - Date.parse(s.startedAt) : null;
            return (
              <tr
                key={s.id}
                className={s.isRework ? 'rework' : undefined}
                title={s.isRework ? 'Rework' : undefined}
              >
                <td title={s.operation}>
                  {s.stepCode}
                  {s.isRework ? ' ↺' : ''}
                </td>
                <td title={s.chambers ?? undefined}>
                  {s.equipmentAlias ? toolTag(s.equipmentAlias) : '--'}
                </td>
                <td>
                  {s.startedAt
                    ? fmtTime(s.startedAt, 'dd MMM HH:mm')
                    : s.status === 'QUEUED'
                      ? 'queued'
                      : '--'}
                </td>
                <td>{s.queueMin !== null ? `${fmtDec(s.queueMin, 0)}m` : '--'}</td>
                <td>
                  {run !== null ? fmtDuration(run) : s.status === 'PROCESSING' ? 'running' : '--'}
                </td>
                <td>
                  {s.wafersIn}
                  {s.wafersOut !== null && s.wafersOut !== s.wafersIn ? ` → ${s.wafersOut}` : ''}
                </td>
                <td>
                  {s.status === 'SKIPPED' ? (
                    <span className={styles.muted}>not sampled</span>
                  ) : s.outcome ? (
                    <Pill
                      color={OUTCOME_COLOR[s.outcome as keyof typeof OUTCOME_COLOR] ?? 'secondary'}
                    >
                      {s.outcome.toLowerCase()}
                    </Pill>
                  ) : (
                    <span className={styles.muted}>{s.status.toLowerCase()}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h4>Metrology</h4>
      {metrology.length ? (
        <table className={styles.steps}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Parameter</th>
              <th>Wafer</th>
              <th>Value</th>
              <th>Spec</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {[...metrology].reverse().map((m, i) => (
              <tr key={i}>
                <td>{fmtTime(m.measuredAt, 'dd MMM HH:mm')}</td>
                <td title={m.sourceStepCode ?? undefined}>{m.charKey ?? m.param}</td>
                <td>{m.wafer}</td>
                <td>
                  <Pill color={m.pass ? 'normal' : 'critical'}>
                    {fmtDec(m.value, m.param === 'defects' ? 0 : 2)}
                    {m.unit && m.param !== 'defects' ? ` ${m.unit}` : ''}
                  </Pill>
                </td>
                <td className={styles.muted}>
                  {m.lsl !== null ? fmtDec(m.lsl, 1) : ''}
                  {m.lsl !== null && m.usl !== null ? ' – ' : m.usl !== null ? '≤ ' : ''}
                  {m.usl !== null ? fmtDec(m.usl, 1) : ''}
                </td>
                <td>
                  {m.sourceAlias ? toolTag(m.sourceAlias) : '--'}
                  {m.sourceChamber ? ` ${m.sourceChamber}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <span className={styles.muted}>No measurements yet</span>
      )}
      {scrap.length ? (
        <>
          <h4>Scrap</h4>
          <table className={styles.steps}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Wafers</th>
                <th>Reason</th>
                <th>Step</th>
                <th>Tool</th>
              </tr>
            </thead>
            <tbody>
              {scrap.map((s, i) => (
                <tr key={i}>
                  <td>{fmtTime(s.at, 'dd MMM HH:mm')}</td>
                  <td>{s.wafers}</td>
                  <td>{s.reason}</td>
                  <td>{s.stepCode ?? '--'}</td>
                  <td>
                    {s.equipmentAlias ? toolTag(s.equipmentAlias) : '--'}
                    {s.chamber ? ` ${s.chamber}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      {transfers.length ? (
        <>
          <h4>Overhead transport</h4>
          <table className={styles.steps}>
            <thead>
              <tr>
                <th>Requested</th>
                <th>Move</th>
                <th>From</th>
                <th>To</th>
                <th>Vehicle</th>
                <th>Minutes</th>
              </tr>
            </thead>
            <tbody>
              {transfers.slice(0, 12).map((t, i) => (
                <tr key={i}>
                  <td>{fmtTime(t.requestedAt, 'dd MMM HH:mm')}</td>
                  <td>{TRANSFER_KIND[t.kind] ?? t.kind}</td>
                  <td>{foupPlace(t.from)}</td>
                  <td>{foupPlace(t.to)}</td>
                  <td>{t.vehicle}</td>
                  <td>{t.minutes.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </div>
  );
};
