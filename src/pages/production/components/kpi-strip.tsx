import { COLOR } from '@digital-twin/components';

import type { ProductionOverview } from '../api/production.api';
import styles from '../production.module.scss';
import { fmtDec, fmtInt, fmtPct, rating } from '../production.utils';
import { RATING_COLOR, Tile } from './shared';

const accent = (v: number | null, kind: 'oee' | 'factor' = 'factor') => {
  const r = rating(v, kind);
  return r ? RATING_COLOR[r] : COLOR.borderLight;
};

const INFO = {
  oee: 'SEMI E79: availability × operational × rate × quality efficiency, time-weighted over the 28 production tools (good time / operations time).',
  availability:
    'Up time (productive + standby) over operations time (total time minus non-scheduled time).',
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

/** Headline numbers of the module for the window */
export const KpiStrip = ({ data, isError }: { data?: ProductionOverview; isError: boolean }) => {
  if (!data) {
    const v = isError ? 'n/a' : '…';
    return (
      <div className={styles.strip} aria-busy={!isError}>
        {[
          'OEE',
          'Availability',
          'Utilization',
          'Rate',
          'Quality',
          'Wafer outs',
          'Moves',
          'WIP',
          'Cycle time',
          'Line yield',
          'Transport',
        ].map((t) => (
          <Tile key={t} title={t} value={v} accent={COLOR.borderLight} />
        ))}
      </div>
    );
  }
  const k = data.kpi;
  const hours = data.window.hours;
  const perDay = (n: number) =>
    hours >= 24 ? `${fmtInt((n * 24) / hours)} / day` : `${fmtInt((n * 12) / hours)} / shift`;
  return (
    <div className={styles.strip}>
      <Tile
        title="OEE"
        value={fmtPct(k.oee)}
        accent={accent(k.oee, 'oee')}
        info={INFO.oee}
        sub={`${k.tools} production tools`}
      />
      <Tile
        title="Availability"
        value={fmtPct(k.availability)}
        accent={accent(k.availability)}
        info={INFO.availability}
        sub={`Uptime ${fmtPct(k.uptime)}`}
      />
      <Tile
        title="Utilization"
        value={fmtPct(k.utilization)}
        accent={COLOR.accentInfoPrimary}
        info={INFO.utilization}
        sub={`Operational eff. ${fmtPct(k.operational)}`}
      />
      <Tile title="Rate" value={fmtPct(k.rate)} accent={accent(k.rate)} info={INFO.rate} />
      <Tile
        title="Quality"
        value={fmtPct(k.quality)}
        accent={accent(k.quality)}
        info={INFO.quality}
        sub={`${fmtInt(k.scrapWafers)} scrapped · ${fmtInt(k.reworkWafers)} reworked`}
      />
      <Tile
        title="Wafer outs"
        value={fmtInt(k.waferOuts)}
        unit="wafers"
        accent={COLOR.brandSurfaceDefaultPrimary}
        info={INFO.outs}
        sub={`${fmtInt(k.lotOuts)} lots · ${perDay(k.waferOuts)}`}
      />
      <Tile
        title="Moves"
        value={fmtInt(k.moves)}
        accent={COLOR.brandSurfaceDefaultPrimary}
        info={INFO.moves}
        sub={`${fmtInt(k.waferMoves)} wafer moves`}
      />
      <Tile
        title="WIP"
        value={fmtInt(k.wipLots)}
        unit="lots"
        accent={k.holdLots ? COLOR.conditionWarningPrimary : COLOR.accentInfoPrimary}
        info={INFO.wip}
        sub={`${fmtInt(k.wipWafers)} wafers${k.holdLots ? ` · ${k.holdLots} on hold` : ''}`}
      />
      <Tile
        title="Cycle time"
        value={fmtDec(k.cycleTimeDays)}
        unit="days"
        accent={COLOR.accentInfoPrimary}
        info={INFO.cycle}
        sub={`X-factor ${fmtDec(k.xFactor, 2)} · on time ${fmtPct(k.onTime, 0)}`}
      />
      <Tile
        title="Line yield"
        value={fmtPct(k.lineYield, 2)}
        accent={accent(k.lineYield)}
        info={INFO.yield}
        sub={`${fmtInt(k.waferStarts)} wafers started (${fmtInt(k.lotStarts)} lots)`}
      />
      <Tile
        title="Transport"
        value={fmtDec(k.transportMin)}
        unit="min"
        accent={COLOR.accentInfoPrimary}
        info={INFO.transport}
        sub={`${fmtInt(k.transfers)} transfers · ${k.vehicles} OHT busy ${fmtPct(k.ohtUtil, 0)}`}
      />
    </div>
  );
};
