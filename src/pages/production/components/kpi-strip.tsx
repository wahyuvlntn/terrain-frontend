import { COLOR, InfoTooltip } from '@digital-twin/components';
import clsx from 'clsx';
import { ReactNode } from 'react';

import type { ProductionOverview } from '../api/production.api';
import styles from '../production.module.scss';
import { fmtDec, fmtInt, fmtPct, rating } from '../production.utils';
import { PctDonut, RATING_COLOR } from './shared';

const accent = (v: number | null, kind: 'oee' | 'factor' = 'factor') => {
  const r = rating(v, kind);
  return r ? RATING_COLOR[r] : COLOR.borderLight;
};

const INFO = {
  oee: 'SEMI E79: availability × operational × rate × quality efficiency, time-weighted over the production tools (good time / operations time).',
  availability:
    'Up time (productive + standby) over operations time (total time minus non-scheduled time).',
  operational: 'Productive time over up time.',
  utilization: 'Productive time over total time.',
  rate: 'Theoretical run time of the completed runs over their actual run time (speed losses: slower runs, chambers down for cleaning, part-filled furnace and wet bench batches).',
  quality:
    'Wafers processed minus wafers scrapped or reworked because of the tool, over wafers processed.',
  uptime: 'Productive + standby time over total time.',
  outs: 'Wafers that left the fab (every mask layer done and the wafer acceptance test passed) in the window.',
  moves: 'Lot steps completed on the production tools (wafer moves below).',
  wip: 'Lots in the fab now: queued at a tool, processing or on hold.',
  cycle:
    'Average time from lot start to fab out of the lots completed in the window, in days; X-factor = cycle time over the raw process time of the route; on time = completed by the planned date.',
  yield:
    'Wafers out over wafers started of the lots that left the fab in the window (scrapped lots included).',
  transport:
    'Overhead hoist transport (OHT): mean time from a transfer request (a tool dispatched a lot, a finished lot to its stocker) to the FOUP set down, and the share of time the vehicles were on jobs.',
};

/** The definitions of a card's numbers, behind its info icon */
const Definitions = ({ items }: { items: [string, string][] }) => (
  <dl className={styles.kpiDefs}>
    {items.map(([term, text]) => (
      <div key={term}>
        <dt>{term}</dt>
        <dd>{text}</dd>
      </div>
    ))}
  </dl>
);

/** Assistant sections of the strip (`?section=`): the strip and its cards; they open the strip */
export const KPI_SECTIONS = ['kpi', 'oee', 'output', 'flow'] as const;

/** A group of headline numbers: title, info icon with the definitions, its numbers */
const KpiCard = ({
  title,
  aside,
  info,
  section,
  className,
  children,
}: {
  title: string;
  aside?: ReactNode;
  info: [string, string][];
  /** its assistant section id */
  section?: string;
  className?: string;
  children: ReactNode;
}) => (
  <section
    className={clsx(styles.kpiCard, className)}
    aria-label={title}
    data-nav-section={section}
  >
    <header className={styles.kpiCard__head}>
      <h4>{title}</h4>
      {aside ? <span>{aside}</span> : null}
      <InfoTooltip title={title} content={<Definitions items={info} />} />
    </header>
    <div className={styles.kpiCard__body}>{children}</div>
  </section>
);

/** One headline number: label, value with unit, a line of detail; the accent marks its rating */
const Stat = ({
  label,
  value,
  unit,
  sub,
  accent: color,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: ReactNode;
  accent?: string;
  hint?: string;
}) => (
  <div className={styles.stat} style={{ borderLeftColor: color ?? COLOR.borderLight }} title={hint}>
    <span className={styles.stat__label}>{label}</span>
    <strong className={styles.stat__value}>
      {value}
      {unit ? <small>{unit}</small> : null}
    </strong>
    {sub ? <span className={styles.stat__sub}>{sub}</span> : null}
  </div>
);

const LOADING_CARDS = ['Equipment', 'Output', 'Flow'];

/**
 * Headline numbers of the fab for the window, in three cards: equipment (OEE and its factors),
 * output (outs, moves, line yield) and flow (WIP, cycle time, transport)
 */
