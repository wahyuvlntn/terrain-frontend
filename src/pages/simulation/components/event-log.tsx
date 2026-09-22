import {
  Badge,
  Button,
  Column,
  Dropdown,
  DropdownMultiple,
  Loading,
  Pagination2 as Pagination,
  Popup,
  Table,
  ThemeContext,
} from '@digital-twin/components';
import { Cube, EventBusy } from '@digital-twin/icons';
import { useQuery } from '@tanstack/react-query';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PLANT_ALIASES } from '../../digital-twin/digital-twin.bms';
import {
  getEvents,
  SIM_ACTIVE_STATUSES,
  SIM_EVENT_KIND_LABEL,
  SIM_QUERY,
  SIM_REPLAYABLE_STATUSES,
  SimEvent,
  SimEventKind,
  SimEventKindEnum,
  SimJob,
} from '../api/simulation.api';
import { tagOf } from '../simulation.catalog';
import { CHART_FONT, chartAxis, chartTooltip, ThemeColors } from '../simulation.charts';
import { replayLink } from '../simulation.links';
import styles from '../simulation.module.scss';
import { BadgeColor, Empty, errorText, fmtTime, offsetText, useRowsThatFit } from './job-bits';

/** events read for the timeline overview (the backend allows 1000 per call); the table pages on the server */
const MAX_EVENTS = 1000;
const ROW_PX = 41;
const HEADER_PX = 45;
const VARIANT_SYMBOLS = ['circle', 'diamond', 'triangle'];

const severityOf = (e: SimEvent) => (e.severity ?? '').toUpperCase();

const SEVERITY_BADGE = (e: SimEvent): BadgeColor => {
  const s = severityOf(e);
  if (s === 'CRITICAL') return 'critical';
  if (s === 'WARNING') return 'warning';
  return 'secondary';
};

const severityColor = (colors: Partial<ThemeColors>, e: SimEvent) => {
  const s = severityOf(e);
  if (s === 'CRITICAL') return colors.conditionCriticalSecondary;
  if (s === 'WARNING') return colors.conditionWarningSecondary;
  return colors.accentInfoSecondary;
};

const valueText = (v: number | null) =>
  v === null ? '' : Number.isInteger(v) ? String(v) : v.toFixed(2);

const detailText = (v: unknown): string =>
  v === null || v === undefined
    ? '--'
    : typeof v === 'number'
      ? valueText(v)
      : typeof v === 'string' || typeof v === 'boolean'
        ? String(v)
        : JSON.stringify(v);

/** "abs_dev_k" → "Abs dev k" */
const humanize = (key: string) => {
  const s = key.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// ------------------------------------------------------------------ timeline
const EventTimeline = ({
  events,
  variants,
  onPick,
}: {
  events: SimEvent[];
  variants: string[];
  onPick: (event: SimEvent) => void;
}) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const kinds = SimEventKindEnum.options.filter((k) => events.some((e) => e.kind === k));
    const many = variants.length > 1;
    return {
      animation: false,
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...chartTooltip(colors),
        trigger: 'item',
        formatter: ({ data }: { data: { event: SimEvent } }) => {
          const e = data.event;
          return [
            `<b>${SIM_EVENT_KIND_LABEL[e.kind]}</b>${e.assetAlias ? ` · ${tagOf(e.assetAlias)}` : ''}`,
            `${fmtTime(e.ts)}${many ? ` · ${e.variant}` : ''}`,
            e.message,
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      xAxis: {
        type: 'time',
        axisLabel: { ...axis.label, hideOverlap: true, formatter: '{HH}:{mm}' },
        axisLine: axis.line,
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: kinds.map((k) => SIM_EVENT_KIND_LABEL[k]),
        axisLabel: { ...axis.label, fontSize: CHART_FONT.tick },
        axisTick: { show: false },
        axisLine: axis.line,
        splitLine: { show: true, lineStyle: axis.split.lineStyle },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 10,
          cursor: 'pointer',
          data: events.map((e) => ({
            value: [Date.parse(e.ts), kinds.indexOf(e.kind)],
            symbol: VARIANT_SYMBOLS[Math.max(variants.indexOf(e.variant), 0) % 3],
            itemStyle: { color: severityColor(colors, e), opacity: 0.85 },
            event: e,
          })),
        },
      ],
    };
  }, [colors, events, variants]);
  const kindCount = new Set(events.map((e) => e.kind)).size;
  return (
    <ReactECharts
      option={option}
      style={{ height: Math.min(64 + kindCount * 26, 220) }}
      notMerge
      lazyUpdate
      onEvents={{
        click: ({ data }: { data?: { event?: SimEvent } }) => {
          if (data?.event) onPick(data.event);
        },
      }}
    />
  );
};

