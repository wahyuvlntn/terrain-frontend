import { Column, InfoTooltip, Table } from '@digital-twin/components';
import { useQuery } from '@tanstack/react-query';
import { ReactNode } from 'react';

import { getFaultCatalog, SIM_QUERY, SimJobDetail, SimSpecView } from '../api/simulation.api';
import { tagOf } from '../simulation.catalog';
import styles from '../simulation.module.scss';
import { actionWhat } from './action-text';
import { durationText, Empty, fmtTime, offsetText, signed } from './job-bits';

const Fact = ({ label, value, info }: { label: string; value: ReactNode; info?: string }) => (
  <div className={styles.fact}>
    <span className={styles.fact__label}>
      {label}
      {info ? <InfoTooltip title={label} content={info} /> : null}
    </span>
    <span className={styles.fact__value}>{value}</span>
  </div>
);

const ACTION_COLUMNS: Column[] = [
  { key: 'at', name: 'At', width: 80 },
  { key: 'variant', name: 'Variant', width: 150 },
  { key: 'asset', name: 'Equipment', width: 110 },
  { key: 'what', name: 'Action' },
];

/** What the run simulates: window, starting state, conditions, and the actions of each variant */
export const JobScenario = ({ job }: { job: SimJobDetail }) => {
  const { data: catalog } = useQuery({
    queryKey: SIM_QUERY.faultCatalog,
    queryFn: getFaultCatalog,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  const spec: SimSpecView | null = job.spec;
  if (!spec) return <Empty error>The scenario of this job could not be read</Empty>;
  if (job.kind === 'production') {
    const raw = (job.rawSpec ?? {}) as {
      horizon_days?: number;
      initial?: string;
      breakdowns?: boolean;
      variants?: {
        name: string;
        plan?: Record<string, unknown>;
        actions?: Record<string, unknown>[];
      }[];
    };
    return (
      <div className={styles.scenario}>
        <div className={styles.facts}>
          <Fact label="Horizon" value={`${raw.horizon_days ?? '--'} days`} />
          <Fact
            label="Start from"
            value={raw.initial === 'nominal' ? 'Nominal fab' : 'The fab as it was'}
          />
          <Fact label="Breakdowns" value={raw.breakdowns === false ? 'None' : 'Usual rate'} />
        </div>
        {(raw.variants ?? []).map((v) => {
          const p = (v.plan ?? {}) as {
            starts_per_day?: number;
            mix?: Record<string, number>;
            hot_share?: number;
            dispatch?: string;
            furnace_wait_h?: number;
            furnace_min_lots?: number;
            vehicles?: number;
          };
          return (
            <div key={v.name} className={styles.facts}>
              <Fact label="Plan" value={v.name} />
              <Fact label="Lot starts" value={`${p.starts_per_day ?? '--'} / day`} />
              <Fact
                label="Mix"
                value={
                  Object.entries(p.mix ?? {})
                    .map(([k, x]) => `${k} ${Math.round(100 * x)} %`)
                    .join(' · ') || 'Standard'
                }
              />
              <Fact label="Hot lots" value={`${Math.round(100 * (p.hot_share ?? 0))} %`} />
              <Fact label="Dispatch" value={p.dispatch ?? 'FIFO'} />
              <Fact
                label="Furnaces"
                value={`${p.furnace_min_lots ?? '--'} lots or ${p.furnace_wait_h ?? '--'} h`}
              />
              {p.vehicles ? <Fact label="OHT vehicles" value={String(p.vehicles)} /> : null}
              <Fact
                label="Tool changes"
                value={
                  (v.actions ?? [])
                    .map((a) =>
                      a.kind === 'tool_down'
                        ? `${String(a.asset).replace(/_/g, '-')} down day ${a.at_day} for ${a.duration_h} h`
                        : `+${a.count} × ${String(a.asset).replace(/_/g, '-')}`
                    )
                    .join(' · ') || 'None'
                }
              />
            </div>
          );
        })}
      </div>
    );
  }
  if (job.kind === 'doe') {
    return (
      <div className={styles.facts}>
        <Fact
          label="Design of experiments"
          value={`${spec.samples ?? '--'} samples`}
          info="Samples of set points × weather × load"
        />
      </div>
    );
  }
  const start = spec.start ?? job.simStart;
  const actions = [
    ...(spec.actions ?? []).map((a) => ({ a, variant: 'All variants' })),
    ...(spec.variants ?? []).flatMap((v) => (v.actions ?? []).map((a) => ({ a, variant: v.name }))),
  ].sort((x, y) => x.a.at_min - y.a.at_min);

  return (
    <div className={styles.scenario}>
      <div className={styles.facts}>
        <Fact label="Start" value={start ? fmtTime(start, 'dd MMM yyyy HH:mm') : 'When it runs'} />
        <Fact label="Length" value={durationText(spec.duration_min)} />
        <Fact
          label="Starting state"
          value={spec.initial === 'nominal' ? 'Nominal' : 'Live plant'}
          info="Live: the plant's current controls, faults and trips. Nominal: default controls, no faults."
        />
        <Fact
          label="Random events"
          value={spec.stochastic ? 'On' : 'Off'}
          info="Random faults, trips and communication loss during the run"
        />
        <Fact
          label="Weather"
          value={`${signed(spec.weather?.dry_bulb_offset ?? 0, '°C')} / ${signed(
            spec.weather?.wet_bulb_offset ?? 0,
            '°C'
          )}`}
          info="Dry bulb / wet bulb offset from the recorded weather"
        />
        <Fact label="Cooling load" value={`× ${(spec.load_scale ?? 1).toFixed(2)}`} />
        <Fact label="Seed" value={spec.seed ? spec.seed : 'From job id'} />
        <Fact
          label="Variants"
          value={(spec.variants ?? []).map((v) => v.name).join(', ') || '--'}
        />
      </div>

      <h3 className={styles.section__title}>
        Actions
        <InfoTooltip
          title="Actions"
          content="Scheduled from the start of the run. Every variant runs from the same state and seed."
        />
      </h3>
      {actions.length ? (
        <Table
          columns={ACTION_COLUMNS}
          rows={actions.map(({ a, variant }, i) => ({
            id: String(i),
            at: offsetText(a.at_min),
            variant,
            asset: tagOf(a.asset),
            what: <span title={actionWhat(a, catalog)}>{actionWhat(a, catalog)}</span>,
          }))}
        />
      ) : (
        <Empty>No actions: every variant runs the plant as it is</Empty>
      )}
    </div>
  );
};