export const KpiStrip = ({ data, isError }: { data?: ProductionOverview; isError: boolean }) => {
  if (!data) {
    const v = isError ? 'n/a' : '…';
    return (
      <div className={styles.strip} aria-busy={!isError} data-nav-section="kpi">
        {LOADING_CARDS.map((t) => (
          <section key={t} className={styles.kpiCard} aria-label={t}>
            <header className={styles.kpiCard__head}>
              <h4>{t}</h4>
            </header>
            <div className={styles.kpiCard__body}>
              <Stat label="" value={v} />
            </div>
          </section>
        ))}
      </div>
    );
  }
  const k = data.kpi;
  const hours = data.window.hours;
  const perDay = (n: number) =>
    hours >= 24 ? `${fmtInt((n * 24) / hours)} / day` : `${fmtInt((n * 12) / hours)} / shift`;
  const donuts: {
    label: string;
    value: number | null;
    kind?: 'oee';
    info: string;
    detail?: string;
  }[] = [
    {
      label: 'OEE',
      value: k.oee,
      kind: 'oee',
      info: INFO.oee,
      detail: `Utilization ${fmtPct(k.utilization)} · Uptime ${fmtPct(k.uptime)}`,
    },
    { label: 'Availability', value: k.availability, info: INFO.availability },
    { label: 'Operational', value: k.operational, info: INFO.operational },
    { label: 'Rate', value: k.rate, info: INFO.rate },
    {
      label: 'Quality',
      value: k.quality,
      info: INFO.quality,
      detail: `${fmtInt(k.scrapWafers)} scrapped · ${fmtInt(k.reworkWafers)} reworked`,
    },
  ];
  return (
    <div className={styles.strip} data-nav-section="kpi">
      <KpiCard
        title="Equipment"
        section="oee"
        aside={`${k.tools} production tools`}
        className={styles['kpiCard--oee']}
        info={[
          ['OEE', INFO.oee],
          ['Availability', INFO.availability],
          ['Operational', INFO.operational],
          ['Rate', INFO.rate],
          ['Quality', INFO.quality],
          ['Utilization', INFO.utilization],
          ['Uptime', INFO.uptime],
        ]}
      >
        {donuts.map((d) => (
          <div key={d.label} className={styles.donut}>
            <div className={styles.donut__label}>
              <span>{d.label}</span>
              <InfoTooltip
                title={d.label}
                content={
                  <div className={styles.kpiDefs}>
                    <span>{d.info}</span>
                    {d.detail ? <strong>{d.detail}</strong> : null}
                  </div>
                }
              />
            </div>
            <PctDonut value={d.value} kind={d.kind} />
          </div>
        ))}
      </KpiCard>

      <KpiCard
        title="Output"
        section="output"
        info={[
          ['Wafer outs', INFO.outs],
          ['Moves', INFO.moves],
          ['Line yield', INFO.yield],
        ]}
      >
        <Stat
          label="Wafer outs"
          value={fmtInt(k.waferOuts)}
          unit="wafers"
          accent={COLOR.brandSurfaceDefaultPrimary}
          hint={INFO.outs}
          sub={`${fmtInt(k.lotOuts)} lots · ${perDay(k.waferOuts)}`}
        />
        <Stat
          label="Moves"
          value={fmtInt(k.moves)}
          accent={COLOR.brandSurfaceDefaultPrimary}
          hint={INFO.moves}
          sub={`${fmtInt(k.waferMoves)} wafer moves`}
        />
        <Stat
          label="Line yield"
          value={fmtPct(k.lineYield, 2)}
          accent={accent(k.lineYield)}
          hint={INFO.yield}
          sub={`${fmtInt(k.waferStarts)} wafers started`}
        />
      </KpiCard>

      <KpiCard
        title="Flow"
        section="flow"
        info={[
          ['WIP', INFO.wip],
          ['Cycle time', INFO.cycle],
          ['Transport', INFO.transport],
        ]}
      >
        <Stat
          label="WIP"
          value={fmtInt(k.wipLots)}
          unit="lots"
          accent={k.holdLots ? COLOR.conditionWarningPrimary : COLOR.accentInfoPrimary}
          hint={INFO.wip}
          sub={`${fmtInt(k.wipWafers)} wafers${k.holdLots ? ` · ${k.holdLots} on hold` : ''}`}
        />
        <Stat
          label="Cycle time"
          value={fmtDec(k.cycleTimeDays)}
          unit="days"
          accent={COLOR.accentInfoPrimary}
          hint={INFO.cycle}
          sub={`X-factor ${fmtDec(k.xFactor, 2)} · on time ${fmtPct(k.onTime, 0)}`}
        />
        <Stat
          label="Transport"
          value={fmtDec(k.transportMin)}
          unit="min"
          accent={COLOR.accentInfoPrimary}
          hint={INFO.transport}
          sub={`${fmtInt(k.transfers)} transfers · OHT busy ${fmtPct(k.ohtUtil, 0)}`}
        />
      </KpiCard>
    </div>
  );
};