// ------------------------------------------------------------------ details
const EventDetails = ({
  job,
  event,
  onClose,
}: {
  job: SimJob;
  event: SimEvent | null;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const simStart = job.simStart ? Date.parse(job.simStart) : null;
  const replayable = SIM_REPLAYABLE_STATUSES.includes(job.status);
  const e = event;
  const facts: [string, string][] = e
    ? [
        [
          'Time',
          `${fmtTime(e.ts, 'dd MMM yyyy HH:mm:ss')}${
            simStart !== null ? ` (${offsetText((Date.parse(e.ts) - simStart) / 60_000)})` : ''
          }`,
        ],
        ...(e.endTs
          ? [['Until', fmtTime(e.endTs, 'dd MMM yyyy HH:mm:ss')] as [string, string]]
          : []),
        ['Variant', e.variant],
        ['Equipment', e.assetAlias ? tagOf(e.assetAlias) : '--'],
        ['Code', e.code ?? '--'],
        ['Severity', e.severity ?? '--'],
        ['Value', e.value === null ? '--' : valueText(e.value)],
        ...Object.entries(e.details).map(
          ([k, v]) => [humanize(k), detailText(v)] as [string, string]
        ),
      ]
    : [];
  return (
    <Popup
      title={
        e
          ? `${SIM_EVENT_KIND_LABEL[e.kind]}${e.assetAlias ? ` · ${tagOf(e.assetAlias)}` : ''}`
          : 'Event'
      }
      icon={<EventBusy width={24} height={24} />}
      open={!!e}
      onClose={onClose}
      width={640}
      background="none"
    >
      {e ? (
        <div className={styles.event}>
          <div className={styles.event__head}>
            <Badge color={SEVERITY_BADGE(e)} className={styles.badge}>
              {SIM_EVENT_KIND_LABEL[e.kind]}
            </Badge>
            {replayable ? (
              <Button
                type="button"
                color="default-secondary"
                icon={<Cube width={20} height={20} />}
                onClick={() => navigate(replayLink(job.id, e.variant, e.ts))}
              >
                Replay from here
              </Button>
            ) : null}
          </div>
          {e.message ? <p className={styles.event__message}>{e.message}</p> : null}
          <dl className={styles.event__facts}>
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd title={value}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </Popup>
  );
};

// ------------------------------------------------------------------ log
/** Events the run recorded (status, alarms, controls, faults, anomalies …): timeline and table */
export const EventLog = ({ job }: { job: SimJob }) => {
  const [variant, setVariant] = useState('');
  const [kinds, setKinds] = useState<SimEventKind[]>([]);
  const [asset, setAsset] = useState('');
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<SimEvent | null>(null);
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const limit = useRowsThatFit(box, ROW_PX, HEADER_PX);
  const active = SIM_ACTIVE_STATUSES.includes(job.status);
  const simStart = job.simStart ? Date.parse(job.simStart) : null;
  const many = job.variants.length > 1;

  const { data, isError, error } = useQuery({
    queryKey: [...SIM_QUERY.events(job.id), variant, kinds.join(','), asset, MAX_EVENTS],
    queryFn: () => getEvents({ jobId: job.id, variant, kinds, asset, limit: MAX_EVENTS }),
    // a running job keeps recording
    refetchInterval: active ? 5_000 : false,
    refetchOnWindowFocus: false,
    meta: { toastId: 'simulationEvents' },
  });
  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(Math.ceil(total / limit), 1);
  const current = Math.min(page, pages);
  const table = useQuery({
    queryKey: [
      ...SIM_QUERY.events(job.id),
      variant,
      kinds.join(','),
      asset,
      'page',
      current,
      limit,
    ],
    queryFn: () =>
      getEvents({ jobId: job.id, variant, kinds, asset, limit, offset: (current - 1) * limit }),
    enabled: limit > 0,
    refetchInterval: active ? 5_000 : false,
    refetchOnWindowFocus: false,
    meta: { toastId: 'simulationEvents' },
  });
  const shown = table.data?.events ?? [];
  const isFetching = table.isFetching;
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  const columns: Column[] = [
    { key: 'time', name: 'Time', width: 150 },
    ...(many ? [{ key: 'variant', name: 'Variant', width: 130 }] : []),
    { key: 'asset', name: 'Equipment', width: 110 },
    { key: 'kind', name: 'Kind', width: 150 },
    { key: 'message', name: 'Message' },
  ];
  const rows = shown.map((e) => ({
    id: String(e.id),
    time: (
      <span>
        {fmtTime(e.ts, 'HH:mm')}
        {simStart !== null ? (
          <span className={styles.caption}>
            {' '}
            {offsetText((Date.parse(e.ts) - simStart) / 60_000)}
          </span>
        ) : null}
      </span>
    ),
    variant: e.variant,
    asset: e.assetAlias ? tagOf(e.assetAlias) : '--',
    kind: (
      <Badge color={SEVERITY_BADGE(e)} fillVariant="outlined" className={styles.badge}>
        {SIM_EVENT_KIND_LABEL[e.kind]}
      </Badge>
    ),
    message: (
      // a button so the details can be opened with the keyboard too (its click picks the row)
      <button type="button" className={styles.rowbutton} title={e.message}>
        {e.code ? <span className={styles.caption}>{e.code} </span> : null}
        {e.message || SIM_EVENT_KIND_LABEL[e.kind]}
      </button>
    ),
  }));

  return (
    <div className={styles.events}>
      <div className={styles.events__filters}>
        <DropdownMultiple
          options={SimEventKindEnum.options.map((k) => ({
            value: k,
            label: SIM_EVENT_KIND_LABEL[k],
          }))}
          value={kinds}
          onChange={(v) => filter(setKinds)(v as SimEventKind[])}
          placeholder="All kinds"
          background="dark"
          wrapperClassName={styles.events__kinds}
        />
        {many ? (
          <Dropdown
            options={[
              { value: '', label: 'All variants' },
              ...job.variants.map((v) => ({ value: v, label: v })),
            ]}
            value={variant}
            onChange={filter(setVariant)}
            background="dark"
            wrapperClassName={styles.events__select}
          />
        ) : null}
        <Dropdown
          options={[
            { value: '', label: 'All equipment' },
            ...PLANT_ALIASES.map((a) => ({ value: a, label: tagOf(a) })),
          ]}
          value={asset}
          onChange={filter(setAsset)}
          searchable
          background="dark"
          wrapperClassName={styles.events__select}
        />
        <span className={styles.events__count}>{`${total} event${total === 1 ? '' : 's'}`}</span>
      </div>

      {isError ? (
        <Empty error>{errorText(error)}</Empty>
      ) : (
        <>
          {events.length ? (
            <div className={styles.events__timeline}>
              <EventTimeline events={events} variants={job.variants} onPick={setPicked} />
            </div>
          ) : null}
          <div className={styles.events__table} ref={setBox}>
            <Loading isLoading={isFetching && !table.data} />
            {table.data && !shown.length ? (
              <Empty>No events match these filters</Empty>
            ) : (
              <Table
                columns={columns}
                rows={rows}
                selectable
                selectVariant="highlight"
                selectedRowIds={picked ? [String(picked.id)] : []}
                onSelectRow={(id) => setPicked(shown.find((e) => String(e.id) === id) ?? null)}
              />
            )}
          </div>
          <div className={styles.pagination}>
            <Pagination
              count={total}
              limit={limit}
              page={current}
              onChange={setPage}
              variant="arrow"
            />
          </div>
        </>
      )}

      <EventDetails job={job} event={picked} onClose={() => setPicked(null)} />
    </div>
  );
};
