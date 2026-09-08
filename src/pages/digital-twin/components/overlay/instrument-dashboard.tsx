import { Badge, CONDITION_COLOR, ConditionEnum, Dropdown } from '@digital-twin/components';
import { format } from 'date-fns';
import { useState } from 'react';

import { TwinAsset } from '../../api/digital-twin.api';
import { formatParamValue } from '../../digital-twin.live';
import { useTwinParameters, useTwinTrend } from '../../digital-twin.queries';
import { useTwinNow, useTwinSource } from '../../digital-twin.source';
import { CardTabPanel, CardTabs } from './card-tabs';
import { ControlPanel, controlGroups } from './control-panel';
import styles from './overlay.module.scss';
import { SpcChart, TrendChart } from './overlay-charts';
import { fmt, SPC_RULE_LABEL, timeAgo, titleCase } from './overlay-utils';
import { Empty, SectionTitle, stateBadgeColor } from './twin-ui';

const WINDOWS = [
  { value: '60', label: 'Last 1 h' },
  { value: '480', label: 'Last 8 h' },
  { value: '1440', label: 'Last 24 h' },
];
/** rule violations listed (the title counts all of them) */
const VIOLATION_ROWS = 4;
const CHART_HEIGHT = 200;

const SPC_INFO =
  'Individuals chart of the samples taken while the unit was running (stopped stretches are ' +
  'shaded and left out). Without configured limits, the limits come from the window: points ' +
  'beyond 3σ are dropped and the mean and σ recomputed.';

type InstrumentDashboardProps = {
  asset: TwinAsset;
  paramAlias: string;
  tag: string;
  partName: string;
  onEquipmentClick?: () => void;
};

const limitText = (lower: number | null, upper: number | null, unit: string) => {
  if (lower !== null && upper !== null) return `${lower} – ${upper} ${unit}`;
  if (upper !== null) return `> ${upper} ${unit}`;
  if (lower !== null) return `< ${lower} ${unit}`;
  return 'Not set';
};

