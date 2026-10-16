import {
  ALARM_ICON,
  CONDITION_COLOR,
  CONDITION_ICON,
  InfoTooltip,
  MAINTENANCE_STATUS_COLOR,
  STATUS_COLOR,
  STATUS_ICON,
  ThemeContext,
} from '@digital-twin/components';
import { Cube, Factory as FactoryIcon, ImagePlaceholder } from '@digital-twin/icons';
import { Card } from '@digital-twin/reusables';
import { formatDateHTMLInput, getURL, t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import ReactECharts from 'echarts-for-react';
import { ReactNode, SyntheticEvent, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { buildTwinTree, collectModels, collectStructures } from '../digital-twin/digital-twin.tree';
import { TWIN_SCENES } from '../digital-twin/digital-twin.scenes';
import { TwinLocation } from '../digital-twin/digital-twin.types';
import {
  getAllLocations,
  getLocationAPQ,
  LocationType,
} from '../location-overview/api/location-overview.api';
import { getPlantOverview, PlantCounts } from './plant-overview.api';
import styles from './plant-overview.module.scss';

/* ------------------------------------------------------------------------------------------------
 * Period (quick filter) and twin links
 * ---------------------------------------------------------------------------------------------- */

const PERIODS = [
  { id: '1', label: 'Today', days: 1 },
  { id: '7', label: '7 Days', days: 7 },
  { id: '30', label: '30 Days', days: 30 },
  { id: '90', label: '90 Days', days: 90 },
] as const;

export const PERIOD_PARAM = 'period';
export const LOCATION_PARAM = 'location';

const periodRange = (days: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start: formatDateHTMLInput(start), end: formatDateHTMLInput(end) };
};

export const twinLocationUrl = (locationId: number) => `/digital-twin?node=loc-${locationId}`;

/** Backend location ids whose subtree has something to show in 3D */
const useTwinLocationIds = (rows: LocationType[] | null | undefined) =>
  useMemo(() => {
    const ids = new Set<number>();
    const walk = (node: TwinLocation) => {
      if (
        node.locationId !== undefined &&
        (collectModels(node).length > 0 || collectStructures(node).length > 0)
      )
        ids.add(node.locationId);
      node.children?.forEach(walk);
    };
    buildTwinTree(rows ?? [], TWIN_SCENES).forEach(walk);
    return ids;
  }, [rows]);

/* ------------------------------------------------------------------------------------------------
 * Card parts (the look of the location overview cards)
 * ---------------------------------------------------------------------------------------------- */

const stopDrill = (ev: SyntheticEvent) => ev.stopPropagation();

/** Keeps clicks and keys of what it wraps (an info tooltip and its popover) from drilling into the card */
const NoDrill = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={clsx(styles['no-drill'], className)} onClick={stopDrill} onKeyDown={stopDrill}>
    {children}
  </span>
);

