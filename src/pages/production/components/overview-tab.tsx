import { Container, InfoTooltip, Loading } from '@digital-twin/components';
import {
  BarChart,
  ChartLine,
  MachineDetails,
  ParetoChart,
  StackBarChart,
} from '@digital-twin/icons';
import { useQuery } from '@tanstack/react-query';

import {
  getTrend,
  PRODUCTION_POLL,
  PRODUCTION_QUERY,
  ProductionOverview,
  ProductionTool,
} from '../api/production.api';
import styles from '../production.module.scss';
import { fmtDec, fmtInt, fmtPct, trendDays } from '../production.utils';
import {
  CycleChart,
  LineProfile,
  LossWaterfall,
  OeeTrend,
  OutputChart,
  WipChart,
} from './overview-charts';
import { Empty } from './shared';
import { ToolTable } from './tool-table';

const LOSS_INFO =
  'Where the tool time went (SEMI E10 / E79), summed over the production tools: non-scheduled, scheduled down (preventive maintenance, calibrations, monitor wafers, consumable changes such as pads, targets, anodes, ion sources, tube cleans), unscheduled down (trips, assists, engineering holds, dry pump / scrubber / process chiller interlocks), standby (no lot to run), rate loss (slower runs, chambers in clean, part-filled batches), quality loss (scrapped and reworked wafers) and the good time left.';

const PRODUCT_INFO =
  'The two products of the 40 nm line, modelled on real chips: a Cortex-M0+ class microcontroller (cf. Raspberry Pi RP2040, 1P6M, 33 masks) and a Wi-Fi / Bluetooth SoC (cf. Espressif ESP32 class, 1P8M with thick RF metals, MIM capacitor, 39 masks). Cycle time from lot start to fab out, per mask layer and as X-factor (cycle time / raw process time); on time = completed by the planned date.';

const LINE_INFO =
  'Lots by the mask layer or module of their current step, from wafer start (left) to the wafer acceptance test (right). A lot passes every layer once; a hump shows where lots pile up.';

type OverviewTabProps = {
  hours: number;
  overview?: ProductionOverview;
  overviewLoading: boolean;
  tools: ProductionTool[];
  toolsLoading: boolean;
  now: number;
  canViewTwin: boolean;
};

