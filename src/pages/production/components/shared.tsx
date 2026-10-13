import { Badge, COLOR, InfoTooltip, Metric, ThemeContext } from '@digital-twin/components';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import ReactECharts from 'echarts-for-react';
import { ReactNode, useCallback, useContext } from 'react';

import { getAllLocations } from '../../location-overview/api/location-overview.api';
import styles from '../production.module.scss';
import { BadgeColor, FAB_LOCATION_NAME, fmtPct, rating, twinLink } from '../production.utils';

/** Twin links of the page: walking in the fab (its location looked up by name) next to a tool */
export const useTwinLink = () => {
  const { data: rows } = useQuery({
    queryKey: ['getAllLocations'],
    queryFn: getAllLocations,
    staleTime: 5 * 60_000,
  });
  const fab = FAB_LOCATION_NAME.toLowerCase();
  const fabId = rows?.find((r) => r.locationName.trim().toLowerCase() === fab)?.locationId ?? null;
  return useCallback((alias: string) => twinLink(alias, fabId), [fabId]);
};

/** Compact status badge */
export const Pill = ({
  color,
  children,
  title,
}: {
  color: BadgeColor;
  children: ReactNode;
  title?: string;
}) => (
  <Badge color={color} variant="pill" className={styles.pill} title={title}>
    {children}
  </Badge>
);

/** Centred empty / loading state */
export const Empty = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx(styles.empty, className)}>{children}</div>
);

/** Label / value pairs in a compact grid */
export const Facts = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className={styles.facts}>
    {items.map((it) => (
      <div key={it.label}>
        <dt>{it.label}</dt>
        <dd>{it.value}</dd>
      </div>
    ))}
  </dl>
);

export const RATING_COLOR = {
  normal: COLOR.conditionNormalPrimary,
  warning: COLOR.conditionWarningPrimary,
  critical: COLOR.conditionCriticalPrimary,
} as const;

/** RATING_COLOR as theme keys: canvas charts need the resolved colours, not CSS variables */
const RATING_THEME_KEY = {
  normal: 'conditionNormalPrimary',
  warning: 'conditionWarningPrimary',
  critical: 'conditionCriticalPrimary',
} as const;

/** A percentage as a small donut (as the plant overview uptime), filled in its rating colour */
export const PctDonut = ({
  value,
  kind = 'factor',
  size = 76,
}: {
  value: number | null;
  kind?: 'oee' | 'factor';
  size?: number;
}) => {
  const { colors } = useContext(ThemeContext);
  const r = rating(value, kind);
  const filled = Math.max(0, Math.min(100, value ?? 0));
  return (
    <ReactECharts
      style={{ width: '100%', height: size }}
      option={{
        series: [
          {
            type: 'pie',
            radius: ['100%', '62%'],
            center: ['50%', '50%'],
            emphasis: { disabled: true },
            label: {
              show: true,
              position: 'center',
              formatter: value === null ? '-' : `${value.toFixed(1)}%`,
              fontSize: 13,
              fontWeight: 600,
              color: colors.neutralTextTitleHeading,
            },
            data: [
              {
                value: filled,
                itemStyle: { color: r ? colors[RATING_THEME_KEY[r]] : colors.borderLight },
              },
              { value: 100 - filled, itemStyle: { color: colors.backgroundLowest } },
            ],
            showEmptyCircle: true,
          },
        ],
      }}
    />
  );
};

/** A KPI tile (the shared `Metric`) with a bottom accent and an optional sub line */
export const Tile = ({
  title,
  value,
  unit,
  accent,
  sub,
  info,
}: {
  title: string;
  value: string;
  unit?: ReactNode;
  accent: string;
  sub?: ReactNode;
  info?: string;
}) => (
  <div className={styles.kpi__wrap} title={info}>
    <Metric
      title={title}
      titleIcon={info ? <InfoTooltip title={title} content={info} /> : undefined}
      value={value}
      unit={unit}
      borderColor={COLOR.backgroundLow}
      containerClassName={styles.kpi}
      containerStyle={{ borderBottom: `4px solid ${accent}` }}
    />
    {sub ? <div className={styles.kpi__sub}>{sub}</div> : null}
  </div>
);

/** A percentage with a small bar coloured by its rating */
export const FactorBar = ({
  value,
  kind = 'factor',
}: {
  value: number | null;
  kind?: 'oee' | 'factor';
}) => {
  const r = rating(value, kind);
  return (
    <div className={styles.bar}>
      <div className={styles.bar__track}>
        <div
          className={styles.bar__fill}
          style={{
            width: `${Math.max(0, Math.min(100, value ?? 0))}%`,
            background: r ? RATING_COLOR[r] : COLOR.borderDefault,
          }}
        />
      </div>
      <span className={styles.bar__value}>{fmtPct(value)}</span>
    </div>
  );
};
