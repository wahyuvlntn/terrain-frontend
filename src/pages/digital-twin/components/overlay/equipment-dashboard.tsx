import {
  Badge,
  Button,
  CONDITION_COLOR,
  CONDITION_ICON,
  ConditionEnum,
  Dropdown,
  STATUS_COLOR,
  STATUS_ICON,
  StatusEnum,
} from '@digital-twin/components';
import { Flowsheet } from '@digital-twin/icons';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ReactNode, useState } from 'react';

import { TwinAsset, TwinAssetSummary } from '../../api/digital-twin.api';
import { PLANT_SYSTEM_TYPE } from '../../digital-twin.bms';
import { formatParamValue } from '../../digital-twin.live';
import { useTwinParameters, useTwinSummary, useTwinToolActivity } from '../../digital-twin.queries';
import { useTwinNow, useTwinSource } from '../../digital-twin.source';
import { CardTabPanel, CardTabs } from './card-tabs';
import { ControlPanel } from './control-panel';
import styles from './overlay.module.scss';
import { formatElapsed, timeAgo, titleCase } from './overlay-utils';
import { PROCESS_WINDOWS, ToolProcess } from './tool-process';
import { Empty, SectionTitle, stateBadgeColor, TwinMetric } from './twin-ui';

const HOURS = 24;
const STATUS_PARAMS = ['running', 'trip', 'maint_mode'];
/** rows of the alarm and maintenance lists */
const ROWS = 5;

const statusColor = (v: string) =>
  STATUS_COLOR[v as StatusEnum] ?? CONDITION_COLOR[v as ConditionEnum] ?? 'transparent';

const Timeline = ({
  summary,
  intervals,
  label,
  thin,
}: {
  summary: TwinAssetSummary;
  intervals: TwinAssetSummary['statuses'];
  label: string;
  thin?: boolean;
}) => {
  const from = Date.parse(summary.from);
  const span = Date.parse(summary.to) - from || 1;
  return (
    <div className={styles.timeline}>
      <span className={styles.timeline__label}>{label}</span>
      <div className={clsx(styles.timeline__bar, thin && styles['timeline__bar--thin'])}>
        {intervals.map((iv) => {
          const start = Date.parse(iv.start);
          const end = Date.parse(iv.end);
          return (
            <span
              key={`${iv.start}-${iv.value}`}
              style={{
                left: `${((start - from) / span) * 100}%`,
                width: `${Math.max(((end - start) / span) * 100, 0.3)}%`,
                background: statusColor(iv.value),
              }}
              title={`${titleCase(iv.value)} · ${format(start, 'dd MMM HH:mm')} – ${format(end, 'HH:mm')}`}
            />
          );
        })}
      </div>
    </div>
  );
};

/** Status or condition with its icon and how long it has lasted */
const StateTile = ({
  label,
  value,
  icon,
  since,
}: {
  label: string;
  value: string | null;
  icon: ReactNode;
  since: string;
}) => (
  <div className={styles.state}>
    <span className={styles.state__label}>{label}</span>
    <Badge color={stateBadgeColor(value)} leftIcon={icon} className={styles.badge}>
      {titleCase(value)}
    </Badge>
    <span className={styles.state__since}>for {since}</span>
  </div>
);

type EquipmentDashboardProps = {
  asset: TwinAsset;
  onParameterClick?: (alias: string) => void;
  hasInstrument?: (alias: string) => boolean;
  /** opens the BMS plant overview (shown for the CHW plant controller) */
  onPlantOverview?: () => void;
};