/** Losses, OEE trend, output, WIP by step and the tool table */
export const OverviewTab = ({
  hours,
  overview,
  overviewLoading,
  tools,
  toolsLoading,
  now,
  canViewTwin,
}: OverviewTabProps) => {
  const days = trendDays(hours);
  const trend = useQuery({
    queryKey: PRODUCTION_QUERY.trend({ days }),
    queryFn: () => getTrend({ days }),
    refetchInterval: PRODUCTION_POLL.trend,
    meta: { toastId: 'productionTrend' },
  });
  return (
    <div className={styles.scroll}>
      <div className={styles.grid2}>
        <Container
          title="OEE losses"
          icon={<ParetoChart />}
          titleSuffixIcon={<InfoTooltip title="OEE losses" content={LOSS_INFO} />}
          background="none"
          className={styles.panel}
          contentWrapperProps={{ style: { position: 'relative', overflow: 'hidden' } }}
        >
          <Loading isLoading={overviewLoading && !overview} />
          {overview ? (
            <LossWaterfall losses={overview.losses} />
          ) : (
            <Empty>{overviewLoading ? 'Loading…' : 'No data'}</Empty>
          )}
        </Container>
        <Container
          title={`OEE trend (${days} days)`}
          icon={<ChartLine />}
          background="none"
          className={styles.panel}
          contentWrapperProps={{ style: { position: 'relative', overflow: 'hidden' } }}
        >
          <Loading isLoading={trend.isLoading} />
          {trend.data?.points.length ? (
            <OeeTrend trend={trend.data} />
          ) : (
            <Empty>{trend.isLoading ? 'Loading…' : 'No data'}</Empty>
          )}
        </Container>
        <Container
          title="Wafer outs and moves per day"
          icon={<BarChart />}
          background="none"
          className={styles.panel}
          contentWrapperProps={{ style: { position: 'relative', overflow: 'hidden' } }}
        >
          {trend.data?.points.length ? (
            <OutputChart trend={trend.data} />
          ) : (
            <Empty>{trend.isLoading ? 'Loading…' : 'No data'}</Empty>
          )}
        </Container>
        <Container
          title="WIP by process area"
          icon={<StackBarChart />}
          background="none"
          className={styles.panel}
          contentWrapperProps={{ style: { position: 'relative', overflow: 'hidden' } }}
        >
          {overview ? (
            <WipChart wip={overview.wipByArea} />
          ) : (
            <Empty>{overviewLoading ? 'Loading…' : 'No data'}</Empty>
          )}
        </Container>
        <Container
          title={`Cycle time and WIP (${days} days)`}
          icon={<ChartLine />}
          background="none"
          className={styles.panel}
          contentWrapperProps={{ style: { position: 'relative', overflow: 'hidden' } }}
        >
          {trend.data?.points.length ? (
            <CycleChart trend={trend.data} />
          ) : (
            <Empty>{trend.isLoading ? 'Loading…' : 'No data'}</Empty>
          )}
        </Container>
        <Container
          title="Line profile (WIP by mask layer)"
          icon={<StackBarChart />}
          titleSuffixIcon={<InfoTooltip title="Line profile" content={LINE_INFO} />}
          background="none"
          className={styles.panel}
          contentWrapperProps={{ style: { position: 'relative', overflow: 'hidden' } }}
        >
          {overview?.wipByLayer.length ? (
            <LineProfile wip={overview.wipByLayer} />
          ) : (
            <Empty>{overviewLoading ? 'Loading…' : 'No data'}</Empty>
          )}
        </Container>
      </div>
      <Container
        title="Products"
        icon={<BarChart />}
        titleSuffixIcon={<InfoTooltip title="Products" content={PRODUCT_INFO} />}
        background="none"
        className={styles.panel}
        contentWrapperProps={{ style: { position: 'relative', overflow: 'auto' } }}
      >
        {overview?.products.length ? (
          <table className={styles.steps}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Masks</th>
                <th>Lots out</th>
                <th>Wafers out</th>
                <th>WIP lots</th>
                <th>Cycle time</th>
                <th>Days / mask</th>
                <th>X-factor</th>
                <th>Planned</th>
                <th>On time</th>
                <th>Line yield</th>
              </tr>
            </thead>
            <tbody>
              {overview.products.map((p) => (
                <tr key={p.productCode}>
                  <td title={p.name}>
                    <b>{p.productCode}</b> <span className={styles.muted}>{p.name}</span>
                  </td>
                  <td>{p.masks}</td>
                  <td>{fmtInt(p.lotOuts)}</td>
                  <td>{fmtInt(p.waferOuts)}</td>
                  <td>{fmtInt(p.wipLots)}</td>
                  <td>{p.cycleTimeDays !== null ? `${fmtDec(p.cycleTimeDays)} d` : '--'}</td>
                  <td>{fmtDec(p.daysPerMask, 2)}</td>
                  <td>{fmtDec(p.xFactor, 2)}</td>
                  <td>
                    {p.plannedCycleDays !== null ? `${fmtDec(p.plannedCycleDays, 0)} d` : '--'}
                  </td>
                  <td>{fmtPct(p.onTime, 0)}</td>
                  <td>{fmtPct(p.lineYield, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>{overviewLoading ? 'Loading…' : 'No lots completed in the window'}</Empty>
        )}
      </Container>
      <Container
        title="Production tools"
        icon={<MachineDetails />}
        background="none"
        className={styles.panel}
        contentWrapperProps={{ style: { position: 'relative', overflow: 'auto' } }}
      >
        <Loading isLoading={toolsLoading && !tools.length} />
        <ToolTable tools={tools} now={now} canViewTwin={canViewTwin} />
      </Container>
    </div>
  );
};