/** Uptime of the location's equipment over the period, as in the location overview */
const UptimeDonut = ({
  locationId,
  start,
  end,
}: {
  locationId: number;
  start: string;
  end: string;
}) => {
  const {
    colors: {
      backgroundLowest,
      neutralTextTitleHeading,
      neutralTextCaption,
      conditionNormalPrimary,
    },
  } = useContext(ThemeContext);
  const chartRef = useRef<ReactECharts>(null);
  const { data: apq } = useQuery({
    queryKey: ['getLocationAPQ', start, end, locationId],
    queryFn: () => getLocationAPQ(locationId, start, end, new Date().getTimezoneOffset()),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
  const uptime = apq?.totalUptime ?? null;

  useEffect(() => {
    const resize = () => chartRef.current?.getEchartsInstance().resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className={styles.uptime}>
      <NoDrill className={styles['uptime-info']}>
        <InfoTooltip title="Uptime" content={<span>{t('common.uptime_info_1')}</span>} />
      </NoDrill>
      <ReactECharts
        ref={chartRef}
        style={{ flex: '1 1 0', minHeight: 0, width: '100%' }}
        option={{
          animation: true,
          series: [
            {
              type: 'pie',
              radius: ['100%', '62%'],
              center: ['50%', '50%'],
              emphasis: { disabled: true },
              // the value with its label inside the ring
              label: {
                show: true,
                position: 'center',
                formatter: `{v|${uptime === null ? '-' : `${Math.round(uptime)}%`}}
{l|Uptime}`,
                rich: {
                  v: {
                    fontSize: 24,
                    fontWeight: 600,
                    lineHeight: 28,
                    color: neutralTextTitleHeading,
                  },
                  l: { fontSize: 12, lineHeight: 16, color: neutralTextCaption },
                },
              },
              data: [
                { value: uptime ?? 0, itemStyle: { color: conditionNormalPrimary } },
                { value: 100 - (uptime ?? 0), itemStyle: { color: backgroundLowest } },
              ],
              showEmptyCircle: true,
            },
          ],
        }}
      />
    </div>
  );
};

/** A count on a tile marked by its state color: bar on the left, colored icon, big number */
const StatTile = ({
  color,
  icon,
  title,
  value,
  total,
  compact,
  row,
}: {
  color: string;
  icon?: ReactNode;
  title: string;
  value: number;
  /** shows the share of the total next to the number */
  total?: number;
  /** icon and number only (the grid around it names the tile) */
  compact?: boolean;
  /** one line: icon and title, number at the end */
  row?: boolean;
}) => (
  <div
    className={clsx(
      styles.tile,
      compact && styles['tile--compact'],
      row && styles['tile--row'],
      value === 0 && styles['tile--zero']
    )}
    style={{ ['--tile-color' as string]: color }}
    title={`${title}: ${value}`}
  >
    {compact ? (
      icon ? (
        <span className={styles['tile-icon']}>{icon}</span>
      ) : null
    ) : row ? (
      <div className={styles['tile-title']}>
        {icon ? <span className={styles['tile-icon']}>{icon}</span> : null}
        <span>{title}</span>
      </div>
    ) : (
      // the icon sits by the number so a narrow tile's title has the whole line
      <div className={styles['tile-title']}>
        <span>{title}</span>
      </div>
    )}
    <div className={styles['tile-value']}>
      {!compact && !row && icon ? <span className={styles['tile-icon']}>{icon}</span> : null}
      <b>{value.toLocaleString()}</b>
      {total ? <span>{`${((100 * value) / total).toFixed(1)}%`}</span> : null}
    </div>
  </div>
);

const SectionHeader = ({
  title,
  info,
  extra,
}: {
  title: string;
  info: string;
  extra?: ReactNode;
}) => (
  <div className={styles['section-header']}>
    <span>{title}</span>
    <NoDrill>
      <InfoTooltip title={title} content={<span>{info}</span>} />
    </NoDrill>
    {extra ? <span className={styles['section-extra']}>{extra}</span> : null}
  </div>
);

const LocationBody = ({
  counts,
  locationId,
  imagePath,
  range,
  periodLabel,
}: {
  counts: PlantCounts;
  locationId: number | null;
  imagePath?: string;
  range: { start: string; end: string };
  periodLabel: string;
}) => {
  const {
    colors: { backgroundLowest },
  } = useContext(ThemeContext);
  const { equipment: e, alarms: a, maintenance: m } = counts;
  const statuses: [keyof typeof STATUS_COLOR, string, number][] = [
    ['RUNNING', t('common.running'), e.running],
    ['IDLE', t('common.idle'), e.idle],
    ['PLANNED DOWN', t('common.planned_down'), e.plannedDown],
    ['UNPLANNED DOWN', t('common.unplanned_down'), e.unplannedDown],
    ['OFFLINE', t('common.off_offline'), e.offline],
  ];
  const conditions: [keyof typeof CONDITION_COLOR, string, number][] = [
    ['NORMAL', t('common.normal'), e.normal],
    ['WARNING', t('common.warning'), e.warning],
    ['CRITICAL', t('common.critical'), e.critical],
  ];
  const orders: [string, keyof typeof MAINTENANCE_STATUS_COLOR, number][] = [
    ['Requested', 'Requested', m.requested],
    ['Open', 'Open', m.open],
    ['In Progress', 'In Progress', m.inProgress],
    ['Paused', 'Paused', m.paused],
    ['Done', 'Done', m.done],
    ['Closed', 'Closed', m.closed],
    ['Rejected', 'Rejected', m.rejected],
  ];

  return (
    <div className={styles.body}>
      <div className={styles['top-section']}>
        {locationId !== null ? (
          <>
            <div className={styles.image}>
              <img
                src={`${getURL()}${imagePath ?? ''}`}
                alt={t('common.location')}
                onError={(ev) => {
                  ev.currentTarget.onerror = null;
                  ev.currentTarget.src = ImagePlaceholder(backgroundLowest);
                }}
              />
            </div>
            <UptimeDonut locationId={locationId} {...range} />
          </>
        ) : null}
        <div className={styles.condition}>
          <SectionHeader
            title={t('common.current_condition')}
            info={t('common.current_condition_info')}
          />
          <div className={styles['condition-list']}>
            {conditions.map(([type, title, value]) => (
              <StatTile
                key={type}
                color={CONDITION_COLOR[type]}
                icon={CONDITION_ICON[type]}
                title={title}
                value={value}
                row
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles['state-section']}>
        <div className={styles.status}>
          <SectionHeader
            title={t('common.current_status')}
            info={t('common.current_status_info')}
          />
          <div className={styles['status-grid']}>
            {statuses.map(([type, title, value]) => (
              <StatTile
                key={type}
                color={STATUS_COLOR[type]}
                icon={STATUS_ICON[type]}
                title={title}
                value={value}
                total={e.total}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles['activity-section']}>
        <div className={styles.alarms}>
          <SectionHeader
            title="Alarms"
            info={`Alarm and abnormal events raised in the ${periodLabel}, by severity. Active: still open now.`}
            extra={
              <>
                Active: <b>{a.activeAlarm}</b> alarm · <b>{a.activeAbnormal}</b> abnormal
              </>
            }
          />
          <div className={styles['alarm-grid']}>
            <span />
            <span className={styles['grid-head']}>{t('common.critical')}</span>
            <span className={styles['grid-head']}>{t('common.warning')}</span>
            <span className={styles['grid-row']}>Alarm</span>
            <StatTile
              color={CONDITION_COLOR.CRITICAL}
              icon={ALARM_ICON.CRITICAL}
              title="Critical"
              compact
              value={a.alarmCritical}
            />
            <StatTile
              color={CONDITION_COLOR.WARNING}
              icon={ALARM_ICON.WARNING}
              title="Warning"
              compact
              value={a.alarmWarning}
            />
            <span className={styles['grid-row']}>Abnormal</span>
            <StatTile
              color={CONDITION_COLOR.CRITICAL}
              icon={ALARM_ICON.CRITICAL}
              title="Critical"
              compact
              value={a.abnormalCritical}
            />
            <StatTile
              color={CONDITION_COLOR.WARNING}
              icon={ALARM_ICON.WARNING}
              title="Warning"
              compact
              value={a.abnormalWarning}
            />
          </div>
        </div>
        <div className={styles.orders}>
          <SectionHeader
            title="Maintenance Orders"
            info={`Maintenance orders planned in the ${periodLabel}, by their current status.`}
            extra={
              <>
                Total: <b>{m.total}</b>
              </>
            }
          />
          <div className={styles['order-grid']}>
            {orders.map(([title, key, value]) => (
              <StatTile
                key={key}
                color={MAINTENANCE_STATUS_COLOR[key]}
                title={title}
                value={value}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Header buttons of a card: equipment count and the jump into the digital twin */
const CardActions = ({
  total,
  locationId,
  inTwin,
}: {
  total: number;
  locationId: number | null;
  inTwin: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <div className={styles['card-actions']} onClick={(ev) => ev.stopPropagation()}>
      <span
        className={styles['equipment-count']}
        title={`${t('common.equipment')}: ${total.toLocaleString()}`}
      >
        <FactoryIcon />
        <b>{total.toLocaleString()}</b>
      </span>
      {locationId !== null && inTwin ? (
        <button
          type="button"
          className={styles['twin-button']}
          title="Open in Digital Twin"
          aria-label="Open in Digital Twin"
          onClick={() => navigate(twinLocationUrl(locationId))}
        >
          <Cube />
          <span>Twin</span>
        </button>
      ) : null}
    </div>
  );
};

/** The headline figures of what the page shows, beside the period filter */
const Summary = ({ counts }: { counts: PlantCounts }) => {
  const { equipment: e, alarms: a, maintenance: m } = counts;
  const items: [string, string, number][] = [
    [t('common.equipment'), 'var(--afdd-brand-surface-default-primary)', e.total],
    [t('common.running'), STATUS_COLOR.RUNNING, e.running],
    [t('common.critical'), CONDITION_COLOR.CRITICAL, e.critical],
    ['Active alarms', CONDITION_COLOR.CRITICAL, a.activeAlarm],
    ['Active abnormal', CONDITION_COLOR.WARNING, a.activeAbnormal],
    ['Open orders', MAINTENANCE_STATUS_COLOR.Open, m.requested + m.open + m.inProgress + m.paused],
  ];
  return (
    <dl className={styles.summary}>
      {items.map(([label, color, value]) => (
        <div
          key={label}
          className={styles['summary-item']}
          style={{ ['--tile-color' as string]: color }}
        >
          <dt>{label}</dt>
          <dd>{value.toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  );
};

/* ------------------------------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------------------------------- */

export const PlantOverview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationId = searchParams.get(LOCATION_PARAM)
    ? Number(searchParams.get(LOCATION_PARAM))
    : null;
  const period = PERIODS.find((p) => p.id === searchParams.get(PERIOD_PARAM)) ?? PERIODS[1];
  const periodLabel = period.days === 1 ? 'today' : `last ${period.days} days`;
  const range = useMemo(() => periodRange(period.days), [period.days]);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: rows } = useQuery({
    queryKey: ['getAllLocations'],
    queryFn: getAllLocations,
    staleTime: 5 * 60_000,
  });
  const twinIds = useTwinLocationIds(rows);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['getPlantOverview', locationId, range.start, range.end],
    queryFn: () => getPlantOverview({ locationId, ...range, search: '' }),
    refetchInterval: 30_000,
  });

  // a drill-down starts at the top of the new location
  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0 });
  }, [locationId]);

  const setParam = (key: string, value: string | null) =>
    setSearchParams((params) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
      return params;
    });

  const children = data?.data ?? [];

  return (
    <div className={styles['plant-overview']}>
      <div className={styles.filters} data-nav-section="summary">
        {data ? <Summary counts={data.summary} /> : <span />}
        <div className={styles.periods} role="radiogroup" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={p.id === period.id}
              className={clsx(styles.period, p.id === period.id && styles['period--active'])}
              onClick={() => setParam(PERIOD_PARAM, p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid} ref={gridRef} data-nav-section="locations">
        {isLoading
          ? [0, 1].map((i) => <div key={i} className={styles.skeleton} aria-hidden />)
          : null}

        {children.map((loc) => {
          const canDrill = loc.childCount > 0;
          const drill = () => canDrill && setParam(LOCATION_PARAM, String(loc.locationId));
          return (
            <Card
              key={loc.locationId}
              className={clsx(styles.card, canDrill && styles['card--drill'])}
              title={loc.locationName}
              titleProps={{ className: styles['card-title'] }}
              headerChildren={
                <CardActions
                  total={loc.equipment.total}
                  locationId={loc.locationId}
                  inTwin={twinIds.has(loc.locationId)}
                />
              }
              contentWrapperProps={{ className: styles['card-content'] }}
              onClick={drill}
              onKeyDown={(ev) => {
                if (canDrill && (ev.key === 'Enter' || ev.key === ' ')) {
                  ev.preventDefault();
                  drill();
                }
              }}
              tabIndex={canDrill ? 0 : undefined}
              role={canDrill ? 'link' : undefined}
              aria-label={canDrill ? `Open ${loc.locationName}` : undefined}
            >
              <LocationBody
                counts={loc}
                locationId={loc.locationId}
                imagePath={loc.locationImagePath}
                range={range}
                periodLabel={periodLabel}
              />
            </Card>
          );
        })}

        {data && !children.length && locationId === null ? (
          <div className={styles.empty}>No locations</div>
        ) : null}
        {isFetching && !isLoading ? <span className={styles.refreshing} aria-hidden /> : null}
      </div>
    </div>
  );
};