export const EquipmentDashboard = ({
  asset,
  onParameterClick,
  hasInstrument,
  onPlantOverview,
}: EquipmentDashboardProps) => {
  /** replaying a simulation: the windows end at the playhead and cover the run only */
  const replay = !!useTwinSource().replay;
  const now = useTwinNow(1000);
  const { data: summary, isLoading } = useTwinSummary(asset, HOURS);
  const { data: params } = useTwinParameters(asset.id);
  /** a FAB1 process tool: what it runs now and lately (live only) */
  const activity = useTwinToolActivity(asset.id);
  const tool = activity?.tool ? activity : undefined;
  /** the tab picked; a tool opens on its process, other equipment on the overview */
  const [tab, setTab] = useState<string | null>(null);
  const [processHours, setProcessHours] = useState(PROCESS_WINDOWS[0]);

  // the asset list is polled more often than the summary: prefer its live status
  const status = asset.status ?? summary?.status ?? null;
  const statusSince = asset.statusStartTime ?? summary?.statusStartTime ?? null;
  const condition = asset.condition ?? summary?.condition ?? null;
  const conditionSince = asset.conditionStartTime ?? summary?.conditionStartTime ?? null;
  // set points and control modes are operated in the Controls tab
  const live = (params ?? []).filter(
    (p) => !STATUS_PARAMS.includes(p.alias) && p.dataType === 'number' && !p.control
  );
  const hasControls = (params ?? []).some((p) => p.control);
  const tabs = [
    ...(tool ? [{ value: 'process', label: 'Process' }] : []),
    { value: 'overview', label: 'Overview' },
    ...(hasControls ? [{ value: 'controls', label: 'Controls' }] : []),
    { value: 'parameters', label: 'Parameters' },
    { value: 'activity', label: 'Activity' },
  ];
  // the controls tab of an equipment that has none (yet) shows the overview
  const shownTab = tab && tabs.some((t) => t.value === tab) ? tab : tool ? 'process' : 'overview';

  // a replay at the start of its run has no window yet
  const uptime = (u: TwinAssetSummary['uptimeWindow'] | undefined) =>
    u && !(replay && u.totalHours === 0) ? u.uptime.toFixed(1) : '--';
  const warnings = summary?.warningCounts ?? 0;
  const criticals = summary?.criticalCounts ?? 0;
  const tag = asset.alias.replace('_', '-');

  return (
    <div className={styles.dash}>
      <header className={styles.dash__header}>
        {summary?.image ? <img className={styles.dash__thumb} src={summary.image} alt="" /> : null}
        <div className={styles.dash__titles}>
          <span className={styles.dash__kicker}>
            <Badge color="secondary" className={styles.badge}>
              {tag}
            </Badge>
            {asset.typeName}
          </span>
          <strong className={styles.dash__title}>{asset.name}</strong>
          <span className={styles.dash__sub} title={summary?.location}>
            {asset.modelName}
            {summary?.location ? ` · ${summary.location}` : ''}
          </span>
          {onPlantOverview && asset.typeName === PLANT_SYSTEM_TYPE ? (
            <div className={styles.dash__actions}>
              <Button
                color="default-secondary"
                icon={<Flowsheet />}
                className={styles.btn}
                onClick={onPlantOverview}
              >
                Plant overview
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <div className={styles.states}>
        <StateTile
          label="Status"
          value={status}
          icon={STATUS_ICON[(status ?? StatusEnum.enum.OFFLINE) as StatusEnum]}
          since={formatElapsed(statusSince, now)}
        />
        <StateTile
          label="Condition"
          value={condition}
          icon={CONDITION_ICON[(condition ?? ConditionEnum.enum.OFFLINE) as ConditionEnum]}
          since={formatElapsed(conditionSince, now)}
        />
      </div>

      <CardTabs
        tabs={tabs}
        value={shownTab}
        onChange={setTab}
        extra={
          shownTab === 'process' ? (
            <Dropdown
              value={String(processHours)}
              options={PROCESS_WINDOWS.map((h) => ({ value: String(h), label: `Last ${h} h` }))}
              onChange={(v) => setProcessHours(Number(v))}
              variant="small"
              background="dark"
              wrapperStyles={{ width: 124 }}
            />
          ) : null
        }
      >
        {tool ? (
          <CardTabPanel value="process">
            <ToolProcess activity={tool} now={now} hours={processHours} />
          </CardTabPanel>
        ) : null}

        <CardTabPanel value="overview">
          <div className={styles.kpis}>
            <TwinMetric
              title={replay ? 'Uptime (window)' : `Uptime ${HOURS} h`}
              value={uptime(summary?.uptimeWindow)}
              unit="%"
            />
            <TwinMetric
              title={replay ? 'Uptime (run)' : 'Uptime 7 d'}
              value={uptime(summary?.uptime7d)}
              unit="%"
            />
            <TwinMetric
              title={replay ? 'Run hours (sim)' : 'Running hours'}
              value={summary ? summary.runningHours.toFixed(replay ? 1 : 0) : '--'}
              unit="h"
            />
            <TwinMetric
              title={replay ? 'Alarms (window)' : `Alarms ${HOURS} h`}
              value={summary ? `${warnings} / ${criticals}` : '--'}
              unit="W / C"
              tone={
                criticals > 0
                  ? CONDITION_COLOR.CRITICAL
                  : warnings > 0
                    ? CONDITION_COLOR.WARNING
                    : null
              }
              hint={`${warnings} warning, ${criticals} critical`}
            />
          </div>

          <section className={styles.section}>
            <SectionTitle title={replay ? 'Status history · run' : `Status history · ${HOURS} h`} />
            {summary ? (
              <>
                <Timeline summary={summary} intervals={summary.statuses} label="Status" />
                <Timeline summary={summary} intervals={summary.conditions} label="Condition" thin />
                {/* a replay's window runs from the start of the run (at most 24 h back) to the
                    playhead */}
                <div className={styles.timeline__axis}>
                  <span>{format(Date.parse(summary.from), 'HH:mm')}</span>
                  <span>
                    {format(
                      replay
                        ? (Date.parse(summary.from) + Date.parse(summary.to)) / 2
                        : Date.parse(summary.from) + (HOURS / 2) * 3600e3,
                      'HH:mm'
                    )}
                  </span>
                  <span>{replay ? format(Date.parse(summary.to), 'HH:mm') : 'now'}</span>
                </div>
              </>
            ) : (
              <Empty>{isLoading ? 'Loading…' : 'No data'}</Empty>
            )}
          </section>
        </CardTabPanel>

        {hasControls ? (
          <CardTabPanel value="controls">
            <ControlPanel asset={asset} params={params} />
          </CardTabPanel>
        ) : null}

        <CardTabPanel value="parameters">
          {live.length ? (
            <div className={styles.params}>
              {live.map((p) => {
                const linked = hasInstrument?.(p.alias);
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={clsx(styles.params__item, linked && styles['params__item--link'])}
                    onClick={() => linked && onParameterClick?.(p.alias)}
                    title={linked ? `${p.name}: show the instrument in 3D` : p.name}
                  >
                    <span className={styles.params__name}>
                      <i style={{ background: statusColor(p.condition) }} />
                      {p.name}
                    </span>
                    <span className={styles.params__value}>
                      {formatParamValue(p)}
                      {p.unit ? <small>{p.unit}</small> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty>No parameters</Empty>
          )}
        </CardTabPanel>

        <CardTabPanel value="activity">
          <section className={styles.section}>
            <SectionTitle title="Recent alarms" />
            {summary?.alarms.length ? (
              <ul className={styles.list}>
                {summary.alarms.slice(0, ROWS).map((a) => (
                  <li key={`${a.name}-${a.start}`}>
                    <i
                      style={{
                        background: statusColor(a.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING'),
                      }}
                    />
                    <div className={styles.list__body}>
                      <strong>
                        {a.name}
                        {a.active ? (
                          <Badge
                            color={a.severity === 'CRITICAL' ? 'critical' : 'warning'}
                            className={styles.badge}
                          >
                            Active
                          </Badge>
                        ) : null}
                      </strong>
                      <span title={a.message}>{a.message}</span>
                    </div>
                    <time title={format(Date.parse(a.start), 'dd MMM yyyy HH:mm')}>
                      {timeAgo(a.start, now)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No alarms</Empty>
            )}
          </section>

          <section className={styles.section}>
            <SectionTitle title="Maintenance" />
            {summary?.maintenances.length ? (
              <ul className={styles.list}>
                {summary.maintenances.slice(0, ROWS).map((m) => (
                  <li key={m.id}>
                    <i
                      style={{
                        background:
                          m.type === 'Corrective'
                            ? statusColor('UNPLANNED DOWN')
                            : statusColor('PLANNED DOWN'),
                      }}
                    />
                    <div className={styles.list__body}>
                      <strong>
                        {m.name}
                        <Badge color="secondary" className={styles.badge}>
                          {m.status}
                        </Badge>
                      </strong>
                      <span>
                        {m.type}
                        {m.issue ? ` · ${m.issue}` : ''}
                      </span>
                    </div>
                    <time title={format(Date.parse(m.updatedAt), 'dd MMM yyyy HH:mm')}>
                      {timeAgo(m.updatedAt, now)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{replay ? 'No maintenance in a simulation' : 'No maintenance orders'}</Empty>
            )}
          </section>
        </CardTabPanel>
      </CardTabs>
    </div>
  );
};