/** label / value pairs */
const Facts = ({ rows }: { rows: [string, string][] }) => (
  <dl className={styles.facts}>
    {rows.map(([label, value]) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

export const InstrumentDashboard = ({
  asset,
  paramAlias,
  tag,
  partName,
  onEquipmentClick,
}: InstrumentDashboardProps) => {
  /** replaying a simulation: the value is the playhead's, trends end at the settled playhead */
  const replay = !!useTwinSource().replay;
  const now = useTwinNow(1000);
  const [minutes, setMinutes] = useState(60);
  const [tab, setTab] = useState('trend');
  const { data: params, isLoading: isParamsLoading } = useTwinParameters(asset.id);
  const param = params?.find((p) => p.alias === paramAlias);
  /** set points / modes that drive this instrument's parameter (e.g. a fan's speed) */
  const hasControls = controlGroups(params ?? [], paramAlias).length > 0;
  const {
    data: trend,
    isLoading: isTrendLoading,
    at: trendAt,
  } = useTwinTrend(asset, param, minutes);

  const condition = (param?.condition ?? ConditionEnum.enum.OFFLINE) as ConditionEnum;
  const color = CONDITION_COLOR[condition];
  const unit = param?.unit ?? '';
  const latestViolations = [...(trend?.violations ?? [])].reverse().slice(0, VIOLATION_ROWS);
  // SPC uses running samples only; `excluded` counts the samples taken while the unit was stopped
  const excluded = trend?.stats.excluded ?? 0;
  const hasLimits = !!trend && trend.spc.centerLine !== null;
  let spcEmpty = 'Not enough data for control limits';
  if (isTrendLoading) spcEmpty = 'Loading…';
  else if (excluded > 0) spcEmpty = 'Not enough running samples for control limits';

  const tabs = [
    { value: 'trend', label: 'Trend' },
    { value: 'spc', label: 'SPC' },
    ...(hasControls ? [{ value: 'control', label: 'Control' }] : []),
  ];
  const shownTab = tabs.some((t) => t.value === tab) ? tab : 'trend';
  const withUnit = (v: string) => (v === '--' || !unit ? v : `${v} ${unit}`);

  return (
    <div className={styles.dash}>
      <header className={styles.dash__header}>
        <div className={styles.dash__titles}>
          <span className={styles.dash__kicker}>
            <Badge color="secondary" className={styles.badge}>
              {tag}
            </Badge>
            Instrument
          </span>
          <strong className={styles.dash__title}>{param?.name ?? paramAlias}</strong>
          <span className={styles.dash__sub}>
            {partName} ·{' '}
            <button type="button" className={styles.dash__link} onClick={onEquipmentClick}>
              {asset.name}
            </button>
          </span>
        </div>
      </header>

      {!param && !isParamsLoading ? (
        <Empty>
          Parameter “{paramAlias}” is not configured on {asset.name}.
        </Empty>
      ) : (
        <>
          <div className={styles.reading} style={{ borderLeftColor: color }}>
            <div className={styles.reading__value}>
              <strong style={{ color }}>
                {formatParamValue(param)}
                {unit ? <small>{unit}</small> : null}
              </strong>
              <span>
                {replay ? 'At the playhead' : 'Live'} · {timeAgo(param?.timestamp, now)}
              </span>
            </div>
            <div className={styles.reading__meta}>
              <Badge color={stateBadgeColor(condition)} className={styles.badge}>
                {titleCase(condition)}
              </Badge>
            </div>
          </div>

          <CardTabs
            tabs={tabs}
            value={shownTab}
            onChange={setTab}
            extra={
              shownTab === 'control' ? null : (
                <Dropdown
                  value={String(minutes)}
                  options={WINDOWS}
                  onChange={(v) => setMinutes(Number(v))}
                  variant="small"
                  background="dark"
                  wrapperStyles={{ width: 124 }}
                />
              )
            }
          >
            <CardTabPanel value="trend">
              <section className={styles.section}>
                <SectionTitle title="Trend">
                  {replay && trendAt ? (
                    <Badge color="abnormal" className={styles.badge}>
                      to {format(trendAt, 'dd MMM HH:mm')}
                    </Badge>
                  ) : null}
                </SectionTitle>
                {trend?.data.length ? (
                  <div className={styles.chart}>
                    <TrendChart
                      points={trend.data}
                      unit={unit}
                      warning={trend.warning}
                      critical={trend.critical}
                      height={CHART_HEIGHT}
                    />
                  </div>
                ) : (
                  <Empty>{isTrendLoading ? 'Loading…' : 'No data in this window'}</Empty>
                )}
                <Facts
                  rows={[
                    [
                      'Warning',
                      param ? limitText(param.warning.lower, param.warning.upper, unit) : '--',
                    ],
                    [
                      'Critical',
                      param ? limitText(param.critical.lower, param.critical.upper, unit) : '--',
                    ],
                    ['Min', withUnit(fmt(trend?.stats.min))],
                    ['Max', withUnit(fmt(trend?.stats.max))],
                  ]}
                />
              </section>
            </CardTabPanel>

            <CardTabPanel value="spc">
              <section className={styles.section}>
                <SectionTitle title="Individuals chart" info={SPC_INFO}>
                  {trend?.spc.computed ? (
                    <Badge color="secondary" className={styles.badge}>
                      Limits from window
                    </Badge>
                  ) : null}
                </SectionTitle>
                {trend && hasLimits ? (
                  <div className={styles.chart}>
                    <SpcChart
                      points={trend.data}
                      spc={trend.spc}
                      violations={trend.violations}
                      unit={unit}
                      height={CHART_HEIGHT}
                    />
                  </div>
                ) : (
                  <Empty>{spcEmpty}</Empty>
                )}
                {trend ? (
                  // control values (in-control baseline) beside the raw window values
                  <Facts
                    rows={[
                      ['CL', fmt(trend.spc.centerLine)],
                      ['Mean', fmt(trend.stats.mean)],
                      ['UCL', fmt(trend.spc.ucl)],
                      ['LCL', fmt(trend.spc.lcl)],
                      ['σ control', fmt(trend.spc.sigma, 3)],
                      ['σ', fmt(trend.stats.stdDev, 3)],
                      ['Cp', fmt(trend.stats.cp)],
                      ['Cpk', fmt(trend.stats.cpk)],
                      [
                        'Points',
                        excluded > 0
                          ? `${trend.stats.count} (${excluded} not running)`
                          : String(trend.stats.count),
                      ],
                    ]}
                  />
                ) : null}
              </section>

              <section className={styles.section}>
                <SectionTitle title="Rule violations">
                  {trend?.violations.length ? (
                    <Badge color="critical" className={styles.badge}>
                      {trend.violations.length}
                    </Badge>
                  ) : null}
                </SectionTitle>
                {latestViolations.length ? (
                  <ul className={styles.list}>
                    {latestViolations.map((v) => (
                      <li key={v.timestamp}>
                        <i style={{ background: CONDITION_COLOR.CRITICAL }} />
                        <div className={styles.list__body}>
                          <strong>{v.rules.map((r) => SPC_RULE_LABEL[r] ?? r).join(' · ')}</strong>
                          <span>
                            {v.value.toFixed(3)} {unit}
                          </span>
                        </div>
                        <time>{format(Date.parse(v.timestamp), 'HH:mm')}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>{trend && !hasLimits ? 'No control limits' : 'Process in control'}</Empty>
                )}
              </section>
            </CardTabPanel>

            {hasControls ? (
              <CardTabPanel value="control">
                <ControlPanel asset={asset} params={params} target={paramAlias} historyRows={3} />
              </CardTabPanel>
            ) : null}
          </CardTabs>
        </>
      )}
    </div>
  );
};
